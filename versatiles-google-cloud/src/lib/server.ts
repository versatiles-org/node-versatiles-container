/* eslint-disable @typescript-eslint/naming-convention */

import type { EncodingType } from './recompress.js';
import type { OutgoingHttpHeaders } from 'node:http';
import type { Header as VersatilesHeader, Reader } from '@versatiles/container';
import express from 'express';
import { Storage } from '@google-cloud/storage';
import { recompress } from './recompress.js';
import { Container as VersatilesContainer } from '@versatiles/container';
import { guessStyle } from '@versatiles/style';
import type { MaplibreStyle } from '@versatiles/style/dist/lib/types.js';



export interface ServerOptions {
	baseUrl: string;
	bucketName: string;
	bucketPrefix: string;
	fastRecompression: boolean;
	port: number;
	verbose: boolean;
}



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

	app.get(/.*/, (serverRequest, serverResponse): void => {
		void (async (): Promise<void> => {
			requestNo++;
			if (verbose) console.log('new request: #' + requestNo);
			try {
				const filename = decodeURI(String(serverRequest.path)).trim().replace(/^\/+/, '');

				if (verbose) console.log(`  #${requestNo} public filename: ${filename}`);

				if (filename === '') {
					sendError(404, `file "${filename}" not found`); return;
				}

				const headers: OutgoingHttpHeaders = {
					'cache-control': 'max-age=86400', // default: 1 day
				};

				if (verbose) console.log(`  #${requestNo} request filename: ${bucketPrefix + filename}`);
				const file = bucket.file(bucketPrefix + filename);

				const [exists] = await file.exists();
				if (!exists) {
					sendError(404, `file "${filename}" not found`);
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

					if (metadata.contentType != null) headers['content-type'] = metadata.contentType;
					if (metadata.size != null) headers['content-length'] = String(metadata.size);
					if (metadata.etag != null) headers.etag = metadata.etag;
					if (metadata.cacheControl != null) {
						const match = /^max-age=([0-9]+)$/.exec(metadata.cacheControl);
						if (match) {
							let maxAge = parseInt(match[1], 10) || 86400;
							if (maxAge < 300) maxAge = 300; // minimum: 5 minutes
							if (maxAge > 8640000) maxAge = 8640000; // maximum: 100 days
							headers['cache-control'] = 'max-age=' + maxAge;
						}
					}

					const fileStream = file.createReadStream();

					await recompress(serverRequest.headers, headers, fileStream, serverResponse, fastRecompression);
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
							console.log(`  #${requestNo} metadata: ${JSON.stringify(metadata)}`);
						}

						containerCache.set(filename, { container, header, metadata });
					} else {
						({ container, header, metadata } = cache);
					}

					const query = String(serverRequest.query);
					if (verbose) console.log(`  #${requestNo} query: ${JSON.stringify(query)}`);

					switch (query) {
						case 'meta.json':
							if (verbose) console.log(`  #${requestNo} respond with meta.json`);
							respond(JSON.stringify(metadata), 'application/json', 'raw');
							return;
						case 'style.json':
							if (verbose) console.log(`  #${requestNo} respond with style.json`);

							let style: MaplibreStyle;
							const tiles = [`${baseUrl}${filename}?tile/{z}/{x}/{y}`];
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
										sendError(500, 'metadata must be defined');
										return;
									}
									if (typeof metadata !== 'object') {
										sendError(500, 'metadata must be an object');
										return;
									}
									if (!('vector_layers' in metadata)) {
										sendError(500, 'metadata must contain property vector_layers');
										return;
									}
									const { vector_layers } = metadata;
									if (!Array.isArray(vector_layers)) {
										sendError(500, 'metadata.vector_layers must be an array');
										return;
									}
									style = guessStyle({ tiles, format, vector_layers });
									break;
								case 'bin':
								case 'geojson':
								case 'json':
								case 'svg':
								case 'topojson':
									sendError(500, `tile format "${format}" is not supported`);
									return;
							}
							respond(JSON.stringify(style), 'application/json', 'raw');
							return;
					}

					const match = /tiles\/(?<z>\d+)\/(?<x>\d+)\/(?<y>\d+)/.exec(query);
					if (match == null) {
						sendError(400, 'get parameter must be "meta.json", "style.json", or "tile/{z}/{x}/{y}"');
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
						sendError(404, `map tile {x:${x}, y:${y}, z:${z}} not found`);
					} else {
						if (verbose) console.log(`  #${requestNo} return tile x:${x}, y:${y}, z:${z}`);
						respond(tile, header.tileMime, header.tileCompression);
					}

					return;

					function respond(body: Buffer | string, contentType: string, encoding: EncodingType): void {
						headers['content-type'] = contentType;
						headers['content-encoding'] = encoding;
						if (typeof body === 'string') body = Buffer.from(body);
						void recompress(serverRequest.headers, headers, body, serverResponse, fastRecompression);
					}
				}

				function sendError(code: number, message: string): void {
					if (verbose) console.log(`  #${requestNo} error ${code}: ${message}`);
					serverResponse
						.status(code)
						.type('text')
						.send(message);
				}
			} catch (error) {
				console.error({ error });

				serverResponse
					.status(500)
					.type('text')
					.send('Internal Server Error for request: ' + JSON.stringify(serverRequest.path));
			}
		})();
	});

	app.listen(port, () => {
		console.log(`listening on port ${port}`);
		console.log(`you can find me at ${baseUrl}`);
	});
}
