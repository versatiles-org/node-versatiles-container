import zlib from 'zlib';
import { Compression } from '../index';

export function decompress(data: Buffer, compression: Compression): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		switch (compression) {
			case 'br': zlib.brotliDecompress(data, handle); break;
			case 'gzip': zlib.gunzip(data, handle); break;
			default: resolve(data); break;
		}

		function handle(error: Error | null, result: Buffer): void {
			if (error) return reject(error);
			resolve(result);
		}
	});
}