import type { BrotliOptions, ZlibOptions } from 'node:zlib';
import type { OutgoingHttpHeaders } from 'node:http';
import { PassThrough, type Transform } from 'node:stream';
import zlib from 'node:zlib';

export interface EncodingTools {
	name: EncodingType;
	compressStream: (fast: boolean, size?: number) => Transform;
	decompressStream: () => Transform;
	compressBuffer: (buffer: Buffer, fast: boolean) => Buffer | Promise<Buffer>;
	decompressBuffer: (buffer: Buffer) => Buffer | Promise<Buffer>;
	setEncodingHeader: (headers: OutgoingHttpHeaders) => void;
}

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
			compressBuffer: async (buffer: Buffer, fast: boolean) => new Promise(resolve => {
				zlib.brotliCompress(buffer, getOptions(fast, buffer.length), (e, b) => {
					resolve(b);
				});
			}),
			decompressBuffer: async (buffer: Buffer) => new Promise(resolve => {
				zlib.brotliDecompress(buffer, (e, b) => {
					resolve(b);
				});
			}),
			setEncodingHeader: (headers: OutgoingHttpHeaders): void => {
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
			compressBuffer: async (buffer: Buffer, fast: boolean) => new Promise(resolve => {
				zlib.gzip(buffer, getOptions(fast), (e, b) => {
					resolve(b);
				});
			}),
			decompressBuffer: async (buffer: Buffer) => new Promise(resolve => {
				zlib.gunzip(buffer, (e, b) => {
					resolve(b);
				});
			}),
			setEncodingHeader: (headers: OutgoingHttpHeaders): void => {
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
			compressBuffer: async (buffer: Buffer, fast: boolean) => new Promise(resolve => {
				zlib.deflate(buffer, getOptions(fast), (e, b) => {
					resolve(b);
				});
			}),
			decompressBuffer: async (buffer: Buffer) => new Promise(resolve => {
				zlib.inflate(buffer, (e, b) => {
					resolve(b);
				});
			}),
			setEncodingHeader: (headers: OutgoingHttpHeaders): void => {
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
		setEncodingHeader: (headers: OutgoingHttpHeaders): void => {
			delete headers['content-encoding'];
		},
	},
};

export type EncodingType = 'br' | 'deflate' | 'gzip' | 'raw';

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
