/* eslint-disable @typescript-eslint/naming-convention */
import type { EncodingType } from './encoding.js';
import type { IncomingHttpHeaders } from 'node:http';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { ENCODINGS, acceptEncoding, findBestEncoding, parseContentEncoding } from './encoding.js';
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
			expect(typeof encoding.setEncodingHeader).toBe('function');

			if (encoding.name === 'raw') return;
			
			expect(typeof encoding.compressStream).toBe('function');
			expect(typeof encoding.decompressStream).toBe('function');
			expect(typeof encoding.compressBuffer).toBe('function');
			expect(typeof encoding.decompressBuffer).toBe('function');
		});
		expect(Object.keys(ENCODINGS).sort()).toEqual(encodings.sort());
	});

	describe('compress buffer', () => {
		encodings.forEach(name => {
			it(name, async () => {
				const encoding = ENCODINGS[name];

				if (!encoding.compressBuffer && !encoding.decompressBuffer) return;
				if (!encoding.compressBuffer || !encoding.decompressBuffer) throw Error();

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
				const encoding = ENCODINGS[name];

				if (!encoding.decompressBuffer) return;
				
				expect(await encoding.decompressBuffer(buffers[name])).toStrictEqual(buffer);
			});
		});
	});

	describe('compress stream', () => {
		encodings.forEach(name => {
			it(name, async () => {
				const encoding = ENCODINGS[name];

				if (!encoding.compressStream && !encoding.decompressBuffer) return;
				if (!encoding.compressStream || !encoding.decompressBuffer) throw Error();

				const stream1 = Readable.from(buffer).pipe(encoding.compressStream(true));
				let buffer1 = await stream2buffer(stream1);
				if (name !== 'raw') {
					expect(buffer1.length).toBeLessThan(buffer.length);
					buffer1 = await encoding.decompressBuffer(buffer1);
				}
				expect(buffer1).toStrictEqual(buffer);

				const stream2 = Readable.from(buffer).pipe(encoding.compressStream(false));
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
				const encoding = ENCODINGS[name];

				if (!encoding.decompressStream) return;

				const stream = Readable.from(buffers[name]).pipe(encoding.decompressStream());
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
	it('handles encodings correctly', () => {
		expect(findBestEncoding({}).name).toBe('raw');
		expect(findBestEncoding({ 'accept-encoding': '' }).name).toBe('raw');
		expect(findBestEncoding({ 'accept-encoding': 'br' }).name).toBe('br');
		expect(findBestEncoding({ 'accept-encoding': 'BR' }).name).toBe('br');
		expect(findBestEncoding({ 'accept-encoding': 'gzip' }).name).toBe('gzip');
		expect(findBestEncoding({ 'accept-encoding': 'GZIP' }).name).toBe('gzip');
	});
	it('handles multiple encodings correctly', () => {
		expect(findBestEncoding({ 'accept-encoding': 'gzip, deflate, br;q=1.0, identity;q=0.5, *;q=0.25' }).name).toBe('br');
		expect(findBestEncoding({ 'accept-encoding': 'deflate, gzip;q=1.0, *;q=0.5' }).name).toBe('gzip');
		expect(findBestEncoding({ 'accept-encoding': 'gzip, compress, br' }).name).toBe('br');
		expect(findBestEncoding({ 'accept-encoding': 'gzip, compress' }).name).toBe('gzip');
		expect(findBestEncoding({ 'accept-encoding': 'compress, gzip' }).name).toBe('gzip');
		expect(findBestEncoding({ 'accept-encoding': 'br;q=1.0, gzip;q=0.8, *;q=0.1' }).name).toBe('br');
		expect(findBestEncoding({ 'accept-encoding': 'q=1.0, gzip;q=0.8, *;q=0.1' }).name).toBe('gzip');
	});
	it('handles unusable encodings correctly', () => {
		expect(findBestEncoding({ 'accept-encoding': 'compress' }).name).toBe('raw');
		expect(findBestEncoding({ 'accept-encoding': 'deflate' }).name).toBe('raw');
		expect(findBestEncoding({ 'accept-encoding': 'identity' }).name).toBe('raw');
		expect(findBestEncoding({ 'accept-encoding': '*' }).name).toBe('raw');
	});
});

describe('acceptEncoding', () => {
	const encodings: EncodingType[] = ['raw', 'gzip', 'br'];
	describe('handles encodings correctly', () => {
		check(undefined, 'raw');
		check('', 'raw');
		check('br', 'raw,br');
		check('BR', 'raw,br');
		check('gzip', 'raw,gzip');
		check('GZIP', 'raw,gzip');
	});
	describe('handles multiple encodings correctly', () => {
		check('gzip, deflate, br;q=1.0, identity;q=0.5, *;q=0.25', 'raw,gzip,br');
		check(['gzip', 'deflate', 'br;q=1.0', 'identity;q=0.5', '*;q=0.25'], 'raw,gzip,br');
		check('deflate, gzip;q=1.0, *;q=0.5', 'raw,gzip');
		check(['deflate', ' gzip;q=1.0', ' *;q=0.5'], 'raw,gzip');
		check('gzip, compress, br', 'raw,gzip,br');
		check(['gzip', ' compress', ' br'], 'raw,gzip,br');
		check(['GZIP', ' COMPRESS', ' BR'], 'raw,gzip,br');
		check('gzip, compress', 'raw,gzip');
		check(['gzip', ' compress'], 'raw,gzip');
		check('compress, gzip', 'raw,gzip');
		check(['compress', ' gzip'], 'raw,gzip');
		check('br;q=1.0, gzip;q=0.8, *;q=0.1', 'raw,gzip,br');
		check(['br;q=1.0', ' gzip;q=0.8', ' *;q=0.1'], 'raw,gzip,br');
		check('q=1.0, gzip;q=0.8, *;q=0.1', 'raw,gzip');
		check(['q=1.0', ' gzip;q=0.8', ' *;q=0.1'], 'raw,gzip');
	});
	describe('handles unusable encodings correctly', () => {
		check('compress', 'raw');
		check('deflate', 'raw');
		check('identity', 'raw');
		check('*', 'raw');
	});

	function check(acceptedEncoding: string[] | string | undefined, encodingList: string): void {
		const header: IncomingHttpHeaders = {};
		if (acceptedEncoding != null) header['accept-encoding'] = acceptedEncoding;

		it(`works for ${JSON.stringify(acceptedEncoding)}`, () => {
			const result = encodings.filter(encodingName => acceptEncoding(header, ENCODINGS[encodingName]));
			expect(result.join(',')).toBe(encodingList);
		});
	}
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
