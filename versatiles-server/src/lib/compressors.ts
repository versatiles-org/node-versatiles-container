
import zlib from 'node:zlib';

export function gzip(dataIn) {
	return new Promise((res, rej) =>
		zlib.gzip(dataIn, { level: 9 }, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}

export function ungzip(dataIn) {
	return new Promise((res, rej) =>
		zlib.gunzip(dataIn, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}

export function brotli(dataIn) {
	return new Promise((res, rej) =>
		zlib.brotliCompress(dataIn, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, } }, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}

export function unbrotli(dataIn) {
	return new Promise((res, rej) =>
		zlib.brotliDecompress(dataIn, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}
