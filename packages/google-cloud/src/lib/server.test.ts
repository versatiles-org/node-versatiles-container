/* eslint-disable @typescript-eslint/require-await */

import type { Bucket, File, FileMetadata } from '@google-cloud/storage';
import Request from 'supertest';
import express from 'express';
import { startServer } from './server.js';
import { jest } from '@jest/globals';
import { Readable } from 'stream';
import { openSync, readFileSync, readSync } from 'fs';
import type Test from 'supertest/lib/test.js';
import { resolve } from 'path';


jest.spyOn(console, 'log').mockReturnValue();
jest.mock('express', () => express); // Mock express
jest.mock('@google-cloud/storage'); // Mock Google Cloud Storage

const basePath = new URL('../../../../', import.meta.url).pathname;

interface MockedServer {
	get: (url: string) => Promise<Test>;
	close: () => Promise<void>;
}

interface MockedServerOptions {
	bucket?: string;
	localDirectory?: string;
	port?: number;
}

async function getMockedServer(opt?: MockedServerOptions): Promise<MockedServer> {
	opt ??= {};
	opt.port ??= 8089;

	let bucket: Bucket | string;

	if (opt.bucket != null) {
		({ bucket } = opt);
	} else {
		const fd = openSync(resolve(basePath, 'testdata/island.versatiles'), 'r');

		const files = new Map<string, { meta: FileMetadata; content: (options?: { start: number; end: number }) => Buffer }>([
			['static/file', { meta: {}, content: (): Buffer => Buffer.from('static file') }],
			['geodata/test.versatiles', {
				meta: {}, content: (range?: { start: number; end: number }): Buffer => {
					if (!range) throw Error();
					const { start, end } = range;
					const length = end - start + 1;
					const buffer = Buffer.allocUnsafe(length);
					readSync(fd, buffer, { position: start, length });
					return buffer;
				},
			}],
		]);

		bucket = {
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
	}

	const server = await startServer({
		baseUrl: 'http://localhost:' + opt.port,
		bucket,
		bucketPrefix: '',
		fastRecompression: false,
		verbose: false,
		localDirectory: opt.localDirectory,
		port: opt.port,
	});

	if (server == null) throw Error();

	const request = Request(server);

	return {
		get: async (url: string): Promise<Test> => {
			return request.get(url);
		},

		close: async (): Promise<void> => {
			return new Promise(res => server.close(() => {
				res();
			}));
		},
	};
}



describe('Server Tests', () => {

	describe('simple server tests', () => {
		let server: MockedServer;

		beforeAll(async () => {
			server = await getMockedServer();
		});

		afterAll(async () => {
			await server.close();
		});

		test('health check endpoint', async () => {
			const response = await server.get('/healthcheck');
			expect(response.status).toBe(200);
			expect(response.text).toBe('ok');
		});

		test('serve static file', async () => {
			const response = await server.get('/static/file');
			expect(response.status).toBe(200);
			expect(response.text).toBe('static file');
		});

		test('serve versatiles meta', async () => {
			const response = await server.get('/geodata/test.versatiles?meta.json');
			expect(response.status).toBe(200);
			expect(response.text).toMatch(/^{"vector_layers"/);
		});

		test('serve versatiles style', async () => {
			const response = await server.get('/geodata/test.versatiles?style.json');
			expect(response.status).toBe(200);
			expect(response.text).toMatch(/^{"version":8/);
		});

		test('serve versatiles preview', async () => {
			const response = await server.get('/geodata/test.versatiles?preview');
			expect(response.status).toBe(200);
			expect(response.text).toMatch(/^<!DOCTYPE html>/);
		});

		test('serve versatiles tile', async () => {
			const response = await server.get('/geodata/test.versatiles?tiles/14/3740/4505');
			expect(response.status).toBe(200);
			expect(response.text).toContain('water_lines');
		});

		test('handle missing versatiles tile', async () => {
			const response = await server.get('/geodata/test.versatiles?tiles/10/0/0');
			expect(response.status).toBe(404);
			expect(response.text).toBe('map tile {x:0, y:0, z:10} not found');
		});

		test('handle missing static file', async () => {
			const response = await server.get('/static/missing/file');
			expect(response.status).toBe(404);
			expect(response.text).toBe('file "static/missing/file" not found');
		});

		test('handle wrong versatiles request', async () => {
			const response = await server.get('/geodata/test.versatiles?everest');
			expect(response.status).toBe(400);
			expect(response.text).toBe('get parameter must be "meta.json", "style.json", or "tile/{z}/{x}/{y}"');
		});
	});

	describe('local directory mode', () => {
		let server: MockedServer;

		beforeAll(async () => {
			server = await getMockedServer({ bucket: 'test-bucket', localDirectory: basePath });
		});

		afterAll(async () => {
			await server.close();
		});

		test('serve static file', async () => {
			const response = await server.get('/README.md');
			expect(response.status).toBe(200);
			expect(response.text).toBe(readFileSync(resolve(basePath, 'README.md'), 'utf8'));
		});

		test('handle missing static file', async () => {
			const response = await server.get('/static/file');
			expect(response.status).toBe(404);
			expect(response.text).toBe('file "static/file" not found');
		});

		test('serve versatiles meta', async () => {
			const response = await server.get('/testdata/island.versatiles?meta.json');
			expect(response.status).toBe(200);
			expect(response.text).toMatch(/^{"vector_layers"/);
		});

		test('serve versatiles style', async () => {
			const response = await server.get('/testdata/island.versatiles?style.json');
			expect(response.status).toBe(200);
			expect(response.text).toMatch(/^{"version":8/);
		});

		test('serve versatiles preview', async () => {
			const response = await server.get('/testdata/island.versatiles?preview');
			expect(response.status).toBe(200);
			expect(response.text).toMatch(/^<!DOCTYPE html>/);
		});
	});
});