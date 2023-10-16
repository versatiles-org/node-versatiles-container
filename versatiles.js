const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const format = require("node:util").format;
const get = require("./lib/get.js");
const pkg = require("./package.json");


class Versatiles {
	opt = {
		tms: false,
		headers: {}
	}
	constructor(src, opt) {
		Object.assign(this.opt, opt)

		this.src = src;
		this.srctype = ["http", "https"].includes(src.slice(0, src.indexOf(":"))) ? "http" : "file";

		switch (this.srctype) {
			case "file":
				// global file descriptor
				this.fd = null;
				break;
			case "http":
				// default http(s) request headers
				this.requestheaders = {
					"User-Agent": format("Mozilla/5.0 (compatible; %s/%s; +https://www.npmjs.com/package/%s)", pkg.name, pkg.version, pkg.name),
					...(this.opt.headers || {}),
				};
				break;
		};

		// read queue
		this.readqueue = {};

		// data
		this.header = null;
		this.meta = null;
		this.index = null;
		this.zoom = null;
		this.bbox = null;

		this.formats = {
			"c01": ["png", "jpeg", "webp", ...Array(13), "pbf"], // legacy opencloudtiles
			"v01": ["png", "jpeg", "webp", "pbf"],
			"v02": ["bin", ...Array(15), "png", "jpeg", "webp", "avif", "svg", ...Array(11), "pbf", "geojson", "topojson", "json"],
		};

		this.mimetypes = {
			bin: "application/octet-stream",
			png: "image/png",
			jpeg: "image/jpeg",
			webp: "image/webp",
			avif: "image/avif",
			svg: "image/svg+xml",
			pbf: "application/x-protobuf",
			geojson: "application/geo+json",
			topojson: "application/topo+json",
			json: "application/json",
		};

		this.compression = [null, "gzip", "br"];

		return self;
	};
	// thin wrapper for type-specific read function
	async read(position, length) {
		return await this[`read_${this.srctype}`](position, length);
	}

	// read from http(s)
	async read_http(position, length) {
		const resp = await get({
			url: this.src,
			headers: {
				...this.requestheaders,
				"Range": `bytes=${position}-${BigInt(position) + BigInt(length) - 1n}`,
			},
			follow: true,
			timeout: 10000,
		});

		if (resp.statusCode !== 206) {
			throw new Error(`Server responded with ${resp.statusCode}`);
		}

		return resp.body;
	}

	// read a chunk from a file
	async read_file(position, length) {
		await this.open_file();
		return new Promise((resolve, reject) => {
			fs.read(this.fd, {
				buffer: Buffer.alloc(Number(length)),
				position: position,
				offset: 0,
				length: Number(length),
			}, (err, r, buf) => {
				if (err) reject(err);
				else resolve(buf);
			});
		});
	}

	// open file once wrapper
	async open_file() {
		if (this.fd !== null) {
			return;
		}

		return new Promise((resolve, reject) => {
			fs.open(this.src, 'r', (err, fd) => {
				if (err) reject(err);
				else {
					this.fd = fd;
					resolve();
				}
			});
		});
	}


	// decompression helper
	async decompress(type, data) {
		switch (type) {
			case 'br': zlib.brotliDecompress(data); break;
			case 'gzip': zlib.gunzip(data); break;
			default: return data;
		}
	};

	// get header
	async getHeader() {
		// deliver if known
		if (this.header !== null) return { ...this.header };

		let data = await this.read(0, 66);

		// check magic bytes
		if (/^versatiles_v0[12]$/.test(data.toString("utf8", 0, 14))) {

			const version = data.toString("utf8", 11, 14);

			switch (version) {
				case "v01":
					this.header = {
						magic: data.toString("utf8", 0, 14),
						version: version,
						tile_format: this.formats[version][data.readUInt8(14)] || "bin",
						tile_precompression: this.compression[data.readUInt8(15)] || null,
						zoom_min: data.readUInt8(16),
						zoom_max: data.readUInt8(17),
						bbox_min_x: data.readFloatBE(18),
						bbox_min_y: data.readFloatBE(22),
						bbox_max_x: data.readFloatBE(26),
						bbox_max_y: data.readFloatBE(30),
						meta_offset: data.readBigUInt64BE(34),
						meta_length: data.readBigUInt64BE(42),
						block_index_offset: data.readBigUInt64BE(50),
						block_index_length: data.readBigUInt64BE(58),
					}
					break;
				case "v02":
					this.header = {
						magic: data.toString("utf8", 0, 14),
						version: version,
						tile_format: this.formats[version][data.readUInt8(14)] || "bin",
						tile_precompression: this.compression[data.readUInt8(15)] || null,
						zoom_min: data.readUInt8(16),
						zoom_max: data.readUInt8(17),
						bbox_min_x: data.readInt32BE(18) / 1e7,
						bbox_min_y: data.readInt32BE(22) / 1e7,
						bbox_max_x: data.readInt32BE(26) / 1e7,
						bbox_max_y: data.readInt32BE(30) / 1e7,
						meta_offset: data.readBigUInt64BE(34),
						meta_length: data.readBigUInt64BE(42),
						block_index_offset: data.readBigUInt64BE(50),
						block_index_length: data.readBigUInt64BE(58),
					};
					break;
				default:
					throw new Error("Invalid Container");
			}

			// set zoom and bbox if defined
			if (this.header.zoom_mon + this.header.zoom_max > 0) this.zoom = Array(this.header.zoom_max - this.header.zoom_min + 1).fill().map(function (v, i) { return i + this.header.zoom_min });
			if (this.header.bbox_min_x + this.header.bbox_max_x + this.header.bbox_min_y + this.header.bbox_may_y > 0) this.bbox = [this.header.bbox_min_x, this.header.bbox_min_y, this.header.bbox_max_x, this.header.bbox_max_y];

		} else if (data.toString("utf8", 0, 28) === "OpenCloudTiles-Container-v1:") { // backwards compatibility

			try {
				this.header = {
					magic: data.toString("utf8", 0, 28),
					version: "c01",
					tile_format: this.formats["c01"][data.readUInt8(28)] || "bin",
					tile_precompression: this.compression[data.readUInt8(29)] || null,
					meta_offset: data.readBigUInt64BE(30),
					meta_length: data.readBigUInt64BE(38),
					block_index_offset: data.readBigUInt64BE(46),
					block_index_length: data.readBigUInt64BE(54),
				};
			} catch (err) {
				return fn(err);
			}

		} else {
			return fn(new Error("Invalid Container"));
		}

		return { ...this.header }
	}

	// get tile by zxy
	async getTile(z, x, y) {
		// when y index is inverted
		if (this.opt.tms) y = Math.pow(2, z) - y - 1;

		// ensure block index is loaded
		await this.getBlockIndex()


		// tile xy (within block)
		const tx = x % 256;
		const ty = y % 256;

		// block xy
		const bx = ((x - tx) / 256);
		const by = ((y - ty) / 256);

		// check if block containing tile is within bounds
		if (!this.index.hasOwnProperty(z)) return fn(new Error("Invalid Z"));
		if (!this.index[z].hasOwnProperty(bx)) return fn(new Error("Invalid X"));
		if (!this.index[z][bx].hasOwnProperty(by)) return fn(new Error("Invalid Y"));

		const block = this.index[z][bx][by];

		// check if block contains tile
		if (tx < block.col_min || tx > block.col_max) return fn(new Error("Invalid X within Block"));
		if (ty < block.row_min || ty > block.row_max) return fn(new Error("Invalid Y within Block"));

		// calculate sequential tile number
		const j = (ty - block.row_min) * (block.col_max - block.col_min + 1) + (tx - block.col_min);

		// get tile index
		await this.getTileIndex(block);

		const tile_offset = block.tile_index.readBigUInt64BE(12 * j) + BigInt(block.block_offset);
		const tile_length = BigInt(block.tile_index.readUInt32BE(12 * j + 8)); // convert to bigint so range request can be constructed

		// shortcut: return empty buffer
		if (tile_length === 0n) return fn(null, Buffer.allocUnsafe(0));

		return await this.read(tile_offset, tile_length);
	}

	// get tile index for block
	async getTileIndex(block) {
		if (block.tile_index !== null) return block.tile_index;
		let data = await this.read(block.tile_index_offset, block.tile_index_length)// read tile_index buffer
		block.tile_index = await decompress("br", data); // keep as buffer in order to keep heap lean
		return block.tile_index;
	}

	// get block index
	async getBlockIndex() {
		// deliver if known
		if (this.index !== null) return this.index;

		await this.getHeader()

		let data = await this.read(this.header.block_index_offset, this.header.block_index_length) // read block_index buffer

		data = await this.decompress("br", data) // decompress

		// read index from buffer
		let index = [];

		switch (this.header.version) {
			case "c01":
			case "v01":

				// check blog index length
				if (data.length / 29 % 1 !== 0) return fn(new Error("invalid block index"));

				for (let i = 0; i < (data.length / 29); i++) {
					index.push({
						level: data.readUInt8(0 + i * 29),
						column: data.readUInt32BE(1 + i * 29),
						row: data.readUInt32BE(5 + i * 29),
						col_min: data.readUInt8(9 + i * 29),
						row_min: data.readUInt8(10 + i * 29),
						col_max: data.readUInt8(11 + i * 29),
						row_max: data.readUInt8(12 + i * 29),
						block_offset: 0, // all positions are relative to the whole file
						tile_blobs_length: null, // indeterminable
						tile_index_offset: data.readBigUInt64BE(13 + i * 29),
						tile_index_length: data.readBigUInt64BE(21 + i * 29),
						tile_index: null,
					});
				};
				break;
			case "v02":

				// check blog index length
				if (data.length / 33 % 1 !== 0) return fn(new Error("invalid block index"));

				for (let i = 0; i < (data.length / 33); i++) {
					index.push({
						level: data.readUInt8(0 + i * 33),
						column: data.readUInt32BE(1 + i * 33),
						row: data.readUInt32BE(5 + i * 33),
						col_min: data.readUInt8(9 + i * 33),
						row_min: data.readUInt8(10 + i * 33),
						col_max: data.readUInt8(11 + i * 33),
						row_max: data.readUInt8(12 + i * 33),
						block_offset: data.readBigUInt64BE(13 + i * 33),
						tile_blobs_length: data.readBigUInt64BE(21 + i * 33),
						tile_index_offset: data.readBigUInt64BE(13 + i * 33) + data.readBigUInt64BE(21 + i * 33), // block_offset + tile_blobs_length
						tile_index_length: data.readUInt32BE(29 + i * 33),
						tile_index: null,
					});
				};
				break;
		}

		// filter invalid blocks and sort by z, y, x
		index = index.filter(b =>
			(b.col_max >= b.col_min && b.row_max >= b.row_min) // these shouldn't exist
		).sort((a, b) => {
			if (a.level !== b.level) return (a.level - b.level);
			if (a.column !== b.column) return (a.column - b.column);
			return (a.row - b.row);
		});

		// build hierarchy
		this.index = index.reduce((i, b) => {
			if (!i.hasOwnProperty(b.level)) i[b.level] = {};
			if (!i[b.level].hasOwnProperty(b.column)) i[b.level][b.column] = {};
			i[b.level][b.column][b.row] = b;
			return i;
		}, {});

		return this.index;
	}

	// get metadata
	async getMeta() {
		// shortcut: no metadata defined
		if (this.header.meta_length == 0) return this.meta = {};

		// deliver if known
		if (this.meta !== null) return { ...this.meta };

		await this.getHeader()
		if (err) return fn(err);

		let data = await this.read(this.header.meta_offset, this.header.meta_length) // read meta buffer

		data = await this.decompress(this.header.tile_precompression, data) // decompress

		try {
			this.meta = JSON.parse(data);
		} catch (err) {
			this.meta = {}; // empty
		}

		return { ...this.meta };
	}

	// get zoom levels
	async getZoomLevels() {
		// deliver if known
		if (this.zoom !== null) return [...this.zoom];

		await this.getBlockIndex();

		this.zoom = Object.keys(this.index)
			.map(z => parseInt(z, 10))
			.sort((a, b) => a - b);

		return [...this.zoom];
	}

	// get approximate bbox for highest zoom level (lonlat; w, s, e, n)
	async getBoundingBox() {
		// deliver if known
		if (this.bbox !== null) return [...this.bbox];

		const zoom = await this.getZoomLevels();

		// get max zoom level
		// assumption: highest zoom tileset delivers the most detailed bounding box
		const z = zoom[zoom.length - 1];

		// get min and max x
		const xr = Object.keys(this.index[z]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
		const xmin = xr[0];
		const xmax = xr[xr.length - 1];

		// get min and max y
		// assumption: extent is the same on every block (tileset is "rectangular")
		const yr = Object.keys(this.index[z][xmin]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

		const ymin = yr[0];
		const ymax = yr[yr.length - 1];

		// convert to tile ids;
		let txmin = ((parseInt(xmin, 10) * 256) + this.index[z][xmin][ymin].col_min);
		let txmax = ((parseInt(xmax, 10) * 256) + this.index[z][xmin][ymin].col_max + 1); // use "next" tile to include all tiles

		let tymin, tymax; // different when invert y
		if (this.opt.tms) { // north → south

			tymin = Math.pow(2, z) - ((parseInt(ymin, 10) * 256) + this.index[z][xmin][ymin].row_min); // use "next" tile, not subtracting 1
			tymax = Math.pow(2, z) - ((parseInt(ymax, 10) * 256) + this.index[z][xmax][ymax].row_max) - 1;

		} else { // south → north

			tymin = ((parseInt(ymax, 10) * 256) + this.index[z][xmax][ymax].row_max) + 1; // use "next" tile
			tymax = ((parseInt(ymin, 10) * 256) + this.index[z][xmin][ymin].row_min);

		};

		// convert to coordinates:
		this.bbox = [
			...this.#_zxy_ll(z, txmin, tymin),
			...this.#_zxy_ll(z, txmax, tymax),
		];

		return [...this.bbox];
	}

	// helper zxy → lonlat
	#_zxy_ll(z, x, y) {
		const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
		return [
			(x / Math.pow(2, z) * 360 - 180), // lon
			(180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))), // lat
		];
	}

	// create webserver (please don't use this in production)
	server() {
		const encodings = {
			gzip: "gzip",
			brotli: "br",
		};

		const url = require("url");

		const srvr = require("http").createServer(async (req, res) => {

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

		srvr.listen.apply(srvr, arguments);

		return srvr;
	}
}

module.exports = Versatiles;

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
