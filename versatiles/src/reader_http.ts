import https from 'https';
import http from 'http';
import type { IncomingMessage, Agent } from 'http';
import type { Reader } from './interfaces.js';

const DEFAULT_TIMEOUT = 10000;

/**
 * Describes the client and agent info for each supported protocol.
 * @interface ClientInfo
 */
interface ClientInfo {
	client: typeof http | typeof https;
	agent: Agent;
}

/**
 * Clients for http and https protocols.
 * @const clients
 */
const clients: Record<string, ClientInfo> = {
	https: { client: https, agent: new https.Agent({ keepAlive: true }) },
	http: { client: http, agent: new http.Agent({ keepAlive: true }) },
};

/**
 * Returns an HTTP Reader function for reading chunks of data from a given URL.
 * 
 * @param {string} url - The URL to read data from.
 * @returns {Reader} A reader function for reading chunks of data.
 */
export default function getHTTPReader(url: string): Reader {
	return async function read(position: number, length: number): Promise<Buffer> {

		/**
		 * Headers to be used in the request.
		 * @type {Object}
		 */
		const headers = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'user-agent': 'Mozilla/5.0 (compatible; versatiles; +https://www.npmjs.com/package/versatiles)',
			'range': `bytes=${position}-${position + length - 1}`,
		};

		const protocol = new URL(url).protocol.slice(0, -1);
		if (!(protocol in clients)) throw new Error('Unknown Protocol');

		/**
		 * Performs the HTTP request and retrieves the response.
		 * @type {IncomingMessage}
		 */
		const message: IncomingMessage = await new Promise((resolve, reject) => {
			const watchdog = setTimeout(() => {
				reject('Timeout');
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

		if ((message.statusCode == null) || Math.floor(message.statusCode / 100) !== 2) {
			message.destroy();
			throw new Error(`Response Status Code: ${message.statusCode}`);
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
