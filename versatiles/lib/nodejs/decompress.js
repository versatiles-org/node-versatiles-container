const zlib = require("node:zlib");

// decompression helper
export async function decompress(type, data) {
	switch (type) {
		case 'br': zlib.brotliDecompress(data); break;
		case 'gzip': zlib.gunzip(data); break;
		default: return data;
	}
}
