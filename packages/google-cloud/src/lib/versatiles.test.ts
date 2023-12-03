/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention */
import type { File } from '@google-cloud/storage';
import type { Response } from 'express';
import { serveVersatiles } from './versatiles.js';
import { Responder, type ResponderInterface } from './responder.js';
import { jest } from '@jest/globals';
import { Readable } from 'stream';
import { openSync, readSync } from 'fs';
import { createHash } from 'crypto';

jest.mock('@google-cloud/storage');
jest.mock('@versatiles/container');
jest.mock('node:fs/promises');
jest.mock('@versatiles/style');

describe('serveVersatiles', () => {
	const fd = openSync(new URL('../../../../testdata/island.versatiles', import.meta.url).pathname, 'r');
	let mockFile: File;
	let mockResponder: ResponderInterface;

	beforeEach(() => {
		mockFile = {
			name: 'osm.versatiles',
			createReadStream: (opt: { start: number; end: number }): Readable => {
				const { start, end } = opt;
				const length = end - start + 1;
				const buffer = Buffer.allocUnsafe(length);
				readSync(fd, buffer, { position: start, length });
				return Readable.from(buffer);
			},
		} as unknown as File;

		mockResponder = Responder({
			fastRecompression: true,
			requestHeaders: {
				'accept-encoding': 'gzip, br',
			},
			response: {
				end: jest.fn().mockReturnThis(),
				set: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				status: jest.fn().mockReturnThis(),
				type: jest.fn().mockReturnThis(),
			} as unknown as Response,
			requestNo: 5,
			verbose: false,
		});
	});

	test('should handle preview request correctly', async () => {
		await serveVersatiles(mockFile, 'https://example.com/osm.versatiles', 'preview', mockResponder);

		checkResponse(200, '<!DOCTYPE html>', {
			'cache-control': 'max-age=86400',
			'content-length': '763',
			'content-type': 'text/html',
			'vary': 'accept-encoding',
		});
	});

	test('should handle meta.json request correctly', async () => {
		await serveVersatiles(mockFile, 'https://example.com/osm.versatiles', 'meta.json', mockResponder);

		checkResponse(200, '30fd3e0d66ef5a6e', {
			'cache-control': 'max-age=86400',
			'content-length': '4329',
			'content-type': 'application/json',
			'vary': 'accept-encoding',
		});
	});

	test('should handle style.json request correctly', async () => {
		await serveVersatiles(mockFile, 'https://example.com/osm.versatiles', 'style.json', mockResponder);

		checkResponse(200, ' ', {
			'cache-control': 'max-age=86400',
			'content-length': '81970',
			'content-type': 'application/json',
			'vary': 'accept-encoding',
		});
	});

	test('should handle tile data request correctly', async () => {
		await serveVersatiles(mockFile, 'https://example.com/osm.versatiles', 'tiles/13/1870/2252', mockResponder);

		checkResponse(200, '91b332abad238eae', {
			'cache-control': 'max-age=86400',
			'content-encoding': 'br',
			'content-length': '743',
			'content-type': 'application/x-protobuf',
			'vary': 'accept-encoding',
		});
	});

	test('should handle missing tiles correctly', async () => {
		await serveVersatiles(mockFile, 'https://example.com/osm.versatiles', 'tiles/13/2870/2252', mockResponder);

		checkError(404, 'map tile {x:2870, y:2252, z:13} not found');
	});

	test('should handle wrong requests correctly', async () => {
		await serveVersatiles(mockFile, 'https://example.com/osm.versatiles', 'bathtub', mockResponder);

		checkError(400, 'get parameter must be "meta.json", "style.json", or "tile/{z}/{x}/{y}"');
	});

	function checkResponse(status: number, content: string, headers: unknown): void {
		const response: Response = mockResponder.response;

		expect(response.status).toHaveBeenCalledTimes(1);
		expect(response.status).toHaveBeenCalledWith(status);

		expect(response.set).toHaveBeenCalledTimes(1);
		expect(response.set).toHaveBeenCalledWith(headers);

		expect(response.end).toHaveBeenCalledTimes(1);
		const mockFunction = response.end as unknown as jest.MockedFunction<(chunk: Buffer) => Response>;
		const buffer = mockFunction.mock.calls.pop();
		if (buffer == null) throw Error();
		if (content.length === 16) {
			const hasher = createHash('sha256');
			hasher.update(buffer[0]);
			expect(hasher.digest('hex').slice(0, 16)).toBe(content);
		} else {
			expect(buffer.toString()).toContain(content);
		}
	}

	function checkError(status: number, message: string): void {
		const response: Response = mockResponder.response;

		expect(response.status).toHaveBeenCalledTimes(1);
		expect(response.status).toHaveBeenCalledWith(status);

		expect(response.type).toHaveBeenCalledTimes(1);
		expect(response.type).toHaveBeenCalledWith('text');

		expect(response.send).toHaveBeenCalledTimes(1);
		expect(response.send).toHaveBeenCalledWith(message);
	}
});

