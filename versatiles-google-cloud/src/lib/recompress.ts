
import type { EncodingTools } from './encoding.js';
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';
import type { Response } from 'express';
import { ENCODINGS, coversEncoding, findBestEncoding, parseEncoding } from './encoding.js';
import { Readable } from 'node:stream';
import through from 'through2';

const maxBufferSize = 10 * 1024 * 1024;

// eslint-disable-next-line @typescript-eslint/max-params
export function recompress(
	headersRequest: IncomingHttpHeaders,
	headersResponse: OutgoingHttpHeaders,
	body: Buffer | Readable,
	response: Response,
	fastCompression = false,
): void {

	// detect encoding:
	const encodingIn: EncodingTools | null = parseEncoding(headersResponse['content-encoding']);
	let encodingOut: EncodingTools | null = encodingIn;

	const mediaType = String(headersResponse['content-type']).replace(/\/.*/, '').toLowerCase();

	// do not recompress images, videos, ...
	switch (mediaType) {
		case 'audio':
		case 'image':
		case 'video':
			break;
		default:
			const acceptEncoding = String(headersRequest['accept-encoding'] ?? '');
			if (fastCompression) {
				if (coversEncoding(acceptEncoding, encodingIn)) {
					// go for it!
				} else {
					// decompress it
					encodingOut = ENCODINGS.raw;
				}
			} else {
				// find best accepted encoding
				encodingOut = findBestEncoding(acceptEncoding);
			}
	}

	headersResponse.vary = 'accept-encoding';

	encodingOut.setEncodingHeader(headersResponse);

	let stream: Readable = Readable.from(body);

	if (encodingIn !== encodingOut) {
		stream = stream.pipe(encodingIn.decompressStream()).pipe(encodingOut.compressStream(fastCompression));
		delete headersResponse['content-length'];
	}

	bufferStream(stream, handleBuffer, handleStream);

	return;

	function handleBuffer(buffer: Buffer): void {
		delete headersResponse['transfer-encoding'];

		headersResponse['content-length'] ??= buffer.length;

		response
			.status(200)
			.set(headersResponse)
			.end(buffer);
	}

	function handleStream(streamResult: Readable): void {
		headersResponse['transfer-encoding'] = 'chunked';
		delete headersResponse['content-length'];

		response
			.status(200)
			.set(headersResponse);

		streamResult.pipe(response);
	}
}

export function bufferStream(
	stream: Readable,
	handleBuffer: (buffer: Buffer) => void,
	handleStream: (stream: Readable) => void,
): void {
	const buffers: Buffer[] = [];
	let size = 0;
	let bufferMode = true;

	stream.pipe(through(
		function (chunk: Buffer, enc, cb) {
			if (bufferMode) {
				buffers.push(chunk);
				size += chunk.length;
				if (size >= maxBufferSize) {
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
			if (bufferMode) handleBuffer(Buffer.concat(buffers));
			cb();
			return;
		},
	));
}
