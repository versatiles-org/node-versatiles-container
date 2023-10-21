import https from 'https';
import http from 'http';
import { IncomingMessage, Agent } from 'http';

const DEFAULT_TIMEOUT = 10000;

interface ClientInfo {
	client: typeof https | typeof http;
	agent: Agent;
}

interface GetParams {
	url: string;
	headers: { [key: string]: string };
	timeout?: number;
}

interface GetResponse {
	statusCode: number;
	headers: { [key: string]: string };
	body: Buffer;
}

const clients: { [key: string]: ClientInfo } = {
	https: { client: https, agent: new https.Agent({ keepAlive: true }) },
	http: { client: http, agent: new http.Agent({ keepAlive: true }) },
};

export default function getHTTPReader(url: string): (position: number, length: number) => Promise<Buffer> {
	return async function read(position: number, length: number): Promise<Buffer> {
		const response = await get({
			url,
			headers: {
				...this.requestheaders,
				"Range": `bytes=${position}-${position + length - 1}`,
			},
		});

		if (response.statusCode !== 206) {
			throw new Error(`Server responded with ${response.statusCode}`);
		}

		return response.body;
	};
}

async function get(params: GetParams): Promise<GetResponse> {
	let { url, headers, timeout } = params;

	headers["User-Agent"] = "Mozilla/5.0 (compatible; versatiles; +https://www.npmjs.com/package/versatiles)";

	const protocol = new URL(url).protocol.slice(0, -1);
	if (!clients[protocol]) throw new Error('Unknown Protocol');

	timeout = (Number.isInteger(timeout) && timeout > 0) ? timeout : DEFAULT_TIMEOUT;
	if (timeout <= 0) throw new Error('Timeout');

	let response: IncomingMessage = await new Promise((resolve, reject) => {
		let watchdog = setTimeout(() => {
			reject('Timeout');
		}, timeout);

		const request = clients[protocol].client
			.request(url, {
				method: 'GET',
				agent: clients[protocol].agent,
				headers,
				timeout,
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

	return await new Promise((resolve, reject) => {
		let buffers: Buffer[] = [];
		response
			.on('data', chunk => buffers.push(chunk))
			.on('error', err => {
				response.destroy();
				reject(err);
			})
			.once('end', () => resolve({
				statusCode: response.statusCode!,
				headers: response.headers,
				body: Buffer.concat(buffers),
			}));
	});
}
