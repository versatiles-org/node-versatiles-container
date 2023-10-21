import https from 'https';
import http from 'http';
import { IncomingMessage, Agent } from 'http';
import { Reader } from '../index';

const DEFAULT_TIMEOUT = 10000;

interface ClientInfo {
	client: typeof https | typeof http;
	agent: Agent;
}

const clients: { [key: string]: ClientInfo } = {
	https: { client: https, agent: new https.Agent({ keepAlive: true }) },
	http: { client: http, agent: new http.Agent({ keepAlive: true }) },
};

export default function getHTTPReader(url: string): Reader {
	return async function read(position: number, length: number): Promise<Buffer> {

		let headers = {
			'user-agent': 'Mozilla/5.0 (compatible; versatiles; +https://www.npmjs.com/package/versatiles)',
			'range': `bytes=${position}-${position + length - 1}`,
		}

		const protocol = new URL(url).protocol.slice(0, -1);
		if (!clients[protocol]) throw new Error('Unknown Protocol');

		let response: IncomingMessage = await new Promise((resolve, reject) => {
			let watchdog = setTimeout(() => {
				reject('Timeout');
			}, DEFAULT_TIMEOUT);

			const request = clients[protocol].client
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

		if (Math.floor(response.statusCode! / 100) !== 2) {
			response.destroy();
			throw new Error(`Response Status Code: ${response.statusCode}`);
		}

		let body: Buffer = await new Promise((resolve, reject) => {
			let buffers: Buffer[] = [];
			response
				.on('data', chunk => buffers.push(chunk))
				.on('error', err => {
					response.destroy();
					reject(err);
				})
				.once('end', () => resolve(Buffer.concat(buffers)));
		});

		return body;
	};
}
