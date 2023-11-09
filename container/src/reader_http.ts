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

	/** Connection agent with the keep-alive setting for persistent connections. */
	agent: Agent;
}

/**
 * A collection mapping protocol names to their respective `ClientInfo`.
 */
const clients: Record<string, ClientInfo> = {
	https: { client: https, agent: new https.Agent({ keepAlive: true }) },
	http: { client: http, agent: new http.Agent({ keepAlive: true }) },
};

/**
 * Creates a function capable of reading data from a specified URL, which can be used
 * to read data chunks in an HTTP GET request. This is particularly useful for
 * operations such as streaming or handling large data in segments.
 *
 * @param url - The URL from which data will be read.
 * @returns A `Reader` function that asynchronously reads a specified chunk of data from the URL.
 */
export default function getHTTPReader(url: string): Reader {

	/**
	 * Asynchronously reads a data chunk from the provided URL based on the specified range.
	 *
	 * @param position - The starting byte position of the data chunk to read.
	 * @param length - The number of bytes to read from the starting position.
	 * @returns A promise that resolves with a `Buffer` containing the data chunk.
	 *          If the request fails or the server responds with a non-successful status code,
	 *          the promise is rejected with an error.
	 */
	return async function read(position: number, length: number): Promise<Buffer> {
		if (position < 0) {
			throw new RangeError(`Invalid read position: ${position}. The read position must be a non-negative integer.`);
		}
		if (length < 0) {
			throw new RangeError(`Invalid read length: ${length}. The read length must be a non-negative integer.`);
		}

		const headers = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'user-agent': 'Mozilla/5.0 (compatible; versatiles; +https://www.npmjs.com/package/versatiles)',
			'range': `bytes=${position}-${position + length - 1}`,
		};

		const protocol = new URL(url).protocol.slice(0, -1);
		if (!(protocol in clients)) {
			throw new Error(`Unsupported protocol: ${protocol}`);
		}

		/**
		 * Performs the HTTP request and retrieves the response.
		 * @type {IncomingMessage}
		 */
		const message: IncomingMessage = await new Promise((resolve, reject) => {
			const watchdog = setTimeout(() => {
				reject(new Error('Request timed out'));
			}, DEFAULT_TIMEOUT);

			clients[protocol].client
				.request(url, {
					method: 'GET',
					agent: clients[protocol].agent,
					headers,
					timeout: DEFAULT_TIMEOUT,
				})
				.on('response', response => {
					clearTimeout(watchdog);
					resolve(response);
				})
				.on('error', err => {
					clearTimeout(watchdog);
					reject(err);
				})
				.end();
		});

		const contentRange = message.headers['content-range'];
		if (contentRange == null) throw Error('The response header does not contain "content-range"');

		const parts = /^bytes (\d+)\-(\d+)\/(\d+)/i.exec(contentRange);
		if (parts == null) throw Error('"content-range" in response header is malformed');

		if (position !== parseInt(parts[1], 10)) throw Error(`requestet position (${position}) and returned offset (${parts[1]}) must be equal`);

		if (position + length > parseInt(parts[3], 10)) {
			throw new RangeError(`Read range out of bounds: The requested range ends at position ${position + length}, which exceeds the file's limit of ${parts[3]} bytes.`);
		}

		const returnedLength = parseInt(parts[2], 10) + 1 - position;
		if (length !== returnedLength) {
			throw new Error(`Returned length (${returnedLength}) is not requested length (${length}).`);
		}

		if ((message.statusCode == null) || Math.floor(message.statusCode / 100) !== 2) {
			message.destroy();
			throw new Error(`Server responded with status code: ${message.statusCode} `);
		}

		/**
		 * Collects and concatenates response data chunks into a buffer.
		 * @type {Buffer}
		 */
		const body: Buffer = await new Promise((resolve, reject) => {
			const buffers: Buffer[] = [];
			message
				.on('data', (chunk: Buffer) => buffers.push(chunk))
				.on('error', err => {
					message.destroy();
					reject(err);
				})
				.once('end', () => {
					resolve(Buffer.concat(buffers));
				});
		});

		return body;
	};
}
