import http from 'http';
import getHTTPReader from './reader_http.js';
import type { Reader } from './interfaces.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'path';

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
				const start = parseInt(range[0], 10);
				const end = parseInt(range[1], 10);
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
		await new Promise<void>(res => server.listen(() => {
			res();
		}));

		// Extract the port assigned by the OS
		const address = server.address();
		if (address == null) throw Error();
		port = typeof address === 'string' ? parseInt(address.replace(/.*:/, ''), 10) : address.port;

		// start a reader
		read = getHTTPReader(`http://localhost:${port}`);
	});

	afterAll(async () => {
		// Close the server after the tests
		await new Promise(r => server.close(r));
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
		await expect(read(-1, 7)).rejects.toThrow('Invalid read position: -1. The read position must be a non-negative integer.');
		await expect(read(-1, 7)).rejects.toThrow(RangeError);
	});

	it('length < 0', async () => {
		await expect(read(15, -1)).rejects.toThrow('Invalid read length: -1. The read length must be a non-negative integer.');
		await expect(read(15, -1)).rejects.toThrow(RangeError);
	});

	it('position + length > size', async () => {
		await expect(read(23, 8)).rejects.toThrow('Read range out of bounds: The requested range ends at position 31, which exceeds the file\'s limit of 26 bytes.');
		await expect(read(23, 8)).rejects.toThrow(RangeError);
	});
});
