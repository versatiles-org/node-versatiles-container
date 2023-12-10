/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention */
import type { Response } from 'express';
import { brotliCompressSync, brotliDecompressSync, gunzipSync, gzipSync } from 'zlib';
import { getMockedResponder } from './responder.mock.test.js';



describe('Responder', () => {

	it('should set and get response headers correctly', () => {
		const responder = getMockedResponder();

		responder.set('test-header', 'test-value');
		expect(responder.responseHeaders['test-header']).toBe('test-value');

		responder.del('test-header');
		expect(responder.responseHeaders['test-header']).toBeUndefined();
	});

	it('should get request number', () => {
		const responder1 = getMockedResponder({ requestNo: 13 });
		expect(responder1.requestNo).toBe(13);

		const responder2 = getMockedResponder({ requestNo: 42 });
		expect(responder2.requestNo).toBe(42);
	});

	it('should get verbose', () => {
		const responder1 = getMockedResponder({ verbose: false });
		expect(responder1.verbose).toBe(false);

		const responder2 = getMockedResponder({ verbose: true });
		expect(responder2.verbose).toBe(true);
	});

	it('should handle error responses correctly', () => {
		const responder = getMockedResponder();
		const errorCode = 404;
		const errorMessage = 'Not Found';
		responder.error(errorCode, errorMessage);

		expect(responder.response.status).toHaveBeenCalledWith(errorCode);
		expect(responder.response.type).toHaveBeenCalledWith('text');
		expect(responder.response.send).toHaveBeenCalledWith(errorMessage);
	});

	it('should respond correctly with raw text content', async () => {
		const responder = getMockedResponder({ fastRecompression: true });

		await responder.respond('content42', 'text/plain', 'raw');

		expect(responder.response.set).toHaveBeenCalledTimes(1);
		expect(responder.response.set).toHaveBeenCalledWith({
			'cache-control': 'max-age=86400',
			'content-length': '9',
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		});
		expect(responder.response.getBuffer().toString()).toBe('content42');
	});

	it('should respond correctly with raw image content', async () => {
		const responder = getMockedResponder();

		await responder.respond('prettyimagedata', 'image/png', 'raw');

		expect(responder.response.set).toHaveBeenCalledTimes(1);
		expect(responder.response.set).toHaveBeenCalledWith({
			'cache-control': 'max-age=86400',
			'content-length': '15',
			'content-type': 'image/png',
			'vary': 'accept-encoding',
		});
		expect(responder.response.getBuffer().toString()).toBe('prettyimagedata');
	});

	it('should respond correctly with gzip compressed text content', async () => {
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip, br', 'content-type': 'application/json' }, fastRecompression: true });

		const content = Buffer.from('gzip compressed text content');
		const contentCompressed = gzipSync(content);
		await responder.respond(contentCompressed, 'text/plain', 'gzip');

		expect(responder.response.set).toHaveBeenCalledTimes(1);
		expect(responder.response.set).toHaveBeenCalledWith({
			'cache-control': 'max-age=86400',
			'content-encoding': 'gzip',
			'content-length': '' + contentCompressed.length,
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		});

		expect(responder.response.end).toHaveBeenCalledTimes(1);
		const mockFunction = responder.response.end as unknown as jest.MockedFunction<(chunk: Buffer) => Response>;
		const buffer = mockFunction.mock.calls.pop();
		if (buffer == null) throw Error();
		expect(gunzipSync(buffer[0])).toStrictEqual(content);
	});

	it('should respond correctly with brotli compressed text content', async () => {
		const responder = getMockedResponder({ requestHeaders: { 'accept-encoding': 'gzip, br', 'content-type': 'application/json' } });

		const content = Buffer.from('brotli compressed text content');
		const contentCompressed = brotliCompressSync(content);
		await responder.respond(contentCompressed, 'text/plain', 'br');

		expect(responder.response.set).toHaveBeenCalledTimes(1);
		expect(responder.response.set).toHaveBeenCalledWith({
			'cache-control': 'max-age=86400',
			'content-encoding': 'br',
			'content-length': '' + contentCompressed.length,
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		});

		expect(responder.response.end).toHaveBeenCalledTimes(1);
		const mockFunction = responder.response.end as unknown as jest.MockedFunction<(chunk: Buffer) => Response>;
		const buffer = mockFunction.mock.calls.pop();
		if (buffer == null) throw Error();
		expect(brotliDecompressSync(buffer[0])).toStrictEqual(content);
	});
});

