import zlib from 'zlib';
import type { Compression } from './interfaces.js';

/**
 * Decompresses a buffer using the specified compression algorithm. Currently supports 'br' for Brotli, 'gzip' for GZIP
 * and 'zstd' for Zstandard. For 'raw' the buffer is passed through unchanged. Any other value is rejected rather than passed through, so that
 * data the library cannot decompress is never handed back mislabelled as uncompressed.
 *
 * @param {Buffer} buffer - The buffer to be decompressed.
 * @param {Compression} compression - The compression algorithm to use. Supported values are 'br' for Brotli, 'gzip' for GZIP, 'zstd' for Zstandard and 'raw' for uncompressed data.
 * @returns {Promise<Buffer>} A promise that, when resolved, provides the decompressed buffer. If decompression fails,
 * the promise will be rejected with an error message.
 * @throws {Error} Throws an error if the compression algorithm is unsupported, or if the decompression process encounters
 * an error. The error includes the buffer's length and the compression algorithm that was attempted.
 */
export async function decompress(buffer: Buffer, compression: Compression): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		switch (compression) {
			case 'br':
				zlib.brotliDecompress(buffer, handle);
				break;
			case 'gzip':
				zlib.gunzip(buffer, handle);
				break;
			case 'zstd':
				zlib.zstdDecompress(buffer, handle);
				break;
			case 'raw':
				resolve(buffer);
				break;
			default:
				reject(
					new Error(
						`Can not decompress buffer (length=${buffer.length}): unsupported compression "${String(compression)}"`,
					),
				);
				break;
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
				reject(
					new Error(
						`Can not decompress buffer (length=${buffer.length}) with "${compression}": ${error.message}`,
					),
				);
				return;
			} else {
				resolve(result);
			}
		}
	});
}
