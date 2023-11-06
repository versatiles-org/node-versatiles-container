
import zlib from 'node:zlib';

export async function gzip(dataIn: Buffer): Promise<Buffer> {
	return new Promise((res, rej) => {
		zlib.gzip(dataIn, { level: 9 }, (err, dataOut) => {
			if (err) {
				rej(err); return; 
			} res(dataOut);
		}); 
	},
	);
}

export async function ungzip(dataIn: Buffer): Promise<Buffer> {
	return new Promise((res, rej) => {
		zlib.gunzip(dataIn, (err, dataOut) => {
			if (err) {
				rej(err); return; 
			} res(dataOut);
		}); 
	},
	);
}

export async function brotli(dataIn: Buffer): Promise<Buffer> {
	return new Promise((res, rej) => {
		zlib.brotliCompress(dataIn, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }, (err, dataOut) => {
			if (err) {
				rej(err); return; 
			} res(dataOut);
		}); 
	},
	);
}

export async function unbrotli(dataIn: Buffer): Promise<Buffer> {
	return new Promise((res, rej) => {
		zlib.brotliDecompress(dataIn, (err, dataOut) => {
			if (err) {
				rej(err); return; 
			} res(dataOut);
		}); 
	},
	);
}
