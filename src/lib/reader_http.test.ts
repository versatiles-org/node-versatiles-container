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

describe('getHTTPReader protocol handling', () => {
	it('rejects an unsupported protocol', () => {
		expect(() => getHTTPReader('ftp://example.org/file')).toThrow('Unsupported protocol: ftp');
	});

	it('accepts https URLs', async () => {
		// no request is made here; this covers building the https keep-alive agent
		const read = getHTTPReader('https://example.org/file');
		expect(typeof read.close).toBe('function');
		await read.close?.();
	});
});

describe('getHTTPReader malformed range responses', () => {
	/** Starts a server with the given handler and returns its port plus a stop function. */
	async function startServer(
		handler: http.RequestListener,
	): Promise<{ port: number; stop: () => Promise<void> }> {
		const server = http.createServer(handler);
		await new Promise((r) => server.listen(r));
		const address = server.address();
		if (address == null) throw Error();
		const port =
			typeof address === 'string' ? parseInt(address.replace(/.*:/, ''), 10) : address.port;
		return {
			port,
			stop: async (): Promise<void> => {
				await new Promise((r) => server.close(r));
			},
		};
	}

	it('rejects a malformed content-range header', async () => {
		const { port, stop } = await startServer((_, res) => {
			res.writeHead(206, { 'Content-Range': 'bytes nonsense', 'Content-Length': 5 });
			res.end('abcde');
		});
		const read = getHTTPReader(`http://localhost:${port}`);
		await expect(read(0, 5)).rejects.toThrow('"content-range" in response header is malformed');
		await read.close?.();
		await stop();
	});

	it('rejects when the server returns a different offset', async () => {
		const { port, stop } = await startServer((_, res) => {
			res.writeHead(206, { 'Content-Range': 'bytes 5-9/100', 'Content-Length': 5 });
			res.end('fghij');
		});
		const read = getHTTPReader(`http://localhost:${port}`);
		await expect(read(0, 5)).rejects.toThrow(
			'requested position (0) and returned offset (5) must be equal',
		);
		await read.close?.();
		await stop();
	});

	it('rejects when the server returns a different length', async () => {
		const { port, stop } = await startServer((_, res) => {
			res.writeHead(206, { 'Content-Range': 'bytes 0-3/100', 'Content-Length': 4 });
			res.end('abcd');
		});
		const read = getHTTPReader(`http://localhost:${port}`);
		await expect(read(0, 5)).rejects.toThrow('Returned length (4) is not requested length (5).');
		await read.close?.();
		await stop();
	});

	it('rejects when the response headers never arrive', async () => {
		// accepts the connection but never replies, so the header watchdog fires
		const { port, stop } = await startServer(() => {
			// intentionally empty
		});
		const read = getHTTPReader(`http://localhost:${port}`, 200);
		await expect(read(0, 5)).rejects.toThrow('Request timed out');
		await read.close?.();
		await stop();
	});

	it('rejects when the connection cannot be established', async () => {
		// take a port, then release it so nothing is listening there.
		// 127.0.0.1 rather than localhost: the latter resolves to both IPv4 and IPv6,
		// so the failure surfaces as an AggregateError with an empty message.
		const { port, stop } = await startServer((_, res) => res.end());
		await stop();
		const read = getHTTPReader(`http://127.0.0.1:${port}`);
		await expect(read(0, 5)).rejects.toThrow('ECONNREFUSED');
		await read.close?.();
	});

	it('rejects when the socket hangs up before the response arrives', async () => {
		const { port, stop } = await startServer((_, res) => {
			// destroyed immediately, so the client never sees the headers
			res.writeHead(206, { 'Content-Range': 'bytes 0-4/100', 'Content-Length': 5 });
			res.socket?.destroy();
		});
		const read = getHTTPReader(`http://127.0.0.1:${port}`);
		await expect(read(0, 5)).rejects.toThrow('socket hang up');
		await read.close?.();
		await stop();
	});

	it('rejects when the connection drops mid-body', async () => {
		const { port, stop } = await startServer((_, res) => {
			res.writeHead(206, { 'Content-Range': 'bytes 0-4/100', 'Content-Length': 5 });
			res.write('ab');
			// let the headers and first chunk reach the client, so the failure happens
			// while the body is streaming rather than during the request itself
			setTimeout(() => res.socket?.destroy(), 50);
		});
		const read = getHTTPReader(`http://127.0.0.1:${port}`);
		await expect(read(0, 5)).rejects.toThrow('aborted');
		await read.close?.();
		await stop();
	});
});

describe('getHTTPReader redirects', () => {
	let server: http.Server;
	let base: string;
	const requests: string[] = [];

	beforeAll(async () => {
		const data = 'abcdefghijklmnopqrstuvwxyz';
		server = http.createServer((req, res) => {
			const path = req.url ?? '';
			requests.push(path);

			function redirect(status: number, location?: string): void {
				res.writeHead(status, location == null ? {} : { Location: location });
				res.end('moved');
			}

			const hop = /^\/hop\/(\d+)$/.exec(path);
			if (path === '/short') return redirect(301, `${base}/file`);
			if (path === '/relative') return redirect(302, 'file');
			if (hop) {
				const n = Number(hop[1]);
				return redirect(307, n > 0 ? `/hop/${n - 1}` : '/file');
			}
			if (path === '/loop') return redirect(308, '/loop');
			if (path === '/ftp') return redirect(301, 'ftp://example.org/file');
			if (path === '/no-location') return redirect(301);
			if (path === '/missing') return redirect(301, '/404');
			if (path !== '/file') {
				res.writeHead(404);
				return res.end('not found');
			}

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
		if (address == null || typeof address === 'string') throw Error();
		base = `http://localhost:${address.port}`;
	});

	afterAll(async () => {
		await new Promise((r) => server.close(r));
	});

	it('follows a redirect to an absolute URL', async () => {
		const read = getHTTPReader(`${base}/short`);
		expect((await read(5, 7)).toString()).toEqual('fghijkl');
		await read.close?.();
	});

	it('follows a redirect to a relative URL', async () => {
		const read = getHTTPReader(`${base}/relative`);
		expect((await read(0, 3)).toString()).toEqual('abc');
		await read.close?.();
	});

	it('sends later reads to the final URL', async () => {
		const read = getHTTPReader(`${base}/short`);
		requests.length = 0;
		await read(0, 3);
		await read(3, 3);
		await read(6, 3);
		expect(requests).toEqual(['/short', '/file', '/file', '/file']);
		await read.close?.();
	});

	it('follows a chain of redirects up to the limit', async () => {
		const read = getHTTPReader(`${base}/hop/4`);
		expect((await read(0, 3)).toString()).toEqual('abc');
		await read.close?.();
	});

	it('rejects a chain of redirects longer than the limit', async () => {
		const read = getHTTPReader(`${base}/hop/5`);
		await expect(read(0, 3)).rejects.toThrow('Too many redirects: gave up after 5');
		await read.close?.();
	});

	it('rejects a redirect loop', async () => {
		const read = getHTTPReader(`${base}/loop`);
		await expect(read(0, 3)).rejects.toThrow('Too many redirects: gave up after 5');
		await read.close?.();
	});

	it('rejects a redirect to an unsupported protocol', async () => {
		const read = getHTTPReader(`${base}/ftp`);
		await expect(read(0, 3)).rejects.toThrow('Unsupported protocol: ftp');
		await read.close?.();
	});

	it('rejects a redirect without a location', async () => {
		const read = getHTTPReader(`${base}/no-location`);
		await expect(read(0, 3)).rejects.toThrow('Server responded with status code: 301');
		await read.close?.();
	});

	it('does not remember a redirect that ends in an error', async () => {
		const read = getHTTPReader(`${base}/missing`);
		requests.length = 0;
		await expect(read(0, 3)).rejects.toThrow('Server responded with status code: 404');
		await expect(read(0, 3)).rejects.toThrow('Server responded with status code: 404');
		expect(requests).toEqual(['/missing', '/404', '/missing', '/404']);
		await read.close?.();
	});
});
