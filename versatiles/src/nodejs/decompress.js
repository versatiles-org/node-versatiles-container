import zlib from 'zlib';

export function decompress(data: Buffer, type: string | null): Promise<Buffer> | Buffer {
	return new Promise((resolve, reject) => {
		switch (type) {
			case 'br':
				zlib.brotliDecompress(data, (err, dataOut) => {
					if (err) return reject(err);
					resolve(dataOut);
				});
				break;
			case 'gzip':
				zlib.ungzip(data, (err, dataOut) => {
					if (err) return reject(err);
					resolve(dataOut);
				});
				break;
			default:
				resolve(data);
		}
	});
}
