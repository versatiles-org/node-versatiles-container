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

const get = (params, callback) => {
	const { url, headers, timeout, follow } = params;


	// promisify
	if (!callback) {
		return new Promise((resolve, reject) => {
			get(params, (err, result) => err ? reject(err) : resolve(result));
		});
	}

	// detect protocol
	const protocol = url.split(':')[0];
	if (!clients[protocol]) return callback(new Error('Unknown Protocol'));

	// timeout param
	timeout = (Number.isInteger(timeout) && timeout > 0) ? timeout : DEFAULT_TIMEOUT;
	if (timeout <= 0) return callback(new Error('Timeout'));

	// set up watchdog
	let watchdog = setTimeout(() => {
		if (!request.destroyed) {
			request.destroy();
			callback(new Error('Timeout'));
			callback = () => { };
		}
	}, timeout);

	// keep time to deduct from timeout in case of redirect
	let startTime = Date.now();

	let request = createRequest(protocol, url, headers, timeout);

	request.on('response', response => {
		if (request.destroyed) return;
		clearTimeout(watchdog);

		// Handle redirects
		const location = response.headers.location;
		if (location) {
			const maxFollow = follow === true ? MAX_FOLLOW_LIMIT : follow;
			if (!maxFollow) {
				request.destroy();
				return callback(new Error('Too many Redirects'));
			}

			// try parse location
			let followURL;
			try {
				followURL = new URL(location, url).href;
			} catch (err) {
				request.destroy();
				return callback(err);
			}

			// detect loops
			if (followURL === url) {
				request.destroy();
				return callback(new Error('Redirect Loop'));
			}

			// recurse
			request.destroy();
			const elapsedTime = Date.now() - startTime;
			return get({
				...params,
				url: followURL,
				follow: maxFollow - 1,
				timeout: timeout - elapsedTime
			}, callback);
		}

		// Handle non-success status codes
		if (Math.floor(response.statusCode / 100) !== 2) {
			request.destroy();
			return callback(new Error(`Response Status Code: ${response.statusCode}`));
		}

		// get buffer
		let buffers = [];
		response
			.on('data', chunk => buffers.push(chunk))
			.once('end', () => callback(null, {
				statusCode: response.statusCode,
				headers: response.headers,
				body: Buffer.concat(buffers)
			}));

	}).on('error', err => {
		if (request.destroyed) return;
		clearTimeout(watchdog);
		callback(err);
	});

	request.end();
};

module.exports = get;
