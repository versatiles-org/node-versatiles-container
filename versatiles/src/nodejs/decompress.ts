import zlib from 'zlib';
import { Compression } from '../index';

export function decompress(data: Buffer, compression: Compression): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		switch (compression) {
			case 'br':
				zlib.brotliDecompress(data, (err, dataOut) => {
					if (err) return reject(err);
					resolve(dataOut);
				});
				break;
			case 'gzip':
				zlib.gunzip(data, (err, dataOut) => {
					if (err) return reject(err);
					resolve(dataOut);
				});
				break;
			default:
				resolve(data);
		}
	});
}
