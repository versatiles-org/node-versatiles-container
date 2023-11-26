/* eslint-disable @typescript-eslint/naming-convention */

import express from 'express';
import { Storage } from '@google-cloud/storage';
import type { EncodingType } from './recompress.js';
import { recompress } from './recompress.js';
import type { OutgoingHttpHeaders } from 'node:http';
import type { Header as VersatilesHeader, Reader } from '@versatiles/container';
import { Container as VersatilesContainer } from '@versatiles/container';



export interface ServerOptions {
	bucketName: string;
	bucketPath?: string;
	port: number;
	fastRecompression: boolean;
}



export function startServer(opt: ServerOptions): void {
	const { bucketName, bucketPath, port, fastRecompression } = opt;
	const prefix = (bucketPath == null) ? '' : bucketPath.replace(/^\/+|\/+$/g, '') + '/';

	const storage = new Storage();
	const bucket = storage.bucket(bucketName);
	const containerCache = new Map<string, { container: VersatilesContainer; header: VersatilesHeader }>();

	const app = express();
	app.set('query parser', false);
	app.disable('x-powered-by');

	app.get('/healthcheck', (serverRequest, serverResponse) => {
		serverResponse
			.status(200)
			.type('text')
			.send('ok');
	});

	app.get(/.*/, (serverRequest, serverResponse): void => {
		void (async (): Promise<void> => {
			try {
				const filename = decodeURI(String(serverRequest.path).trim().replace(/^\/+/, ''));

				if (filename === '') {
					sendError(404, `file "${filename}" not found`); return;
				}

				const headers: OutgoingHttpHeaders = {
					'cache-control': 'max-age=86400', // default: 1 day
				};

				const file = bucket.file(prefix + filename);

				const [exists] = await file.exists();
				if (!exists) {
					sendError(404, `file "${filename}" not found`); return;
				}

				if (filename.endsWith('.versatiles')) {
					void serveFile();
				} else {
					void serveVersatiles();
				}

				async function serveFile(): Promise<void> {
					const [metadata] = await file.getMetadata();

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
					let container: VersatilesContainer, header: VersatilesHeader;
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
						containerCache.set(filename, { container, header });
					} else {
						({ container, header } = cache);
					}

					const query = String(serverRequest.query);
					switch (query) {
						case 'meta.json':
							respond(await container.getMetadata() ?? '', 'application/json', 'raw');
							break;
						case 'style.json':
							respond(await guessStyle(container), 'application/json', 'raw');
							break;
					}
					const match = /tiles\/(?<z>\d+)\/(?<x>\d+)\/(?<y>\d+)/.exec(query);
					if (match == null) {
						sendError(400, 'get parameter must be "meta.json", "style.json", or "tile/{z}/{x}/{y}"');
						return;
					}

					const { z, x, y } = match.groups as { x: string; y: string; z: string };
					const tile = await container.getTile(
						parseInt(z, 10),
						parseInt(x, 10),
						parseInt(y, 10),
					);
					if (tile == null) {
						sendError(404, `map tile "${query}" not found`);
					} else {
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
	});
}
