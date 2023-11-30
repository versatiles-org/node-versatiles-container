import type { Header as VersatilesHeader, Reader } from '@versatiles/container';
import type { MaplibreStyle } from '@versatiles/style/dist/lib/types.js';
import express from 'express';
import { Storage } from '@google-cloud/storage';
import { Container as VersatilesContainer } from '@versatiles/container';
import { guessStyle } from '@versatiles/style';
import { readFile } from 'node:fs/promises';
import { Responder } from './responder.js';
import { recompress } from './recompress.js';



export interface ServerOptions {
	baseUrl: string;
	bucketName: string;
	bucketPrefix: string;
	fastRecompression: boolean;
	port: number;
	verbose: boolean;
}

const filenamePreview = new URL('../../static/preview.html', import.meta.url).pathname;

export function startServer(opt: ServerOptions): void {
	const { bucketName, port, fastRecompression, verbose } = opt;
	let bucketPrefix = opt.bucketPrefix.replace(/^\/+|\/+$/g, '');
	if (bucketPrefix !== '') bucketPrefix += '/';

	const baseUrl = new URL(opt.baseUrl).href;

	const storage = new Storage();
	const bucket = storage.bucket(bucketName);
	const containerCache = new Map<string, {
		container: VersatilesContainer;
		header: VersatilesHeader;
		metadata: unknown;
	}>();

	let requestNo = 0;

	const app = express();
	app.set('query parser', (a: string): string => a);
	app.disable('x-powered-by');

	app.get('/healthcheck', (serverRequest, serverResponse) => {
		serverResponse
			.status(200)
			.type('text')
			.send('ok');
	});

	app.get(/.*/, (request, response): void => {
		void (async (): Promise<void> => {
			requestNo++;
			const responder = Responder({
				fastRecompression,
				requestHeaders: request.headers,
				requestNo,
				response,
				verbose,
			});

			if (verbose) console.log('new request: #' + requestNo);
			try {
				const filename = decodeURI(String(request.path)).trim().replace(/^\/+/, '');

				if (verbose) console.log(`  #${requestNo} public filename: ${filename}`);

				if (filename === '') {
					responder.error(404, `file "${filename}" not found`); return;
				}

				if (verbose) console.log(`  #${requestNo} request filename: ${bucketPrefix + filename}`);
				const file = bucket.file(bucketPrefix + filename);

				const [exists] = await file.exists();
				if (!exists) {
					responder.error(404, `file "${filename}" not found`);
					return;
				}

				if (filename.endsWith('.versatiles')) {
					void serveVersatiles();
				} else {
					void serveFile();
				}

				async function serveFile(): Promise<void> {
					if (verbose) console.log(`  #${requestNo} serve file`);

					const [metadata] = await file.getMetadata();
					if (verbose) console.log(`  #${requestNo} metadata: ${JSON.stringify(metadata)}`);

					if (metadata.contentType != null) responder.set('content-type', metadata.contentType);
					if (metadata.size != null) responder.set('content-length', String(metadata.size));
					if (metadata.etag != null) responder.set('etag', metadata.etag);
					if (metadata.cacheControl != null) {
						const match = /^max-age=([0-9]+)$/.exec(metadata.cacheControl);
						if (match) {
							let maxAge = parseInt(match[1], 10) || 86400;
							if (maxAge < 300) maxAge = 300; // minimum: 5 minutes
							if (maxAge > 8640000) maxAge = 8640000; // maximum: 100 days
							responder.set('cache-control', 'max-age=' + maxAge);
						}
					}

					const fileStream = file.createReadStream();

					void recompress(responder, fileStream);
				}

				async function serveVersatiles(): Promise<void> {
					if (verbose) console.log(`  #${requestNo} serve versatiles`);

					let container: VersatilesContainer;
					let header: VersatilesHeader;
					let metadata: unknown = {};

					const cache = containerCache.get(filename);
					if (cache == null) {
						const reader: Reader = async (position: number, length: number): Promise<Buffer> => {
							return new Promise<Buffer>((resolve, reject) => {
								const buffers = Array<Buffer>();
								file.createReadStream({ start: position, end: position + length })
									.on('data', (chunk: Buffer) => buffers.push(chunk))
									.on('end', () => {
										resolve(Buffer.concat(buffers));
									})
									.on('error', err => {
										reject(`error accessing bucket stream - ${String(err)}`);
									});
							});
						};

						container = new VersatilesContainer(reader);
						header = await container.getHeader();

						try {
							metadata = JSON.parse(await container.getMetadata() ?? '');
						} catch (e) { }

						if (verbose) {
							console.log(`  #${requestNo} header: ${JSON.stringify(header)}`);
							console.log(`  #${requestNo} metadata: ${JSON.stringify(metadata).slice(0, 80)}`);
						}

						containerCache.set(filename, { container, header, metadata });
					} else {
						({ container, header, metadata } = cache);
					}

					const query = String(request.query);
					if (verbose) console.log(`  #${requestNo} query: ${JSON.stringify(query)}`);

					switch (query) {
						case 'preview':
							if (verbose) console.log(`  #${requestNo} respond preview`);
							responder.respond(await readFile(filenamePreview), 'text/html', 'raw');
							return;
						case 'meta.json':
							if (verbose) console.log(`  #${requestNo} respond with meta.json`);
							responder.respond(JSON.stringify(metadata), 'application/json', 'raw');
							return;
						case 'style.json':
							if (verbose) console.log(`  #${requestNo} respond with style.json`);

							let style: MaplibreStyle;
							const tiles = [`${baseUrl}${filename}?tiles/{z}/{x}/{y}`];
							const format = header.tileFormat;
							switch (format) {
								case 'jpeg': style = guessStyle({ tiles, format: 'jpg' }); break;
								case 'webp':
								case 'png':
								case 'avif':
									style = guessStyle({ tiles, format });
									break;
								case 'pbf':
									if (metadata == null) {
										responder.error(500, 'metadata must be defined');
										return;
									}
									if (typeof metadata !== 'object') {
										responder.error(500, 'metadata must be an object');
										return;
									}
									if (!('vector_layers' in metadata)) {
										responder.error(500, 'metadata must contain property vector_layers');
										return;
									}
									const vectorLayers = metadata.vector_layers;
									if (!Array.isArray(vectorLayers)) {
										responder.error(500, 'metadata.vector_layers must be an array');
										return;
									}
									style = guessStyle({ tiles, format, vectorLayers });
									break;
								case 'bin':
								case 'geojson':
								case 'json':
								case 'svg':
								case 'topojson':
									responder.error(500, `tile format "${format}" is not supported`);
									return;
							}
							responder.respond(JSON.stringify(style), 'application/json', 'raw');
							return;
					}

					const match = /tiles\/(?<z>\d+)\/(?<x>\d+)\/(?<y>\d+)/.exec(query);
					if (match == null) {
						responder.error(400, 'get parameter must be "meta.json", "style.json", or "tile/{z}/{x}/{y}"');
						return;
					}

					const { z, x, y } = match.groups as { x: string; y: string; z: string };
					if (verbose) console.log(`  #${requestNo} fetch tile x:${x}, y:${y}, z:${z}`);

					const tile = await container.getTile(
						parseInt(z, 10),
						parseInt(x, 10),
						parseInt(y, 10),
					);
					if (tile == null) {
						responder.error(404, `map tile {x:${x}, y:${y}, z:${z}} not found`);
					} else {
						if (verbose) console.log(`  #${requestNo} return tile ${z}/${x}/${y}`);
						responder.respond(tile, header.tileMime, header.tileCompression);
					}

					return;
				}
			} catch (error) {
				console.error({ error });

				responder.error(500, 'Internal Server Error for request: ' + JSON.stringify(request.path));
			}
		})();
	});

	app.listen(port, () => {
		console.log(`listening on port ${port}`);
		console.log(`you can find me at ${baseUrl}`);
	});
}
