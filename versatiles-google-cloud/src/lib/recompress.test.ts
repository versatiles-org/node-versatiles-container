/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention */

import type { Response } from 'express';
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';
import { recompress, bufferStream } from './recompress.js';
import { Readable } from 'node:stream';
import { jest } from '@jest/globals';

describe('recompress', () => {
	function getMockResponse(): Response {
		return {
			emit: jest.fn().mockReturnThis(),
			end: jest.fn().mockReturnThis(),
			on: jest.fn().mockReturnThis(),
			once: jest.fn().mockReturnThis(),
			pipe: jest.fn().mockReturnThis(),
			set: jest.fn().mockReturnThis(),
			status: jest.fn().mockReturnThis(),
			// Other necessary mock methods
		} as unknown as Response;
	}

	it('should handle different types of media without recompression', async () => {
		const headersRequest: IncomingHttpHeaders = { 'accept-encoding': 'gzip' };
		const headersResponse: OutgoingHttpHeaders = { 'content-type': 'audio/mpeg' };
		const body = Buffer.from('test data');
		const mockResponse = getMockResponse();
		await recompress(headersRequest, headersResponse, body, mockResponse, false);

		expect(headersResponse).toStrictEqual({
			'content-length': 9,
			'content-type': 'audio/mpeg',
			'vary': 'accept-encoding',
		});
		expect(mockResponse.set).toHaveBeenCalledWith(headersResponse);
	});

	it('should handle fast compression setting', async () => {
		const headersRequest: IncomingHttpHeaders = { 'accept-encoding': 'gzip' };
		const headersResponse: OutgoingHttpHeaders = { 'content-type': 'text/plain' };
		const body = Buffer.from('test data');
		const mockResponse = getMockResponse();
		await recompress(headersRequest, headersResponse, body, mockResponse, true);

		expect(headersResponse).toStrictEqual({
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
			'content-length': 9,
		});
		expect(mockResponse.set).toHaveBeenCalledWith(headersResponse);
	});

	it('should find the best encoding based on headers', async () => {
		const headersRequest: IncomingHttpHeaders = { 'accept-encoding': 'gzip, deflate, br' };
		const headersResponse: OutgoingHttpHeaders = { 'content-type': 'text/plain' };
		const body = Buffer.from('test data');
		const mockResponse = getMockResponse();
		await recompress(headersRequest, headersResponse, body, mockResponse, false);

		expect(headersResponse).toStrictEqual({
			'content-encoding': 'br',
			'content-length': 13,
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		});
		expect(mockResponse.set).toHaveBeenCalledWith(headersResponse);
	});

	it('should properly handle stream and buffer modes', async () => {
		const headersRequest: IncomingHttpHeaders = {};
		const headersResponse: OutgoingHttpHeaders = { 'content-type': 'text/plain' };
		const buffer = Buffer.allocUnsafe(11e6);
		const body = Readable.from(buffer);
		const mockResponse = getMockResponse();
		await recompress(headersRequest, headersResponse, body, mockResponse, false);

		expect(headersResponse).toStrictEqual({
			'transfer-encoding': 'chunked',
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		});
		expect(mockResponse.end).toHaveBeenCalled();
	});
});

describe('bufferStream', () => {
	const maxBufferSize = 10 * 1024 * 1024;

	it('should buffer small streams correctly', async () => {
		const stream = Readable.from('small data');
		const handleBuffer = jest.fn();
		const handleStream = jest.fn();

		await bufferStream(stream, handleBuffer, handleStream);

		// Assumption: handleBuffer should be called for small data
		expect(handleBuffer).toHaveBeenCalled();
		expect(handleStream).not.toHaveBeenCalled();
	});

	it('should switch to stream mode for large data', async () => {
		const largeData = 'x'.repeat(maxBufferSize + 1);
		const stream = Readable.from(largeData);
		const handleBuffer = jest.fn();
		const handleStream = jest.fn();

		await bufferStream(stream, handleBuffer, handleStream);

		// Assumption: handleStream should be called for large data
		expect(handleBuffer).not.toHaveBeenCalled();
		expect(handleStream).toHaveBeenCalled();
	});
});
