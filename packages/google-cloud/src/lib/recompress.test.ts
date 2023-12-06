/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention */

import type { Response } from 'express';
import { recompress, BufferStream } from './recompress.js';
import { Readable } from 'node:stream';
import { getMockedResponder } from './responder.mock.test.js';



const maxBufferSize = 10 * 1024 * 1024;

describe('recompress', () => {
	it('should handle different types of media without recompression', async () => {
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip' }, responseHeaders: { 'content-type': 'audio/mpeg' } });
		await recompress(responder, Buffer.from('test data'));

		const responseHeaders = {
			'cache-control': 'max-age=86400',
			'content-length': '9',
			'content-type': 'audio/mpeg',
			'vary': 'accept-encoding',
		};
		expect(responder.responseHeaders).toStrictEqual(responseHeaders);
		expect(responder.response.set).toHaveBeenCalledWith(responseHeaders);
	});

	it('should handle fast compression setting', async () => {
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip' }, responseHeaders: { 'content-type': 'text/plain' }, fastRecompression: true });
		await recompress(responder, Buffer.from('test data'));

		const responseHeaders = {
			'cache-control': 'max-age=86400',
			'content-length': '9',
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		};
		expect(responder.responseHeaders).toStrictEqual(responseHeaders);
		expect(responder.response.set).toHaveBeenCalledWith(responseHeaders);
	});

	it('should find the best encoding based on headers', async () => {
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip, deflate, br' } });
		await recompress(responder, Buffer.from('test data'));

		const responseHeaders = {
			'cache-control': 'max-age=86400',
			'content-encoding': 'br',
			'content-length': '13',
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		};
		expect(responder.responseHeaders).toStrictEqual(responseHeaders);
		expect(responder.response.set).toHaveBeenCalledWith(responseHeaders);
	});

	it('should properly handle stream and buffer modes 1', async () => {
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': '' } });
		await recompress(responder, Readable.from(Buffer.allocUnsafe(11e6)));

		const responseHeaders = {
			'cache-control': 'max-age=86400',
			'content-type': 'text/plain',
			'transfer-encoding': 'chunked',
			'vary': 'accept-encoding',
		};
		expect(responder.responseHeaders).toStrictEqual(responseHeaders);
		expect(responder.response.set).toHaveBeenCalledWith(responseHeaders);
		expect(responder.response.end).toHaveBeenCalled();
	});

	it('should properly handle stream and buffer modes 2', async () => {
		const responder = getMockedResponder({ responseHeaders: { 'content-type': 'video/mp4' } });
		await recompress(responder, Readable.from(Buffer.allocUnsafe(11e6)));

		const responseHeaders = {
			'cache-control': 'max-age=86400',
			'content-type': 'video/mp4',
			'transfer-encoding': 'chunked',
			'vary': 'accept-encoding',
		};
		expect(responder.responseHeaders).toStrictEqual(responseHeaders);
		expect(responder.response.set).toHaveBeenCalledWith(responseHeaders);
		expect(responder.response.end).toHaveBeenCalled();
	});

	it('should buffer small streams correctly', async () => {
		const data = Buffer.from('small data');
		const stream = Readable.from(data);
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip' }, responseHeaders: { 'content-type': 'audio/mpeg' } });

		const bufferStream = new BufferStream(responder);
		await new Promise(resolve => {
			stream.pipe(bufferStream);
			bufferStream.on('finish', () => {
				resolve(null);
			});
		});

		const response = responder.response as Response & { getBuffer: () => Buffer };

		expect(response.status).toHaveBeenCalledTimes(1);
		expect(response.status).toHaveBeenCalledWith(200);
		expect(response.set).toHaveBeenCalledTimes(1);
		expect(response.set).toHaveBeenCalledWith({
			'cache-control': 'max-age=86400',
			'content-length': '10',
			'content-type': 'audio/mpeg',
		});
		expect(response.end).toHaveBeenCalledTimes(1);
		expect(response.getBuffer()).toStrictEqual(data);
	});

	it('should switch to stream mode for large data', async () => {
		const data = [
			Buffer.from('x'.repeat(maxBufferSize - 1)),
			Buffer.from('x'.repeat(100)),
			Buffer.from('x'.repeat(100)),
		];
		const stream = Readable.from(data);
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip' }, responseHeaders: { 'content-type': 'audio/mpeg' } });

		const bufferStream = new BufferStream(responder);
		await new Promise(resolve => {
			stream.pipe(bufferStream);
			bufferStream.on('finish', () => {
				resolve(null);
			});
		});

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
});
