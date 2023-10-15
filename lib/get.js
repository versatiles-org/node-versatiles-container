
// load protocols, set custom agent
const clients = ["https","http"].reduce(function(clients, protocol){
	clients[protocol] = require(protocol);
	clients[protocol].agent = new (clients[protocol]).Agent({ keepAlive: true });
	return clients;
},{});

const get = module.exports = function get({ url, headers, timeout, follow }, fn){

	// promisify
	if (!fn && typeof fn !== "function") return new Promise(function(resolve, reject){
		get({ url, headers, timeout, follow }, function(err, result){
			return (err) ? reject(err) : resolve(result);
		});
	});

	// detect protocol
	const protocol = url.slice(0,url.indexOf(":"));
	if (!clients[protocol]) return fn(new Error("Unknown Protocol"));

	// timeout param
	timeout = (Number.isInteger(timeout) && timeout > 0) ? timeout : (!!timeout) ? 30000 : 0;
	if (timeout <= 0) return fn(new Error("Timeout"));

	// set up watchdog
	let watchdog = setTimeout(() => {
		if (!request.destroyed) request.destroy(), fn(new Error("Timeout")), fn=()=>{}; // make callback unusable
	}, timeout);

	// keep time to deduct from timeout in case of redirect
	let time = Date.now();

	let request = clients[protocol].request(url, {
		method: "GET",
		agent: clients[protocol].agent,
		headers: headers || {},
		timeout: timeout,
	}, function(response){
		if (request.destroyed) return;
		clearTimeout(watchdog);

		// follow redirect
		if (response.headers.location) {
			if (follow === true) follow = 10; // clamp to max
			if (!follow) {
				request.destroy();
				return fn(new Error("Too many Redirects"));
			};

			// try parse location
			let followURL;
			try {
				followURL = new URL(response.headers.location, url).href;
			} catch (err) {
				request.destroy();
				return fn(err);
			}

			// detect loops
			if (followURL === url) {
				request.destroy();
				return fn(new Error("Redirect Loop"));
			}

			// recurse
			request.destroy();
			return get({
				...arguments[0],
				url: followURL,
				follow: --follow,
				timeout: timeout-(Date.now()-time), // deduct elapsed time from timeout
			}, fn);
		}

		// check if status is not 200-299
		if (Math.floor(response.statusCode/100) !== 2) {
			request.destroy();
			return fn(new Error("Response Status Code: "+response.statusCode));
		};

		// get buffer
		let buffers = [];
		response.on("data", function(chunk){
			buffers.push(chunk)
		}).once("end", function(){
			fn(null, {
				statusCode: response.statusCode,
				headers: response.headers,
				body: Buffer.concat(buffers)
			});
		});

	}).on("error", function(err){
		if (request.destroyed) return;
		clearTimeout(watchdog);
		fn(err);
	});

	request.end();

};