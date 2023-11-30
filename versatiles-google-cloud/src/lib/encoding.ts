import type { BrotliOptions, ZlibOptions } from 'node:zlib';
import type { OutgoingHttpHeaders } from 'node:http';
import { PassThrough, type Transform } from 'node:stream';
import zlib from 'node:zlib';

export type EncodingType = 'br' | 'gzip' | 'raw';

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

export function parseContentEncoding(headers: OutgoingHttpHeaders): EncodingTools {
	const contentEncoding = headers['content-encoding'];
	if (contentEncoding == null) return ENCODINGS.raw;

	if (typeof contentEncoding !== 'string') throw Error(`unknown content-encoding ${JSON.stringify(contentEncoding)}`);

	const contentEncodingString = contentEncoding.trim().toLowerCase();
	switch (contentEncodingString) {
		case '': return ENCODINGS.raw;
		case 'br': return ENCODINGS.br;
		case 'gzip': return ENCODINGS.gzip;
	}

	throw Error(`unknown content-encoding ${JSON.stringify(contentEncoding)}`);
}

export function findBestEncoding(headers: OutgoingHttpHeaders): EncodingTools {
	const encodingHeader = headers['accept-encoding'];
	if (typeof encodingHeader !== 'string') return ENCODINGS.raw;

	const encodingString: string = encodingHeader.toLowerCase();

	if (encodingString.includes('br')) return ENCODINGS.br;
	if (encodingString.includes('gzip')) return ENCODINGS.gzip;
	return ENCODINGS.raw;
}

export function acceptEncoding(headers: OutgoingHttpHeaders, encoding: EncodingTools): boolean {
	if (encoding.name === 'raw') return true;

	const encodingHeader = headers['accept-encoding'];
	if (encodingHeader == null) return encoding === ENCODINGS.raw;

	return JSON.stringify(encodingHeader).toLowerCase().includes(encoding.name);
}
