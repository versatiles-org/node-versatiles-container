/* eslint-disable @typescript-eslint/require-await */

import type { Bucket, File, FileMetadata } from '@google-cloud/storage';
import Request from 'supertest';
import express from 'express';
import { startServer } from './server.js';
import { jest } from '@jest/globals';
import { Readable } from 'stream';
import { openSync, readSync } from 'fs';



jest.spyOn(console, 'log').mockReturnValue();
jest.mock('express', () => express); // Mock express
jest.mock('@google-cloud/storage'); // Mock Google Cloud Storage

describe('Server Tests', () => {
	const fd = openSync(new URL('../../../../testdata/island.versatiles', import.meta.url).pathname, 'r');
	const files = new Map<string, { meta: FileMetadata; content: (options?: { start: number; end: number }) => Buffer }>([
		['static/file', { meta: {}, content: (): Buffer => Buffer.from('static file') }],
		['geodata/test.versatiles', {
			meta: {}, content: (options?: { start: number; end: number }): Buffer => {
				if (!options) throw Error();
				const { start, end } = options;
				const length = end - start + 1;
				const buffer = Buffer.allocUnsafe(length);
				readSync(fd, buffer, { position: start, length });
				return buffer;
			},
		}],
	]);
	const baseUrl = 'http://localhost:3000';
	const bucket = {
		file: (path: string): File => {
			return {
				exists: async (): Promise<[boolean]> => [files.has(path)],
				getMetadata: async (): Promise<[FileMetadata]> => {
					const file = files.get(path);
					if (file == null) throw Error();
					return [file.meta];
				},
				createReadStream: (options?: { start: number; end: number }): Readable => {
					const file = files.get(path);
					if (file == null) throw Error();
					return Readable.from(file.content(options));
				},
			} as unknown as File;
		},
	} as unknown as Bucket;
	const serverTmp = startServer({
		baseUrl,
		bucket,
		bucketPrefix: '',
		fastRecompression: false,
		port: 3000,
		verbose: false,
	});
	if (serverTmp == null) throw Error();
	const server = serverTmp;
	const request = Request(server);

	afterAll(() => {
		server.close();
	});

	test('health check endpoint', async () => {
		const response = await request.get('/healthcheck');
		expect(response.status).toBe(200);
		expect(response.text).toBe('ok');
	});

	test('serve static file', async () => {
		const response = await request.get('/static/file');
		expect(response.status).toBe(200);
		expect(response.text).toBe('static file');
	});

	test('serve versatiles preview', async () => {
		const response = await request.get('/geodata/test.versatiles?preview');
		expect(response.status).toBe(200);
		expect(response.text.startsWith('<!DOCTYPE html>')).toBeTruthy();
	});

	test('serve versatiles tile', async () => {
		const response = await request.get('/geodata/test.versatiles?tiles/14/3740/4505');
		expect(response.status).toBe(200);
		expect(response.text).toContain('water_lines');
	});

	test('handle missing versatiles tile', async () => {
		const response = await request.get('/geodata/test.versatiles?tiles/10/0/0');
		expect(response.status).toBe(404);
		expect(response.text).toBe('map tile {x:0, y:0, z:10} not found');
	});

	test('handle missing static file', async () => {
		const response = await request.get('/static/missing/file');
		expect(response.status).toBe(404);
		expect(response.text).toBe('file "static/missing/file" not found');
	});

	test('handle wrong versatiles request', async () => {
		const response = await request.get('/geodata/test.versatiles?everest');
		expect(response.status).toBe(400);
		expect(response.text).toBe('get parameter must be "meta.json", "style.json", or "tile/{z}/{x}/{y}"');
	});
});
