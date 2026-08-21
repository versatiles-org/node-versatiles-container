import { decompress } from './decompress.js';
import type { Compression } from './interfaces.js';
import { brotliCompressSync, gzipSync, zstdCompressSync } from 'zlib';
import { describe, expect, it } from 'vitest';

describe('decompress', () => {
	// Create a sample buffer to work with
	const sampleBuffer: Buffer = Buffer.from('some uncompressed test data', 'utf-8');
	const bufferBrotli = brotliCompressSync(sampleBuffer);
	const bufferGzip = gzipSync(sampleBuffer);
	const bufferZstd = zstdCompressSync(sampleBuffer);

	it('decompress Brotli', async () => {
		expect((await decompress(bufferBrotli, 'br')).equals(sampleBuffer)).toBeTruthy();
	});

	it('throw Error on wrong Brotli', async () => {
		await expect(decompress(bufferGzip, 'br')).rejects.toThrow(
			`Can not decompress buffer (length=${bufferGzip.length}) with "br"`,
		);
	});

	it('decompress Gzip', async () => {
		expect((await decompress(bufferGzip, 'gzip')).equals(sampleBuffer)).toBeTruthy();
	});

	it('throw Error on wrong Gzip', async () => {
		await expect(decompress(bufferBrotli, 'gzip')).rejects.toThrow(
			`Can not decompress buffer (length=${bufferBrotli.length}) with "gzip"`,
		);
	});

	it('decompress Zstandard', async () => {
		expect((await decompress(bufferZstd, 'zstd')).equals(sampleBuffer)).toBeTruthy();
	});

	it('throw Error on wrong Zstandard', async () => {
		await expect(decompress(bufferGzip, 'zstd')).rejects.toThrow(
			`Can not decompress buffer (length=${bufferGzip.length}) with "zstd"`,
		);
	});

	it('pass through raw data', async () => {
		expect((await decompress(sampleBuffer, 'raw')).equals(sampleBuffer)).toBeTruthy();
	});

	it('throw Error on unsupported compression instead of passing the buffer through', async () => {
		await expect(decompress(sampleBuffer, 'lzma' as Compression)).rejects.toThrow(
			`Can not decompress buffer (length=${sampleBuffer.length}): unsupported compression "lzma"`,
		);
	});
});
