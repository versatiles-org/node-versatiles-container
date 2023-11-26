
import type { BrotliOptions, ZlibOptions } from 'node:zlib';
import zlib from 'node:zlib';
import through from 'through2';
import type { Transform, Readable } from 'node:stream';
import { Stream } from 'node:stream';
import type { Response } from 'express';
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';

export type EncodingType = 'br' | 'deflate' | 'gzip' | 'raw';
interface EncodingTools {
	name: EncodingType;
	compressStream: (fast: boolean, size?: number) => Transform | null;
	decompressStream: () => Transform | null;
	compressBuffer: (buffer: Buffer, fast: boolean) => Buffer | Promise<Buffer>;
	decompressBuffer: (buffer: Buffer) => Buffer | Promise<Buffer>;
	setEncoding: (headers: OutgoingHttpHeaders) => void;
}

const MB = 1024 * 1024;
const ENCODINGS: Record<EncodingType, EncodingTools> = {
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
		compressStream: () => null,
		decompressStream: () => null,
		compressBuffer: (buffer: Buffer): Buffer => buffer,
		decompressBuffer: (buffer: Buffer): Buffer => buffer,
		setEncoding: (headers: OutgoingHttpHeaders): void => {
			delete headers['content-encoding'];
		},
	},
};



// eslint-disable-next-line @typescript-eslint/max-params
export async function recompress(headersRequest: IncomingHttpHeaders, headersResponse: OutgoingHttpHeaders, body: Buffer | Readable, response: Response, fastCompression = false): Promise<void> {
	return new Promise(resolve => {
		// detect encoding:
		const encodingIn = detectEncoding(headersResponse['content-encoding']);
		let encodingOut: EncodingTools;

		const type = String(headersResponse['content-type']).replace(/\/.*/, '').toLowerCase();

		// do not recompress images, videos, ...
		switch (type) {
			case 'audio':
			case 'image':
			case 'video':
				encodingOut = ENCODINGS.raw;
				break;
			default:
				const ignoreBrotli = fastCompression && (encodingIn.name === 'gzip');
				encodingOut = detectEncoding(String(headersRequest['accept-encoding']), ignoreBrotli);
		}

		headersResponse.vary = 'accept-encoding';

		encodingOut.setEncoding(headersResponse);

		if (Buffer.isBuffer(body)) {
			void handleBuffer(body);
		} else if (Stream.isReadable(body)) {
			let stream: Readable = body;
			const transform1 = encodingIn.decompressStream();
			if (transform1) stream = stream.pipe(transform1);
			stream.pipe(bufferStream(16 * MB, handleBuffer, handleStream));
		}

		return;

		async function handleBuffer(buffer: Buffer): Promise<void> {
			buffer = await encodingOut.compressBuffer(buffer, fastCompression);

			delete headersResponse['transfer-encoding'];
			headersResponse['content-length'] = String(buffer.length);

			response
				.status(200)
				.set(headersResponse)
				.end(buffer);

			resolve();
		}

		function handleStream(transform: Transform): void {
			headersResponse['transfer-encoding'] = 'chunked';
			delete headersResponse['content-length'];

			response
				.status(200)
				.set(headersResponse);

			const transform2 = encodingOut.compressStream(fastCompression);
			if (transform2) transform = transform.pipe(transform2);

			transform.pipe(response).on('finish', () => {
				resolve();
			});
		}
	});
}



function detectEncoding(text?: string, ignoreBrotli = false): EncodingTools {
	if (text == null) return ENCODINGS.raw;

	text = String(text).toLowerCase();

	if (!ignoreBrotli && text.includes('br')) return ENCODINGS.br;
	if (text.includes('gzip')) return ENCODINGS.gzip;
	if (text.includes('deflate')) return ENCODINGS.deflate;
	return ENCODINGS.raw;
}



function bufferStream(maxSize: number, handleBuffer: (buffer: Buffer) => Promise<void>, handleStream: (stream: Transform) => void): Transform {
	const buffers: Buffer[] = [];
	let size = 0;
	let bufferMode = true;

	const stream = through(
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
			if (bufferMode) {
				void handleBuffer(Buffer.concat(buffers)).then(() => {
					cb();
				});
			} else {
				cb();
			}
			return;
		},
	);
	return stream;
}
