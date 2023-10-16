const url = require("url");
const { createServer } = require("http");

// create webserver (please don't use this in production)
export function server() {
	const encodings = {
		gzip: "gzip",
		brotli: "br",
	};



	const srvr = createServer(async (req, res) => {

		res.setHeader("Content-type", "text/plain");
		if (req.method !== "GET") return res.statusCode = 405, res.end("Method not allowed");
		const p = url.parse(req.url).pathname;

		// construct base url from request headers
		const baseurl = this.opt.base || format("%s://%s", (req.headers["x-forwarded-proto"] || "http"), (req.headers["x-forwarded-host"] || req.headers.host));

		// output cache
		const cache = {};

		switch (p) {
			case "/":
			case "/index.html":

				// try from cache
				if (cache.html) return res.setHeader("Content-type", "text/html; charset=utf-8"), res.end(cache.html);

				fs.readFile(path.resolve(__dirname, "static/index.html"), (err, html) => {
					if (err) return res.statusCode = 500, res.end(err.toString()), console.error(err);
					cache.html = html.toString();
					res.setHeader("Content-type", "text/html; charset=utf-8");
					res.end(cache.html);
				});
				break;
			case "/style.json":

				// try from cache
				if (cache.style) return res.setHeader("Content-type", "application/json; charset=utf-8"), res.end(cache.style);

				// construct style.json
				let bbox;
				try {
					bbox = await this.getBoundingBox()
				} catch (err) {
					return res.statusCode = 500, res.end(err.toString()), console.error(err);
				}

				const center = [
					((bbox[0] + bbox[2]) / 2),
					((bbox[1] + bbox[3]) / 2)
				];

				let zoom;
				try {
					zoom = await this.getZoomLevels()
				} catch (err) {
					return res.statusCode = 500, res.end(err.toString()), console.error(err);
				}

				const zooms = [
					parseInt(zoom[0], 10),
					parseInt(zoom[zoom.length - 1], 10),
				];
				const midzoom = Math.round((zooms[0] + zooms[1]) / 2);

				const style = {
					version: 8,
					id: "versatiles",
					name: "versatiles",
					zoom: midzoom,
					center: center,
					sources: {},
					layers: [],
				};

				if (this.header.tile_format === "pbf") { // vector tiles
					style.sources.versatiles = {
						type: "vector",
						url: baseurl + "/tile.json",
					};
					// FIXME: extract layers from metadata
				} else { // raster tiles
					style.sources.versatiles = {
						type: "raster",
						tiles: [baseurl + "/{z}/{x}/{y}"],
						tileSize: 256,
					};
					style.layers.push({
						id: "versatiles",
						type: "raster",
						source: "versatiles",
						minzoom: zooms[0],
						maxzoom: zooms[1],
					});
				};

				cache.style = JSON.stringify(style, null, "\t");
				res.setHeader("Content-type", "application/json; charset=utf-8");
				return res.end(cache.style);
			case "/tile.json":

				// try from cache
				if (cache.tilejson) return res.setHeader("Content-type", "application/json; charset=utf-8"), res.end(cache.tilejson);

				// construct tilejson, extend with metadata
				// https://github.com/mapbox/tilejson-spec/tree/master/3.0.0
				let meta;
				try {
					meta = await this.getMeta()
				} catch (err) {
					return res.statusCode = 500, res.end(err.toString()), console.error(err);
				}

				// construct tilejson
				meta.tilejson = "3.0.0";
				meta.tiles = [baseurl + "/{z}/{x}/{y}"];
				meta.scheme = meta.scheme || "zxy";

				if (!meta.vector_layers) meta.vector_layers = []; // for good luck!

				try {
					meta.bounds = await this.getBoundingBox();
				} catch (err) { }

				try {
					let zoom = await this.getZoomLevels();
					meta.minzoom = meta.minzoom || parseInt(zoom[0], 10);
					meta.maxzoom = meta.maxzoom || parseInt(zoom[zoom.length - 1], 10);
				} catch (err) { }

				cache.tilejson = JSON.stringify(meta, null, "\t");
				res.setHeader("Content-type", "application/json; charset=utf-8");

				return res.end(cache.tilejson);
			default: // get tile (TODO: cache tiles)

				const xyz = p.split("/")
					.filter(c => !!c) // this is good enough
					.map(c => parseInt(c, 10)) // getTiles() eats integers

				if (xyz.length < 3) return res.statusCode = 404, res.end("sorry");

				try {
					let tile = await this.getTile(xyz[0], xyz[1], xyz[2]);

					if (tile.length === 0) return res.statusCode = 204, res.end(); // empty tile → "204 no content"
					res.setHeader("Content-type", this.mimetypes[this.header.tile_format]);

					// not compressed anyway
					if (this.header.tile_precompression === null) return res.end(tile);

					// can the client eat the precompression?
					const accepted_encodings = (req.headers["accept-encoding"] || "").split(/, */g).map(function (e) { return e.split(";").shift(); });

					// no, decompression required
					if (accepted_encodings.includes(encodings[this.header.tile_precompression])) return res.setHeader("Content-Encoding", encodings[this.header.tile_precompression]), res.end(tile);

					// decompress and deliver
					this.decompress(this.header.tile_precompression, tile, function (err, tile) {
						if (err) return res.statusCode = 500, res.end(err.toString()), console.error(err);
						res.end(tile);
					});
				} catch (err) {
					return res.statusCode = 500, res.end(err.toString()), console.error(err);
				}
				break;
		}

	});

	arguments.port ??= 8080;
	srvr.listen(arguments.port);
	console.log('listening on port ' + arguments.port);

	return srvr;
}

// executable magic
if (require.main === module) {
	if (process.argv.length < 3 || process.argv.includes("-h") || process.argv.includes("--help")) return console.error("Usage: versatiles <url|file>.versatiles [--tms] [--port <port>] [--host <hostname|ip>] [--base <http://baseurl/>] [--header-<header-key> <header-value>]"), process.exit(1);
	const src = /^https?:\/\//.test(process.argv[2]) ? process.argv[2] : path.resolve(process.cwd(), process.argv[2]);
	const port = process.argv.includes("--port") ? parseInt(process.argv[process.argv.lastIndexOf("--port") + 1], 10) : 8080;
	const host = process.argv.includes("--host") ? process.argv[process.argv.lastIndexOf("--host") + 1] : "localhost";
	const tms = process.argv.includes("--tms");
	const base = process.argv.includes("--base") ? process.argv[process.argv.lastIndexOf("--base") + 1] : null;
	const headers = process.argv.reduce((headers, arg, i) => {
		if (arg.slice(0, 9) === "--header-") headers[arg.slice(9)] = process.argv[i + 1];
		return headers;
	}, {});

	versatiles(src, {
		tms: tms,
		headers: headers,
		base: base,
	}).server(port, host, err => {
		if (err) return console.error(err.toString()), process.exit(1);
		console.error("Listening on http://%s:%d/", host, port);
	});
}

