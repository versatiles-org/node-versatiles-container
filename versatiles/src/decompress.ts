import zlib from 'zlib';
import { Compression } from './interfaces';

/**
 * Decompresses a buffer using the specified compression algorithm.
 *
 * @param {Buffer} buffer - The buffer to be decompressed.
 * @param {Compression} compression - The compression algorithm to use ('br' for Brotli, 'gzip' for GZIP).
 * @returns {Promise<Buffer>} A promise that resolves with the decompressed buffer.
 */
export function decompress(buffer: Buffer, compression: Compression): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		switch (compression) {
			case 'br': zlib.brotliDecompress(buffer, handle); break;
			case 'gzip': zlib.gunzip(buffer, handle); break;
			default: resolve(buffer); break;
		}

		/**
		 * Handles the result of the decompression operation.
		 *
		 * @param {Error | null} error - The error object, if any.
		 * @param {Buffer} result - The decompressed buffer.
		 */
		function handle(error: Error | null, result: Buffer): void {
			if (error) return reject(error);
			resolve(result);
		}
	});
}
