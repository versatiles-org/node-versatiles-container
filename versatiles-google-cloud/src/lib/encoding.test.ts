/* eslint-disable @typescript-eslint/naming-convention */
import { brotliCompressSync, gzipSync } from 'node:zlib';
import type { EncodingType } from './encoding.js';
import { ENCODINGS, parseContentEncoding } from './encoding.js';
import { Readable } from 'node:stream';

describe('Encoding Tools', () => {
	const encodings: EncodingType[] = ['br', 'gzip', 'raw'];
	const buffer = Buffer.from('VersaTiles is a completely FLOSS stack for generating, distributing and using map tiles based on OpenStreetMap data, free of any commercial interests.');
	const buffers = {
		raw: buffer,
		br: brotliCompressSync(buffer),
		gzip: gzipSync(buffer),
	};

	describe('ENCODINGS are completely defined', () => {
		encodings.forEach(name => {
			const encoding = ENCODINGS[name];
			expect(encoding).toBeDefined();
			expect(encoding.name).toBe(name);
			expect(typeof encoding.compressStream).toBe('function');
			expect(typeof encoding.decompressStream).toBe('function');
			expect(typeof encoding.compressBuffer).toBe('function');
			expect(typeof encoding.decompressBuffer).toBe('function');
			expect(typeof encoding.setEncodingHeader).toBe('function');
		});
		expect(Object.keys(ENCODINGS).sort()).toEqual(encodings.sort());
	});

	describe('compress buffer', () => {
		encodings.forEach(name => {
			it(name, async () => {
				const encoding = ENCODINGS[name];

				let buffer1 = await encoding.compressBuffer(buffer, true);
				if (name !== 'raw') {
					expect(buffer1.length).toBeLessThan(buffer.length);
					buffer1 = await encoding.decompressBuffer(buffer1);
				}
				expect(buffer1).toStrictEqual(buffer);

				let buffer2 = await encoding.compressBuffer(buffer, false);
				if (name !== 'raw') {
					expect(buffer2.length).toBeLessThan(buffer.length);
					buffer2 = await encoding.decompressBuffer(buffer2);
				}
				expect(buffer2).toStrictEqual(buffer);
			});
		});
	});

	describe('decompress buffer', () => {
		encodings.forEach(name => {
			it(name, async () => {
				expect(await ENCODINGS[name].decompressBuffer(buffers[name])).toStrictEqual(buffer);
			});
		});
	});

	describe('compress stream', () => {
		encodings.forEach(name => {
			it(name, async () => {
				const encoding = ENCODINGS[name];

				const stream1 = Readable.from(buffer).pipe(ENCODINGS[name].compressStream(true));
				let buffer1 = await stream2buffer(stream1);
				if (name !== 'raw') {
					expect(buffer1.length).toBeLessThan(buffer.length);
					buffer1 = await encoding.decompressBuffer(buffer1);
				}
				expect(buffer1).toStrictEqual(buffer);

				const stream2 = Readable.from(buffer).pipe(ENCODINGS[name].compressStream(false));
				let buffer2 = await stream2buffer(stream2);
				if (name !== 'raw') {
					expect(buffer2.length).toBeLessThan(buffer.length);
					buffer2 = await encoding.decompressBuffer(buffer2);
				}
				expect(buffer2).toStrictEqual(buffer);
			});
		});
	});

	describe('decompress stream', () => {
		encodings.forEach(name => {
			it(name, async () => {
				const stream = Readable.from(buffers[name]).pipe(ENCODINGS[name].decompressStream());
				expect(await stream2buffer(stream)).toStrictEqual(buffer);
			});
		});
	});

	describe('setEncodingHeader', () => {
		it('brotli', () => {
			const header = { 'content-encoding': 'unknown' };
			ENCODINGS.br.setEncodingHeader(header);
			expect(header).toEqual({ 'content-encoding': 'br' });
		});

		it('gzip', () => {
			const header = { 'content-encoding': 'unknown' };
			ENCODINGS.gzip.setEncodingHeader(header);
			expect(header).toEqual({ 'content-encoding': 'gzip' });
		});

		it('raw', () => {
			const header = { 'content-encoding': 'unknown' };
			ENCODINGS.raw.setEncodingHeader(header);
			expect(header).toEqual({});
		});
	});
});

describe('parseContentEncoding', () => {
	it('parses correct encodings', () => {
		expect(parseContentEncoding({}).name).toBe('raw');
		expect(parseContentEncoding({ 'content-encoding': '' }).name).toBe('raw');
		expect(parseContentEncoding({ 'content-encoding': 'br' }).name).toBe('br');
		expect(parseContentEncoding({ 'content-encoding': 'BR' }).name).toBe('br');
		expect(parseContentEncoding({ 'content-encoding': 'gzip' }).name).toBe('gzip');
		expect(parseContentEncoding({ 'content-encoding': 'GZIP' }).name).toBe('gzip');
	});
	it('throws errors on icorrect encodings', () => {
		expect(() => parseContentEncoding({ 'content-encoding': 'deflate' })).toThrow();
		expect(() => parseContentEncoding({ 'content-encoding': 'br, gzip' })).toThrow();
	});
});

describe('findBestEncoding', () => {
	// Test with different scenarios of accept-encoding headers
});

describe('acceptEncoding', () => {
	// Test with various encoding options and headers
});

async function stream2buffer(stream: Readable): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		const buffers = Array<Buffer>();
		stream.on('data', (chunk: Buffer) => buffers.push(chunk));
		stream.on('end', () => {
			resolve(Buffer.concat(buffers));
		});
		stream.on('error', err => {
			reject(`error converting stream - ${String(err)}`);
		});
	});
} 
