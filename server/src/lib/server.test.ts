/* eslint-disable @typescript-eslint/naming-convention */
import { readFileSync } from 'fs';
import { Server } from './server.js';
import { jest } from '@jest/globals';

describe('Server', () => {
	let server: Server;
	const port = 8080; // Ensure this port is free on the machine running the test
	const baseUrl = `http://localhost:${port}`;
	const indexContent = readFileSync('./static/index.html', 'utf8');

	beforeAll(async () => {
		const log = jest.spyOn(console, 'log').mockReturnValue();
		server = new Server('../test/island.versatiles', { port, compress: true });
		await server.start();
		expect(log).toHaveBeenCalledWith('listening on port ' + port);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await server.stop();
	});

	test('Server should serve static content', async () => {
		const response = await fetch(`${baseUrl}/index.html`, {
			headers: { 'Accept-Encoding': 'deflate' },
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
		expect(response.headers.get('content-encoding')).toBe(null);

		expect(await response.text()).toBe(indexContent);
	});

	test('Server should serve Brotli compressed content', async () => {
		const response = await fetch(`${baseUrl}/index.html`, {
			headers: { 'Accept-Encoding': 'br' },
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
		expect(response.headers.get('content-encoding')).toBe('br');

		expect(await response.text()).toBe(indexContent);
	});

	test('Server should serve GZip compressed content', async () => {
		const response = await fetch(`${baseUrl}/index.html`, {
			headers: { 'Accept-Encoding': 'gzip' },
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
		expect(response.headers.get('content-encoding')).toBe('gzip');

		expect(await response.text()).toBe(indexContent);
	});

	test('Server should respond with 404 for unknown content', async () => {
		const error = jest.spyOn(console, 'error').mockReturnValue();
		const response = await fetch(`${baseUrl}/nonexistent.file`);
		expect(response.status).toBe(404);
		expect(error).toHaveBeenCalledWith('file not found: /nonexistent.file');
	});
});
