import http from 'http';
import getHTTPReader from './reader_http.js';
import type { Reader } from './interfaces.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('getHTTPReader', () => {
	let server: http.Server;
	let port: number;
	let read: Reader;

	beforeAll(async () => {
		// Create a server that will send back data
		server = http.createServer((req, res) => {
			// Check for the Range header to simulate chunked data response
			const data = 'abcdefghijklmnopqrstuvwxyz';
			if (req.headers.range != null) {
				const range = req.headers.range.replace('bytes=', '').split('-');
				const start = Number(range[0]);
				const end = Number(range[1]);
				const chunk = data.substring(start, end + 1);
				res.writeHead(206, {
					'Content-Range': `bytes ${start}-${end}/${data.length}`,
					'Content-Length': chunk.length,
					'Content-Type': 'text/plain',
				});
				res.end(chunk);
			} else {
				res.writeHead(200, { 'Content-Type': 'text/plain' });
				res.end(data);
			}
		});

		// Start your server
		await new Promise((r) => server.listen(r));

		// Extract the port assigned by the OS
		const address = server.address();
		if (address == null) throw Error();
		port = typeof address === 'string' ? parseInt(address.replace(/.*:/, ''), 10) : address.port;

		// start a reader
		read = getHTTPReader(`http://localhost:${port}`);
	});

	afterAll(async () => {
		// Close the server after the tests
		await new Promise((r) => server.close(r));
	});

	it('reads a chunk of data', async () => {
		const buffer = await read(5, 7);
		expect(buffer.length).toEqual(7);
		expect(buffer.toString()).toEqual('fghijkl');
	});

	it('read 0 bytes', async () => {
		const buffer = await read(20, 0);
		expect(buffer.length).toEqual(0);
		expect(buffer.toString()).toEqual('');
	});

	it('position < 0', async () => {
		await expect(read(-1, 7)).rejects.toThrow(
			'Invalid read position: -1. The read position must be a non-negative integer.',
		);
		await expect(read(-1, 7)).rejects.toThrow(RangeError);
	});

	it('length < 0', async () => {
		await expect(read(15, -1)).rejects.toThrow(
			'Invalid read length: -1. The read length must be a non-negative integer.',
		);
		await expect(read(15, -1)).rejects.toThrow(RangeError);
	});

	it('position + length > size', async () => {
		await expect(read(23, 8)).rejects.toThrow(
			"Read range out of bounds: The requested range ends at position 31, which exceeds the file's limit of 26 bytes.",
		);
		await expect(read(23, 8)).rejects.toThrow(RangeError);
	});
});

describe('getHTTPReader body timeout', () => {
	let server: http.Server;
	let port: number;

	beforeAll(async () => {
		// Server that sends valid range headers and a partial chunk, then stalls
		// forever without ending the response, simulating a hung download.
		server = http.createServer((req, res) => {
			const data = 'abcdefghijklmnopqrstuvwxyz';
			const range = (req.headers.range ?? '').replace('bytes=', '').split('-');
			const start = Number(range[0]);
			const end = Number(range[1]);
			res.writeHead(206, {
				'Content-Range': `bytes ${start}-${end}/${data.length}`,
				'Content-Length': end - start + 1,
				'Content-Type': 'text/plain',
			});
			// send one byte, then never finish
			res.write(data.substring(start, start + 1));
		});

		await new Promise((r) => server.listen(r));
		const address = server.address();
		if (address == null) throw Error();
		port = typeof address === 'string' ? parseInt(address.replace(/.*:/, ''), 10) : address.port;
	});

	afterAll(async () => {
		await new Promise((r) => server.close(r));
	});

	it('rejects when the body stalls beyond the idle timeout', async () => {
		// short timeout so the test stays fast
		const read = getHTTPReader(`http://localhost:${port}`, 200);
		await expect(read(0, 5)).rejects.toThrow('Request timed out');
	});
});

describe('getHTTPReader error handling', () => {
	let server: http.Server;
	let read: Reader;

	beforeAll(async () => {
		// Server that ignores the Range header and always returns the full body
		// with a 200 status and no Content-Range header.
		server = http.createServer((req, res) => {
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end('abcdefghijklmnopqrstuvwxyz');
		});

		await new Promise((r) => server.listen(r));
		const address = server.address();
		if (address == null) throw Error();
		const port =
			typeof address === 'string' ? parseInt(address.replace(/.*:/, ''), 10) : address.port;
		read = getHTTPReader(`http://localhost:${port}`);
	});

	afterAll(async () => {
		await new Promise((r) => server.close(r));
	});

	it('rejects a response without "content-range"', async () => {
		await expect(read(5, 7)).rejects.toThrow(
			'The response header does not contain "content-range"',
		);
	});

	it('does not leak connections across repeated failures', async () => {
		// If the socket were left undrained, keep-alive would pin it open; each
		// read must reject promptly instead of hanging or exhausting the pool.
		for (let i = 0; i < 8; i++) {
			await expect(read(0, 5)).rejects.toThrow(
				'The response header does not contain "content-range"',
			);
		}
	});
});

describe('getHTTPReader non-2xx status', () => {
	let server: http.Server;
	let read: Reader;

	beforeAll(async () => {
		server = http.createServer((req, res) => {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('not found');
		});

		await new Promise((r) => server.listen(r));
		const address = server.address();
		if (address == null) throw Error();
		const port =
			typeof address === 'string' ? parseInt(address.replace(/.*:/, ''), 10) : address.port;
		read = getHTTPReader(`http://localhost:${port}`);
	});

	afterAll(async () => {
		await new Promise((r) => server.close(r));
	});

	it('rejects with the status code on a non-2xx response', async () => {
		await expect(read(0, 5)).rejects.toThrow('Server responded with status code: 404');
	});
});

describe('getHTTPReader close', () => {
	let server: http.Server;
	let port: number;

	beforeAll(async () => {
		server = http.createServer((req, res) => {
			const data = 'abcdefghijklmnopqrstuvwxyz';
			const range = (req.headers.range ?? '').replace('bytes=', '').split('-');
			const start = Number(range[0]);
			const end = Number(range[1]);
			const chunk = data.substring(start, end + 1);
			res.writeHead(206, {
				'Content-Range': `bytes ${start}-${end}/${data.length}`,
				'Content-Length': chunk.length,
			});
			res.end(chunk);
		});

		await new Promise((r) => server.listen(r));
		const address = server.address();
		if (address == null) throw Error();
		port = typeof address === 'string' ? parseInt(address.replace(/.*:/, ''), 10) : address.port;
	});

	afterAll(async () => {
		await new Promise((r) => server.close(r));
	});

	/** Number of sockets the test server currently has open. */
	async function connectionCount(): Promise<number> {
		return new Promise((resolve, reject) => {
			server.getConnections((err, count) => (err ? reject(err) : resolve(count)));
		});
	}

	it('exposes a close method', () => {
		const read = getHTTPReader(`http://localhost:${port}`);
		expect(typeof read.close).toBe('function');
	});

	it('releases pooled keep-alive connections', async () => {
		const read = getHTTPReader(`http://localhost:${port}`);
		expect(await read(0, 5)).toHaveLength(5);

		// the agent keeps the socket around for the next range request
		expect(await connectionCount()).toBe(1);

		await read.close?.();

		// the socket teardown is asynchronous, so give it a moment to settle
		for (let i = 0; i < 100 && (await connectionCount()) > 0; i++) {
			await new Promise((r) => setTimeout(r, 10));
		}
		expect(await connectionCount()).toBe(0);
	});

	it('can be closed twice', async () => {
		const read = getHTTPReader(`http://localhost:${port}`);
		await read(0, 5);
		await read.close?.();
		await expect(read.close?.()).resolves.toBeUndefined();
	});
});
