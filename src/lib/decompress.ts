import zlib from 'zlib';
import type { Compression } from './interfaces.js';

/**
 * Decompresses a buffer using the specified compression algorithm. Currently supports 'br' for Brotli and 'gzip' for GZIP.
 * If the specified algorithm is not supported, the function resolves the promise with the original buffer.
 *
 * @param {Buffer} buffer - The buffer to be decompressed.
 * @param {Compression} compression - The compression algorithm to use. Supported values are 'br' for Brotli and 'gzip' for GZIP.
 * @returns {Promise<Buffer>} A promise that, when resolved, provides the decompressed buffer. If the compression type is not recognized,
 * the promise will resolve with the original buffer. If decompression fails, the promise will be rejected with an error message.
 * @throws {Error} Throws an error if the decompression process encounters an error. The error includes the buffer's length and
 * the compression algorithm that was attempted.
 */
export async function decompress(buffer: Buffer, compression: Compression): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		switch (compression) {
			case 'br': zlib.brotliDecompress(buffer, handle); break;
			case 'gzip': zlib.gunzip(buffer, handle); break;
			default: resolve(buffer); break;
		}

		/**
		 * Handles the result of the decompression operation. If decompression is successful, the promise is resolved
		 * with the decompressed buffer. If an error occurs during decompression, the promise is rejected with a descriptive
		 * error message.
		 *
		 * @param {Error | null} error - The error object, if any, returned from the decompression operation.
		 * @param {Buffer} result - The decompressed buffer returned from the decompression operation.
		 * @throws {Error} Throws an error if decompression fails, including the buffer length and the attempted compression method.
		 */
		function handle(error: Error | null, result: Buffer): void {
			if (error) {
				reject(new Error(`Can not decompress buffer (length=${buffer.length}) with "${compression}": ${error.message}`)); return;
			} else {
				resolve(result);
			}
		}
	});
}
