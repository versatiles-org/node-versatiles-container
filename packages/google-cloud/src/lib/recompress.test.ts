/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention */

import type { EnhancedResponder } from './responder.mock.test.js';
import type { OutgoingHttpHeaders } from 'node:http';
import type { Response } from 'express';
import { getMockedResponder } from './responder.mock.test.js';
import { Readable } from 'node:stream';
import { recompress, BufferStream } from './recompress.js';
import { ENCODINGS } from './encoding.js';
import zlib from 'node:zlib';
import { finished } from 'node:stream/promises';



const maxBufferSize = 10 * 1024 * 1024;
const testBuffer = Buffer.from('Krawehl! Krawehl! Taubtrüber Ginst am Musenhain! Trübtauber Hain am Musenginst! Krawehl!');

describe('recompress', () => {
	it('should handle different types of media without recompression', async () => {
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip' }, responseHeaders: { 'content-type': 'audio/mpeg' } });
		await recompress(responder, testBuffer);

		checkResponseHeaders(responder, {
			'cache-control': 'max-age=86400',
			'content-length': '90',
			'content-type': 'audio/mpeg',
			'vary': 'accept-encoding',
		});
		expect(responder.response.getBuffer()).toStrictEqual(testBuffer);
	});

	it('should handle fast compression setting', async () => {
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip' }, responseHeaders: { 'content-type': 'text/plain' }, fastRecompression: true });
		await recompress(responder, testBuffer);

		checkResponseHeaders(responder, {
			'cache-control': 'max-age=86400',
			'content-length': '90',
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		});
		expect(responder.response.getBuffer()).toStrictEqual(testBuffer);
	});

	it('should find the best encoding based on headers', async () => {
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip, deflate, br' } });
		await recompress(responder, testBuffer);

		checkResponseHeaders(responder, {
			'cache-control': 'max-age=86400',
			'content-encoding': 'br',
			'content-length': '86',
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		});
		expect(zlib.brotliDecompressSync(responder.response.getBuffer())).toStrictEqual(testBuffer);
	});

	it('should properly handle stream and buffer modes 1', async () => {
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': '' } });
		await recompress(responder, Readable.from(Buffer.allocUnsafe(11e6)));

		checkResponseHeaders(responder, {
			'cache-control': 'max-age=86400',
			'content-type': 'text/plain',
			'transfer-encoding': 'chunked',
			'vary': 'accept-encoding',
		});
		expect(responder.response.end).toHaveBeenCalled();
	});

	it('should properly handle stream and buffer modes 2', async () => {
		const responder = getMockedResponder({ responseHeaders: { 'content-type': 'video/mp4' } });
		await recompress(responder, Readable.from(Buffer.allocUnsafe(11e6)));

		checkResponseHeaders(responder, {
			'cache-control': 'max-age=86400',
			'content-type': 'video/mp4',
			'transfer-encoding': 'chunked',
			'vary': 'accept-encoding',
		});
		expect(responder.response.end).toHaveBeenCalled();
	});

	it('should buffer small streams correctly', async () => {
		const stream = Readable.from(testBuffer);
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip' }, responseHeaders: { 'content-type': 'audio/mpeg' } });

		await finished(stream.pipe(new BufferStream(responder)));

		const response = responder.response as Response & { getBuffer: () => Buffer };

		expect(response.status).toHaveBeenCalledTimes(1);
		expect(response.status).toHaveBeenCalledWith(200);
		expect(response.set).toHaveBeenCalledTimes(1);
		expect(response.set).toHaveBeenCalledWith({
			'cache-control': 'max-age=86400',
			'content-length': '90',
			'content-type': 'audio/mpeg',
		});
		expect(response.end).toHaveBeenCalledTimes(1);
		expect(response.getBuffer()).toStrictEqual(testBuffer);
	});

	it('should switch to stream mode for large data', async () => {
		const data = [
			Buffer.from('x'.repeat(maxBufferSize - 1)),
			Buffer.from('x'.repeat(100)),
			Buffer.from('x'.repeat(100)),
		];
		const stream = Readable.from(data);
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip' }, responseHeaders: { 'content-type': 'audio/mpeg' } });

		await finished(stream.pipe(new BufferStream(responder)));

		const response = responder.response as Response & { getBuffer: () => Buffer };

		expect(response.status).toHaveBeenCalledTimes(1);
		expect(response.status).toHaveBeenCalledWith(200);
		expect(response.set).toHaveBeenCalledTimes(1);
		expect(response.set).toHaveBeenCalledWith({
			'cache-control': 'max-age=86400',
			'content-type': 'audio/mpeg',
			'transfer-encoding': 'chunked',
		});
		expect(response.end).toHaveBeenCalledTimes(1);
		expect(Buffer.concat(data).compare(response.getBuffer())).toBe(0);
	});

	describe('systematically check recompression', () => {
		const encodings = Object.keys(ENCODINGS);
		for (const encodingIn of encodings) {
			let buffer: Buffer;
			switch (encodingIn) {
				case 'raw': buffer = testBuffer; break;
				case 'gzip': buffer = zlib.gzipSync(testBuffer, { level: 9 }); break;
				case 'br': buffer = zlib.brotliCompressSync(testBuffer); break;
				default: throw Error('unknown encoding: ' + encodingIn);
			}
			for (const encodingOut of encodings) {
				for (const isStream of [true, false]) {
					it(`from ${encodingIn} to ${encodingOut} for ${isStream ? 'stream' : 'buffer'}s`, async () => {
						const responder = getMockedResponder({
							responseHeaders: { 'content-encoding': encodingIn === 'raw' ? undefined : encodingIn },
							requestHeaders: { 'accept-encoding': encodingOut },
						});
						const body = isStream ? Readable.from(buffer) : buffer;
						await recompress(responder, body);

						const contentEncoding = responder.responseHeaders['content-encoding'];
						switch (encodingOut) {
							case 'raw': expect(contentEncoding).toBeUndefined(); break;
							default: expect(contentEncoding).toBe(encodingOut); break;
						}

						let bufferOut = responder.response.getBuffer();
						switch (encodingOut) {
							case 'gzip': bufferOut = zlib.gunzipSync(bufferOut); break;
							case 'br': bufferOut = zlib.brotliDecompressSync(bufferOut); break;
							default:
						}

						expect(bufferOut).toStrictEqual(testBuffer);
					});
				}
			}
		}
	});

	function checkResponseHeaders(responder: EnhancedResponder, responseHeaders: OutgoingHttpHeaders): void {
		expect(responder.responseHeaders).toStrictEqual(responseHeaders);
		expect(responder.response.set).toHaveBeenCalledTimes(1);
		expect(responder.response.set).toHaveBeenCalledWith(responseHeaders);
	}
});
