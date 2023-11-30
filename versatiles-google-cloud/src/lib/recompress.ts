
import type { BrotliOptions, ZlibOptions } from 'node:zlib';
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';
import type { Response } from 'express';
import type { Transform } from 'node:stream';
import { PassThrough, Readable } from 'node:stream';
import through from 'through2';
import zlib from 'node:zlib';

export type EncodingType = 'br' | 'deflate' | 'gzip' | 'raw';
export interface EncodingTools {
	name: EncodingType;
	compressStream: (fast: boolean, size?: number) => Transform;
	decompressStream: () => Transform;
	compressBuffer: (buffer: Buffer, fast: boolean) => Buffer | Promise<Buffer>;
	decompressBuffer: (buffer: Buffer) => Buffer | Promise<Buffer>;
	setEncoding: (headers: OutgoingHttpHeaders) => void;
}

const MB = 1024 * 1024;
export const ENCODINGS: Record<EncodingType, EncodingTools> = {
	'br': ((): EncodingTools => {
		function getOptions(fast: boolean, size?: number): BrotliOptions {
			const params = { [zlib.constants.BROTLI_PARAM_QUALITY]: fast ? 3 : 11 };
			if (size != null) params[zlib.constants.BROTLI_PARAM_SIZE_HINT] = size;
			return { params };
		}
		return {
			name: 'br',
			compressStream: (fast: boolean, size?: number) => zlib.createBrotliCompress(getOptions(fast, size)),
			decompressStream: () => zlib.createBrotliDecompress(),
			compressBuffer: async (buffer: Buffer, fast: boolean) => new Promise(res => {
				zlib.brotliCompress(buffer, getOptions(fast, buffer.length), (e, b) => {
					res(b);
				});
			}),
			decompressBuffer: async (buffer: Buffer) => new Promise(res => {
				zlib.brotliDecompress(buffer, (e, b) => {
					res(b);
				});
			}),
			setEncoding: (headers: OutgoingHttpHeaders): void => {
				headers['content-encoding'] = 'br';
				return;
			},
		};
	})(),
	'gzip': ((): EncodingTools => {
		function getOptions(fast: boolean): ZlibOptions {
			return { level: fast ? 3 : 9 };
		}
		return {
			name: 'gzip',
			compressStream: (fast: boolean) => zlib.createGzip(getOptions(fast)),
			decompressStream: () => zlib.createGunzip(),
			compressBuffer: async (buffer: Buffer, fast: boolean) => new Promise(res => {
				zlib.gzip(buffer, getOptions(fast), (e, b) => {
					res(b);
				});
			}),
			decompressBuffer: async (buffer: Buffer) => new Promise(res => {
				zlib.gunzip(buffer, (e, b) => {
					res(b);
				});
			}),
			setEncoding: (headers: OutgoingHttpHeaders): void => {
				headers['content-encoding'] = 'gzip';
				return;
			},
		};
	})(),
	'deflate': ((): EncodingTools => {
		function getOptions(fast: boolean): ZlibOptions {
			return { level: fast ? 3 : 9 };
		}
		return {
			name: 'deflate',
			compressStream: (fast: boolean) => zlib.createDeflate(getOptions(fast)),
			decompressStream: () => zlib.createInflate(),
			compressBuffer: async (buffer: Buffer, fast: boolean) => new Promise(res => {
				zlib.deflate(buffer, getOptions(fast), (e, b) => {
					res(b);
				});
			}),
			decompressBuffer: async (buffer: Buffer) => new Promise(res => {
				zlib.inflate(buffer, (e, b) => {
					res(b);
				});
			}),
			setEncoding: (headers: OutgoingHttpHeaders): void => {
				headers['content-encoding'] = 'deflate';
				return;
			},
		};
	})(),
	'raw': {
		name: 'raw',
		compressStream: () => new PassThrough(),
		decompressStream: () => new PassThrough(),
		compressBuffer: (buffer: Buffer): Buffer => buffer,
		decompressBuffer: (buffer: Buffer): Buffer => buffer,
		setEncoding: (headers: OutgoingHttpHeaders): void => {
			delete headers['content-encoding'];
		},
	},
};



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

	encodingOut.setEncoding(headersResponse);

	let stream: Readable = Readable.from(body);

	if (encodingIn !== encodingOut) {
		stream = stream.pipe(encodingIn.decompressStream()).pipe(encodingOut.compressStream(fastCompression));
		delete headersResponse['content-length'];
	}

	bufferStream(stream, 10 * MB, handleBuffer, handleStream);

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


export function parseEncoding(acceptEncoding: unknown): EncodingTools {
	if (typeof acceptEncoding !== 'string') return ENCODINGS.raw;
	acceptEncoding = acceptEncoding.trim().toLowerCase().replace(/[^a-z].*/, '');
	switch (acceptEncoding) {
		case 'br': return ENCODINGS.br;
		case 'deflate': return ENCODINGS.deflate;
		case 'gzip': return ENCODINGS.gzip;
	}
	return ENCODINGS.raw;
}

export function findBestEncoding(acceptEncoding: unknown): EncodingTools {
	if (typeof acceptEncoding !== 'string') return ENCODINGS.raw;

	const acceptEncodingString: string = acceptEncoding.toLowerCase();

	if (acceptEncodingString.includes('br')) return ENCODINGS.br;
	if (acceptEncodingString.includes('gzip')) return ENCODINGS.gzip;
	if (acceptEncodingString.includes('deflate')) return ENCODINGS.deflate;
	return ENCODINGS.raw;
}

export function coversEncoding(acceptEncoding: string, encoding: EncodingTools): boolean {
	if (encoding.name === 'raw') return true;
	return acceptEncoding.toLowerCase().includes(encoding.name);
}

// eslint-disable-next-line @typescript-eslint/max-params
export function bufferStream(
	stream: Readable,
	maxSize: number,
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
				if (size >= maxSize) {
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
