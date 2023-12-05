
import type { EncodingTools } from './encoding.js';
import type { ResponderInterface } from './responder.js';
import { ENCODINGS, acceptEncoding, findBestEncoding, parseContentEncoding } from './encoding.js';
import { Readable } from 'node:stream';
import through from 'through2';

const maxBufferSize = 10 * 1024 * 1024;

export async function recompress(
	responder: ResponderInterface,
	body: Buffer | Readable,
	logPrefix?: string,
): Promise<void> {

	// detect encoding:
	const encodingIn: EncodingTools | null = parseContentEncoding(responder.responseHeaders);
	let encodingOut: EncodingTools | null = encodingIn;

	const mediaType = String(responder.responseHeaders['content-type']).replace(/\/.*/, '').toLowerCase();

	// do not recompress images, videos, ...
	switch (mediaType) {
		case 'audio':
		case 'image':
		case 'video':
			if (!acceptEncoding(responder.requestHeaders, encodingOut)) {
				// decompress it
				encodingOut = ENCODINGS.raw;
			}
			break;
		default:
			if (responder.fastRecompression) {
				if (!acceptEncoding(responder.requestHeaders, encodingOut)) {
					// decompress it
					encodingOut = ENCODINGS.raw;
				}
			} else {
				// find best accepted encoding
				encodingOut = findBestEncoding(responder.requestHeaders);
			}
	}

	responder.set('vary', 'accept-encoding');

	encodingOut.setEncodingHeader(responder.responseHeaders);

	let stream: Readable = Readable.from(body);

	if (logPrefix != null) {
		console.log(logPrefix, 'stream:', stream);
	}

	if (encodingIn !== encodingOut) {
		if (logPrefix != null) {
			console.log(logPrefix, 'recompress:', encodingIn.name, encodingOut.name);
		}
		stream = stream.pipe(encodingIn.decompressStream()).pipe(encodingOut.compressStream(responder.fastRecompression));
		responder.del('content-length');
		
		if (logPrefix != null) {
			console.log(logPrefix, 'new stream:', stream);
		}
	}

	await bufferStream(stream, handleBuffer, handleStream, (logPrefix != null) ? logPrefix + ' bufferStream' : undefined);

	return;

	function handleBuffer(buffer: Buffer): void {
		responder.del('transfer-encoding');

		responder.responseHeaders['content-length'] ??= '' + buffer.length;

		if (logPrefix != null) {
			console.log(logPrefix, 'response header for buffer:', responder.responseHeaders);
			console.log(logPrefix, 'response buffer length:', buffer.length);
		}

		responder.response
			.status(200)
			.set(responder.responseHeaders)
			.end(buffer);
	}

	function handleStream(streamResult: Readable): void {
		responder.set('transfer-encoding', 'chunked');
		responder.del('content-length');

		if (logPrefix != null) {
			console.log(logPrefix, 'response header for stream:', responder.responseHeaders);
			console.log(logPrefix, 'response stream:', streamResult);
		}

		responder.response
			.status(200)
			.set(responder.responseHeaders);

		streamResult.pipe(responder.response);
	}
}

// eslint-disable-next-line @typescript-eslint/max-params
export async function bufferStream(
	stream: Readable,
	handleBuffer: (buffer: Buffer) => void,
	handleStream: (stream: Readable) => void,
	logPrefix?: string,
): Promise<void> {
	const buffers: Buffer[] = [];
	let size = 0;
	let bufferMode = true;

	return new Promise(resolve => {

		if (logPrefix != null) {
			console.log(logPrefix, 'stream:', stream);
		}

		stream.pipe(through(
			function (chunk: Buffer, enc, cb) {
				if (logPrefix != null) {
					console.log(logPrefix, 'new chunk:', chunk.length);
				}

				if (bufferMode) {
					buffers.push(chunk);
					size += chunk.length;
					if (size >= maxBufferSize) {
						if (logPrefix != null) {
							console.log(logPrefix, 'stop bufferMode:', buffers.length);
						}

						bufferMode = false;
						handleStream(stream);

						// eslint-disable-next-line @typescript-eslint/no-invalid-this
						for (const buffer of buffers) this.push(buffer);
					}
					cb();
				} else {
					cb(null, chunk);
				}
			},
			(cb): void => {
				if (bufferMode) {
					if (logPrefix != null) {
						console.log(logPrefix, 'flush to handleBuffer:', buffers.length);
					}

					handleBuffer(Buffer.concat(buffers));
				}
				cb();
				return;
			},
		)).on('finish', () => {
			resolve();
		});
	});
}
