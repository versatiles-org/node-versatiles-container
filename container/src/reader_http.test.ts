/* eslint-disable @typescript-eslint/naming-convention */
import http from 'http';
import getHTTPReader from './reader_http.js';

// eslint-disable-next-line @typescript-eslint/no-misused-promises
describe('getHTTPReader', () => {
	let server: http.Server;
	let port: number;

	beforeAll(done => {
		// Create a server that will send back data
		server = http.createServer((req, res) => {
			// Check for the Range header to simulate chunked data response
			if (req.headers.range != null) {
				const range = req.headers.range.replace('bytes=', '').split('-');
				const start = parseInt(range[0], 10);
				const end = parseInt(range[1], 10);
				const data = 'Hello World!';
				const chunk = data.substring(start, end + 1);
				res.writeHead(206, {
					'Content-Range': `bytes ${start}-${end}/${data.length}`,
					'Content-Length': chunk.length,
					'Content-Type': 'text/plain',
				});
				res.end(chunk);
			} else {
				res.writeHead(200, { 'Content-Type': 'text/plain' });
				res.end('Hello World!');
			}
		});

		// Start your server
		server.listen(() => {
			// Extract the port assigned by the OS
			const address = server.address();
			if (address == null) throw Error();
			port = typeof address === 'string' ? parseInt(address.replace(/.*:/, ''), 10) : address.port;
			done();
		});
	});

	afterAll(done => {
		// Close the server after the tests
		server.close(() => {
			done();
		});
	});

	it('should read data from a server', async () => {
		const url = `http://localhost:${port}`;
		const reader = getHTTPReader(url);
		const startPosition = 0;
		const length = 5;
		const expectedContent = 'Hello';

		const buffer = await reader(startPosition, length);

		expect(buffer.toString()).toEqual(expectedContent);
	});
});
