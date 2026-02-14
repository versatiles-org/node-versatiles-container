import { decompress } from './decompress.js';
import { brotliCompressSync, gzipSync } from 'zlib';
import { describe, expect, it } from 'vitest';

describe('decompress', () => {
	// Create a sample buffer to work with
	const sampleBuffer: Buffer = Buffer.from('some uncompressed test data', 'utf-8');
	const bufferBrotli = brotliCompressSync(sampleBuffer);
	const bufferGzip = gzipSync(sampleBuffer);

	it('decompress Brotli', async () => {
		expect((await decompress(bufferBrotli, 'br')).equals(sampleBuffer)).toBeTruthy();
	});

	it('throw Error on wrong Brotli', async () => {
		await expect(decompress(bufferGzip, 'br')).rejects
			.toThrow(`Can not decompress buffer (length=${bufferGzip.length}) with "br"`);
	});

	it('decompress Gzip', async () => {
		expect((await decompress(bufferGzip, 'gzip')).equals(sampleBuffer)).toBeTruthy();
	});

	it('throw Error on wrong Gzip', async () => {
		await expect(decompress(bufferBrotli, 'gzip')).rejects
			.toThrow(`Can not decompress buffer (length=${bufferBrotli.length}) with "gzip"`);
	});
});
