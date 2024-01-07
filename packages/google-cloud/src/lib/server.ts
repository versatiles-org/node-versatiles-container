import type { Server } from 'http';
import type { Bucket } from '@google-cloud/storage';
import express from 'express';
import { Storage } from '@google-cloud/storage';
import { Responder } from './responder.js';
import { recompress } from './recompress.js';
import { serveVersatiles } from './versatiles.js';
import { createLocalDirectoryBucket } from './localDirectoryBucket.js';



export interface ServerOptions {
	baseUrl: string;
	bucket: Bucket | string;
	bucketPrefix: string;
	fastRecompression: boolean;
	localDirectory?: string;
	port: number;
	verbose: boolean;
}

export async function startServer(opt: ServerOptions): Promise<Server | null> {
	const { port, fastRecompression, verbose } = opt;
	let bucketPrefix = opt.bucketPrefix.replace(/^\/+|\/+$/g, '');
	if (bucketPrefix !== '') bucketPrefix += '/';

	const baseUrl = new URL(opt.baseUrl).href;
	const storage = new Storage();

	let bucket: Bucket;
	if (typeof opt.localDirectory == 'string') {
		bucket = createLocalDirectoryBucket(opt.localDirectory);
	} else if (typeof opt.bucket == 'string') {
		bucket = storage.bucket(opt.bucket);
	} else {
		({ bucket } = opt);
	}

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
					void serveVersatiles(file, baseUrl + filename, String(request.query), responder);
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

					void recompress(responder, file.createReadStream(), verbose ? `  #${requestNo}` : undefined);
				}

			} catch (error) {
				console.error({ error });

				responder.error(500, 'Internal Server Error for request: ' + JSON.stringify(request.path));
			}
		})();
	});

	return new Promise(res => {
		const server = app.listen(port, () => {
			console.log(`listening on port ${port}`);
			console.log(`you can find me at ${baseUrl}`);
			res(server);
		});
	});
}
