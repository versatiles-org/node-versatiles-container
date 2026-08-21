import https from 'https';
import http from 'http';
import type { IncomingMessage, Agent } from 'http';
import type { Reader } from './interfaces.js';

const DEFAULT_TIMEOUT = 10000;

/**
 * Defines the structure for client and agent information specific to HTTP and HTTPS protocols.
 */
interface ClientInfo {
	/** HTTP or HTTPS client module. */
	client: typeof http | typeof https;

	/**
	 * Creates a fresh connection agent with keep-alive enabled. Each reader owns its
	 * own agent rather than sharing a module-level one, so that closing a reader can
	 * release exactly the sockets that reader pooled, without affecting other readers.
	 */
	createAgent: () => Agent;
}

/**
 * A collection mapping protocol names to their respective `ClientInfo`.
 */
const clients: Record<string, ClientInfo> = {
	https: { client: https, createAgent: (): Agent => new https.Agent({ keepAlive: true }) },
	http: { client: http, createAgent: (): Agent => new http.Agent({ keepAlive: true }) },
};

/**
 * Creates a function capable of reading data from a specified URL, which can be used
 * to read data chunks in an HTTP GET request. This is particularly useful for
 * operations such as streaming or handling large data in segments.
 *
 * The returned reader keeps HTTP connections alive between reads, which matters because
 * reading a container issues many small range requests. Call its `close` method when done
 * to release those pooled sockets.
 *
 * @param url - The URL from which data will be read.
 * @param timeout - Idle timeout in milliseconds applied both while waiting for the
 *   response headers and between body chunks. Defaults to {@link DEFAULT_TIMEOUT}.
 * @returns A `Reader` function that asynchronously reads a specified chunk of data from the URL.
 */
export default function getHTTPReader(url: string, timeout: number = DEFAULT_TIMEOUT): Reader {
	const protocol = new URL(url).protocol.slice(0, -1);
	const clientInfo = clients[protocol];
	if (clientInfo == null) {
		throw new Error(`Unsupported protocol: ${protocol}`);
	}

	const { client, createAgent } = clientInfo;
	const agent = createAgent();

	/**
	 * Asynchronously reads a data chunk from the provided URL based on the specified range.
	 *
	 * @param position - The starting byte position of the data chunk to read.
	 * @param length - The number of bytes to read from the starting position.
	 * @returns A promise that resolves with a `Buffer` containing the data chunk.
	 *          If the request fails or the server responds with a non-successful status code,
	 *          the promise is rejected with an error.
	 */
	const read: Reader = async function read(position: number, length: number): Promise<Buffer> {
		if (position < 0) {
			throw new RangeError(
				`Invalid read position: ${position}. The read position must be a non-negative integer.`,
			);
		}
		if (length < 0) {
			throw new RangeError(
				`Invalid read length: ${length}. The read length must be a non-negative integer.`,
			);
		}

		const headers = {
			'user-agent':
				'Mozilla/5.0 (compatible; versatiles; +https://www.npmjs.com/package/@versatiles/container)',
			range: `bytes=${position}-${position + length - 1}`,
		};

		/**
		 * Performs the HTTP request and retrieves the response.
		 * @type {IncomingMessage}
		 */
		const message: IncomingMessage = await new Promise((resolve, reject) => {
			const watchdog = setTimeout(() => {
				req.destroy();
				reject(new Error('Request timed out'));
			}, timeout);

			const req = client
				.request(url, {
					method: 'GET',
					agent,
					headers,
					timeout,
				})
				.on('response', (response) => {
					clearTimeout(watchdog);
					resolve(response);
				})
				.on('error', (err) => {
					clearTimeout(watchdog);
					req.destroy();
					reject(err);
				})
				.end();
		});

		/**
		 * Destroys the response (draining the socket / freeing the keep-alive
		 * connection) and then throws the given error. Every validation failure
		 * below must go through this so an unread response body never leaks a
		 * connection back to the keep-alive agent's pool.
		 */
		function fail(error: Error): never {
			message.destroy();
			throw error;
		}

		if (message.statusCode == null || Math.floor(message.statusCode / 100) !== 2) {
			fail(new Error(`Server responded with status code: ${message.statusCode} `));
		}

		const contentRange = message.headers['content-range'];
		if (contentRange == null)
			fail(new Error('The response header does not contain "content-range"'));

		const parts = /^bytes (\d+)-(\d+)\/(\d+)/i.exec(contentRange);
		if (parts == null) fail(new Error('"content-range" in response header is malformed'));

		// The pattern matches digits only, so these are finite numbers whenever it
		// matched; Number() of a missing group would be NaN, which fails the same checks.
		const returnedOffset = Number(parts[1]);
		const returnedLast = Number(parts[2]);
		const totalSize = Number(parts[3]);

		if (position !== returnedOffset)
			fail(
				new Error(
					`requested position (${position}) and returned offset (${returnedOffset}) must be equal`,
				),
			);

		if (position + length > totalSize) {
			fail(
				new RangeError(
					`Read range out of bounds: The requested range ends at position ${position + length}, which exceeds the file's limit of ${totalSize} bytes.`,
				),
			);
		}

		const returnedLength = returnedLast + 1 - position;
		if (length !== returnedLength) {
			fail(new Error(`Returned length (${returnedLength}) is not requested length (${length}).`));
		}

		/**
		 * Collects and concatenates response data chunks into a buffer.
		 *
		 * An idle watchdog guards the download: it aborts the request if no data
		 * chunk arrives within `timeout` ms. The timer is reset on every chunk,
		 * so a slow-but-progressing transfer is not killed, while a stalled socket is.
		 * @type {Buffer}
		 */
		const body: Buffer = await new Promise((resolve, reject) => {
			const buffers: Buffer[] = [];

			const watchdog = setTimeout(onTimeout, timeout);

			function onTimeout(): void {
				message.destroy();
				reject(new Error('Request timed out'));
			}

			message
				.on('data', (chunk: Buffer) => {
					watchdog.refresh();
					buffers.push(chunk);
				})
				.on('error', (err) => {
					clearTimeout(watchdog);
					message.destroy();
					reject(err);
				})
				.once('end', () => {
					clearTimeout(watchdog);
					resolve(Buffer.concat(buffers));
				});
		});

		return body;
	};

	/**
	 * Destroys this reader's connection agent, closing any sockets it is holding
	 * open for keep-alive. After this resolves, the reader must not be called again.
	 */
	read.close = function close(): Promise<void> {
		agent.destroy();
		return Promise.resolve();
	};

	return read;
}
