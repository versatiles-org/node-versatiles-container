const https = require('https');
const http = require('http');

const DEFAULT_TIMEOUT = 10000;

const clients = {
	https: { client: https, agent: new https.Agent({ keepAlive: true }) },
	http: { client: http, agent: new http.Agent({ keepAlive: true }) },
}

export default async function FileReader(url) {
	return async function read(position, length) {
		const response = await get({
			url,
			headers: {
				...this.requestheaders,
				"Range": `bytes=${position}-${BigInt(position) + BigInt(length) - 1n}`,
			}
		});

		if (response.statusCode !== 206) {
			throw new Error(`Server responded with ${response.statusCode}`);
		}

		return response.body;
	}
}

async function get(params) {
	let { url, headers, timeout } = params;

	headers["User-Agent"] = "Mozilla/5.0 (compatible; versatiles; +https://www.npmjs.com/package/versatiles)";

	// detect protocol
	const protocol = url.split(':')[0];
	if (!clients[protocol]) throw new Error('Unknown Protocol');

	// timeout param
	timeout = (Number.isInteger(timeout) && timeout > 0) ? timeout : DEFAULT_TIMEOUT;
	if (timeout <= 0) throw new Error('Timeout');

	let response = await new Promise((resolve, reject) => {
		let watchdog = setTimeout(() => {
			if (!request.destroyed) request.destroy();
			reject('Timeout');
		}, timeout);

		clients[protocol].client
			.request(url, {
				method: 'GET',
				agent: clients[protocol].agent,
				headers,
				timeout,
			})
			.on('response', response => {
				if (request.destroyed) return;
				clearTimeout(watchdog);
				resolve(response)
			})
			.on('error', err => {
				if (request.destroyed) return;
				clearTimeout(watchdog);
				reject(err);
			})
			.end();
	});

	// Handle non-success status codes
	if (Math.floor(response.statusCode / 100) !== 2) {
		response.destroy();
		throw new Error(`Response Status Code: ${response.statusCode}`);
	}

	return await new Promise((resolve, reject) => {
		// get buffer
		let buffers = [];
		response
			.on('data', chunk => buffers.push(chunk))
			.on('error', err => {
				response.destroy();
				reject(err)
			})
			.once('end', () => resolve({
				statusCode: response.statusCode,
				headers: response.headers,
				body: Buffer.concat(buffers)
			}));
	})
}

module.exports = get;
