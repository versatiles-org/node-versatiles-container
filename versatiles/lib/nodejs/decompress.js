import zlib from 'zlib';

export function decompress(data, type) {
	switch (type) {
		case 'br': return new Promise((res, rej) =>
			zlib.brotliDecompress(data, (err, dataOut) => {
				if (err) return rej(err); res(dataOut);
			})
		)
		case 'gzip': return new Promise((res, rej) =>
			zlib.ungzip(data, (err, dataOut) => {
				if (err) return rej(err); res(dataOut);
			})
		)
		default: return data;
	}
}
