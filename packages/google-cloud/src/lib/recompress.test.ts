/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention */

import type { Response } from 'express';
import type { ResponderInterface } from './responder.js';
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';
import { recompress, BufferStream } from './recompress.js';
import { Readable, Writable } from 'node:stream';
import { jest } from '@jest/globals';
import { Responder } from './responder.js';



function getSink(): Writable {
	class Sink extends Writable {
		public _write(chunk: unknown, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
			callback();
		}
	}
	return new Sink();
}

describe('recompress', () => {
	function getMockResponder(
		requestHeaders: IncomingHttpHeaders = { 'accept-encoding': '' },
		responseHeaders: OutgoingHttpHeaders = { 'content-type': 'text/plain' },
		fastRecompression = false,
	): ResponderInterface {

		const response = getSink() as unknown as Response;
		jest.spyOn(response, 'end');
		response.set = jest.fn<Response['set']>().mockReturnThis();
		response.status = jest.fn<Response['status']>().mockReturnThis();

		const responder = Responder({
			fastRecompression,
			requestHeaders,
			requestNo: 0,
			response,
			verbose: false,
		});
		for (const key in responseHeaders) responder.set(key, responseHeaders[key] as string);
		return responder;
	}

	it('should handle different types of media without recompression', async () => {
		const responder = getMockResponder({ 'accept-encoding': 'gzip' }, { 'content-type': 'audio/mpeg' });
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
		const responder = getMockResponder({ 'accept-encoding': 'gzip' }, { 'content-type': 'text/plain' }, true);
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
		const responder = getMockResponder({ 'accept-encoding': 'gzip, deflate, br' });
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
		const responder = getMockResponder();
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
		const responder = getMockResponder(undefined, { 'content-type': 'video/mp4' });
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
});

describe('BufferStream', () => {
	const maxBufferSize = 10 * 1024 * 1024;

	it('should buffer small streams correctly', async () => {
		const data = Buffer.from('small data');
		const stream = Readable.from(data);
		const handleBuffer = jest.fn<(buffer: Buffer) => void>();
		const handleStream = jest.fn<() => Writable>(getSink);

		const bufferStream = new BufferStream(handleBuffer, handleStream);
		await new Promise(resolve => {
			stream.pipe(bufferStream);
			bufferStream.on('finish', () => {
				resolve(null);
			});
		});

		// Assumption: handleBuffer should be called for small data
		expect(handleBuffer).toHaveBeenCalledTimes(1);
		expect(handleBuffer).toHaveBeenCalledWith(data);
		expect(handleStream).not.toHaveBeenCalled();
	});

	it('should switch to stream mode for large data', async () => {
		const chunk = 'x'.repeat(maxBufferSize / 100);
		const data = [chunk.repeat(100), chunk, chunk];
		const stream = Readable.from(data);
		const handleBuffer = jest.fn<(buffer: Buffer) => void>();
		const handleStream = jest.fn<() => Writable>(getSink);

		const bufferStream = new BufferStream(handleBuffer, handleStream);
		await new Promise(resolve => {
			stream.pipe(bufferStream);
			bufferStream.on('finish', () => {
				resolve(null);
			});
		});

		// Assumption: handleStream should be called for large data
		expect(handleBuffer).not.toHaveBeenCalled();
		expect(handleStream).toHaveBeenCalledTimes(1);
		expect(handleStream).toHaveBeenCalled();
	});
});
