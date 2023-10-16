const https = require('https');
const http = require('http');

const DEFAULT_TIMEOUT = 10000;
const MAX_FOLLOW_LIMIT = 10;

const clients = {
	https: { client: https, agent: new https.Agent({ keepAlive: true }) },
	http: { client: http, agent: new http.Agent({ keepAlive: true }) },
};

const createRequest = (protocol, url, headers, timeout) => {
	return clients[protocol].client.request(url, {
		method: 'GET',
		agent: clients[protocol].agent,
		headers: headers || {},
		timeout,
	});
};

async function get(params) {
	const { url, headers, timeout, follow } = params;

	// detect protocol
	const protocol = url.split(':')[0];
	if (!clients[protocol]) throw new Error('Unknown Protocol');

	// timeout param
	timeout = (Number.isInteger(timeout) && timeout > 0) ? timeout : DEFAULT_TIMEOUT;
	if (timeout <= 0) throw new Error('Timeout');

	// set up watchdog


	// keep time to deduct from timeout in case of redirect
	const startTime = Date.now();


	function _get(protocol, url, headers, timeout) {
		return new Promise((resolve, reject) => {
			let watchdog = setTimeout(() => {
				if (!request.destroyed) request.destroy();
				reject('Timeout');
			}, timeout);
			let request = createRequest(protocol, url, headers, timeout);
			request
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
		})
	}

	let response = await _get(protocol, url, headers, timeout);

	// Handle redirects
	if (response.headers.location) {
		const maxFollow = follow === true ? MAX_FOLLOW_LIMIT : follow;
		if (!maxFollow) {
			response.destroy();
			throw new Error('Too many Redirects');
		}

		// try parse location
		let followURL = new URL(response.headers.location, url).href;

		// detect loops
		if (followURL === url) {
			response.destroy();
			throw new Error('Redirect Loop');
		}

		// recurse
		const elapsedTime = Date.now() - startTime;
		return await get({
			...params,
			url: followURL,
			follow: maxFollow - 1,
			timeout: timeout - elapsedTime
		});
	}

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
