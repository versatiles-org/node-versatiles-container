#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const fetch = require("undici").fetch;
const format = require("util").format;
const pkg = require("./package");

const cloudtiles = module.exports = function cloudtiles(src, opt) {
	if (!(this instanceof cloudtiles)) return new cloudtiles(src, opt);
	const self = this;

	self.src = src;
	self.srctype = /^https?:\/\//.test(src) ? "http" : "file";
	self.fd = null;

	// data
	self.header = null;
	self.meta = null;
	self.index = null;
	self.zoom = null;
	self.bbox = null;

	self.opt = {
		tms: false,
		...(opt||{}),
	};

	// default http request headers
	self.requestheaders = {
		"User-Agent": format("Mozilla/5.0 (compatible; %s/%s; +https://www.npmjs.com/package/%s)", pkg.name, pkg.version, pkg.name),
		...(self.opt.requestheaders||{})
	};

	self.format = [ "png", "jpeg", "webp", null, null, null, null, null, null, null, null, null, null, null, null, null, "pbf" ];
	self.compression = [ null, "gzip", "brotli", null, null, null, null, null, null, null, null, null, null, null, null, null, null ];

	return self;
};

// thin wrapper for type specific read function
cloudtiles.prototype.read = function(position, length, fn){
	return this["read_"+this.srctype](position, length, fn), this;
};

// read from http(s)
cloudtiles.prototype.read_http = function(position, length, fn){
	const self = this;
	fetch(self.src, {
		headers: {
			...self.requestheaders,
			"Range": format("bytes=%s-%s", position.toString(), (position+length).toString()), // explicit .toString() because printf appends 'n' to bigint
		}
	}).then(function(resp){
		if (resp.status-200 >= 100) return fn(new Error("Server replied with HTTP Status Code "+resp.status));
		resp.arrayBuffer().then(function(buf){
			fn(null, Buffer.from(buf));
		}).catch(function(err){
			fn(err);
		});
	}).catch(function(err){
		fn(err);
	});
	return self;
};

// read a chunk from a file
cloudtiles.prototype.read_file = function(position, length, fn){
	const self = this;
	self.open_file(function(){
		fs.read(self.fd, {
			buffer: Buffer.alloc(Number(length)), // buffer wants integers, but length shouldn't exceed 2^53 anyway
			position: position,
			offset: 0,
			length: Number(length), // fs api does not like bigint here, convert to Number and hope for the best
		}, function(err, r, buf){
			return fn(err, buf);
		});
	});
	return self;
};

// open file once wrapper
cloudtiles.prototype.open_file = function(fn){
	const self = this;
	if (self.fd !== null) return fn(null), self;
	fs.open(self.src, 'r', function(err, fd){
		if (err) return fn(err);
		self.fd = fd;
		return fn(null);
	});
	return self;
};

// get header
cloudtiles.prototype.getHeader = function(fn){
	const self = this;

	// deliver if known
	if (self.header !== null) return fn(null, self.header), self;

	// FIXME: get magic bytes first, then read whole header based on version
	self.read(0, 62, function(err, data){
		if (err) return fn(err);

		try {
			self.header = {
				magic: data.toString("utf8", 0, 28),
				tile_format: self.format[data.readUInt8(28)],
				tile_precompression: self.compression[data.readUInt8(29)],
				meta_offset: data.readBigUInt64BE(30),
				meta_length: data.readBigUInt64BE(38),
				block_index_offset: data.readBigUInt64BE(46),
				block_index_length: data.readBigUInt64BE(54),
			};
		} catch (err) {
			return fn(err);
		}

		fn(null, { ...self.header });

	});

	return self;
};

// get tile by zxy
cloudtiles.prototype.getTile = function(z, x, y, fn){
	const self = this;

	// when y index is inverted
	if (self.opt.tms) y = Math.pow(2,z)-y-1;

	// ensure block index is loaded
	self.getBlockIndex(function(err){
		if (err) return fn(err);

		// tile xy (within block)
		const tx = x%256;
		const ty = y%256;

		// block xy
		const bx = ((x-tx)/256);
		const by = ((y-ty)/256);

		// check if block containing tile is within bounds
		if (!self.index.hasOwnProperty(z)) return fn(new Error("Invalid Z"));
		if (!self.index[z].hasOwnProperty(bx)) return fn(new Error("Invalid X"));
		if (!self.index[z][bx].hasOwnProperty(by)) return fn(new Error("Invalid Y"));

		const block = self.index[z][bx][by];

		// check if block contains tile
		if (tx < block.col_min || tx > block.col_max) return fn(new Error("Invalid X within Block"));
		if (ty < block.row_min || ty > block.row_max) return fn(new Error("Invalid Y within Block"));

		// calculate sequential tile number
		const j = (ty - block.row_min) * (block.col_max - block.col_min + 1) + (tx - block.col_min);

		// get tile index
		self.getTileIndex(block, function(err){
			if (err) return fn(err);

			const tile_offset = block.tile_index.readBigUInt64BE(12*j);
			const tile_length = BigInt(block.tile_index.readUInt32BE(12*j+8)); // convert to bigint so range request can be constructed

			self.read(tile_offset, tile_length, function(err, tile){
				if (err) return fn(err);
				return fn(null, tile);
			});


		});

	});

	return self;
};

// get tile index for block
cloudtiles.prototype.getTileIndex = function(block, fn){
	const self = this;
	if (block.tile_index !== null) return fn(null, block.tile_index), self;
	self.read(block.tile_index_offset, block.tile_index_length, function(err, data){ // read tile_index buffer
		if (err) return fn(err);
		zlib.brotliDecompress(data, function(err, data){ // decompress
			if (err) return fn(err);
			block.tile_index = data; // keep as buffer in order to keep heap lean
			return fn(null, block.tile_index);
		});
	});
	return self;
};

// get block index
cloudtiles.prototype.getBlockIndex = function(fn){
	const self = this;

	// deliver if known
	if (self.index !== null) return fn(null, self.index), self;

	self.getHeader(function(err){
		if (err) return fn(err);

		self.read(self.header.block_index_offset, self.header.block_index_length, function(err, data){ // read block_index buffer
			if (err) return fn(err);
			zlib.brotliDecompress(data, function(err, data){ // decompress
				if (err) return fn(err);

				// read index from buffer
				let index = [];
				for (let i = 0; i < (data.length/29); i++) {
					index.push({
						level: data.readUInt8(0+i*29),
						column: data.readUInt32BE(1+i*29),
						row: data.readUInt32BE(5+i*29),
						col_min: data.readUInt8(9+i*29),
						row_min: data.readUInt8(10+i*29),
						col_max: data.readUInt8(11+i*29),
						row_max: data.readUInt8(12+i*29),
						tile_index_offset: data.readBigUInt64BE(13+i*29),
						tile_index_length: data.readBigUInt64BE(21+i*29),
						tile_index: null,
					});
				}

				// filter invalid blocks and sort by z, y, x
				index = index.filter(function(b){
					return (b.col_max >= b.col_min && b.row_max >= b.row_min); // these shouldn't exist
				}).sort(function(a,b){
					if (a.level !== b.level) return (a.level - b.level);
					if (a.column !== b.column) return (a.column - b.column);
					return (a.row - b.row);
				});

				// build hierarchy
				self.index = index.reduce(function(i,b){
					if (!i.hasOwnProperty(b.level)) i[b.level] = {};
					if (!i[b.level].hasOwnProperty(b.column)) i[b.level][b.column] = {};
					i[b.level][b.column][b.row] = b;
					return i;
				},{});

				return fn(null, self.index);

			});
		});
	});

	return self;
};

// get metadata
cloudtiles.prototype.getMeta = function(fn){
	const self = this;

	// deliver if known
	if (self.meta !== null) return fn(null, self.meta), self;

	self.getHeader(function(err){
		if (err) return fn(err);

		self.read(self.header.meta_offset, self.header.meta_length, function(err, data){ // read meta buffer
			if (err) return fn(err);
			zlib.brotliDecompress(data, function(err, data){ // decompress
				if (err) return fn(err);

				try {
					self.meta = JSON.parse(data);
				} catch (err) {
					self.meta = {}; // empty
				}

				return fn(null, { ...self.meta });

			});
		});

	});

	return self;
};

// get zoom levels
cloudtiles.prototype.getZoomLevels = function(fn){
	const self = this;

	// deliver if known
	if (self.zoom !== null) return fn(null, self.zoom), self;

	self.getBlockIndex(function(err){
		if (err) return fn(err);

		self.zoom = Object.keys(self.index).sort(function(a,b){
			return a.localeCompare(b, undefined, { numeric: true });
		});

		return fn(null, [ ...self.zoom ]);

	});

	return self;
};

// get approximate bbox for highest zoom level (lonlat; w, s, e, n)
cloudtiles.prototype.getBoundingBox = function(fn){
	const self = this;

	// deliver if known
	if (self.bbox !== null) return fn(null, self.bbox), self;

	self.getZoomLevels(function(err, zoom){
		if (err) return fn(err);

		// get max zoom level
		// assumption: highest zoom tileset delivers the most detailed bounding box
		const z = "10";// zoom.pop();

		// get min and max x
		const xr = Object.keys(self.index[z]).sort(function(a,b){
			return a.localeCompare(b, undefined, { numeric: true });
		});
		const xmin = xr[0];
		const xmax = xr[xr.length-1];

		// get min and max y
		// assumption: extent is the same on every block (tileset is "rectangular")
		const yr = Object.keys(self.index[z][xmin]).sort(function(a,b){
			return a.localeCompare(b, undefined, { numeric: true });
		});

		const ymin = yr[0];
		const ymax = yr[yr.length-1];

		// convert to tile ids;
		let txmin = ((parseInt(xmin,10)*256)+self.index[z][xmin][ymin].col_min);
		let txmax = ((parseInt(xmin,10)*256)+self.index[z][xmin][ymin].col_max);

		let tymin, tymax; // different when invert y
		if (self.opt.tms) { // north → south

			tymin = Math.pow(2,z)-((parseInt(ymin,10)*256)+self.index[z][xmin][ymin].row_min)-1;
			tymax = Math.pow(2,z)-((parseInt(ymax,10)*256)+self.index[z][xmax][ymax].row_max)-1;

		} else { // south → north

			tymin = ((parseInt(ymax,10)*256)+self.index[z][xmax][ymax].row_max);
			tymax = ((parseInt(ymin,10)*256)+self.index[z][xmin][ymin].row_min);

		};

		// in case someone wants to check...
		/*
			console.log("south west tile: https://tile.openstreetmap.org/%d/%d/%d.png", z, txmin, tymin);
			console.log("north east tile: https://tile.openstreetmap.org/%d/%d/%d.png", z, txmax, tymax);
		*/

		// use "next" tile to include all tiles
		txmax += 1;
		tymin += 1;

		// convert to coordinates:
		self.bbox = [
			...self._zxy_ll(parseInt(z,10), txmin, tymin),
			...self._zxy_ll(parseInt(z,10), txmax, tymax),
		];

		return fn(null, self.bbox);

	});

	return self;
};

// helper zxy → lonlat
cloudtiles.prototype._zxy_ll = function(z,x,y){
	const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
	return [
		(x / Math.pow(2, z) * 360 - 180), // lon
		(180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))), // lat
	];
};

// create webserver (please don't use this in production)
cloudtiles.prototype.server = function(){
	const self = this;

	const mimes = {
		png: "image/png",
		jpeg: "image/jpeg",
		webp: "image/webp",
		pbf: "application/x-protobuf",
	};

	const encodings = {
		gzip: "gzip",
		brotli: "br",
	};

	const url = require("url");

	const srvr = require("http").createServer(function(req, res){

		res.setHeader("Content-type", "text/plain");
		if (req.method !== "GET") return res.statusCode = 405, res.end("Method not allowed");
		const path = url.parse(req.url).pathname;
	
		switch (path) {
			case "/":
				self.getHeader(function(err, header){ 
					const html = [];
					// yes, i know. it's just a demo for now.
					html.push('<!DOCTYPE html><html><head><meta charset="utf-8"/><title>cloudtiles map</title><meta name="viewport" content="width=device-width"><script src="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.js"></script><link href="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css" rel="stylesheet" />');
					if (self.header.tile_format === "pbf") html.push('<script src="https://github.com/acalcutt/maplibre-gl-inspect/releases/download/v1.4.3/maplibre-gl-inspect.min.js"></script><link href="https://github.com/acalcutt/maplibre-gl-inspect/releases/download/v1.4.3/maplibre-gl-inspect.css" rel="stylesheet" />');
					html.push('<style type="text/css"> body { margin: 0; } #map { width: 100vw; height: 100vh; } </style></head><body><div id="map"></div><script> var map = new maplibregl.Map({ container: "map", style: "//'+req.headers.host+'/style.json", hash: true });');
					if (self.header.tile_format === "pbf") html.push('map.addControl(new maplibregl.NavigationControl()); map.addControl(new MaplibreInspect({ showInspectMap: true, showMapPopup: false, showInspectMapPopup: false, showInspectButton: false }));');
					html.push('</script></body></html>');
					res.setHeader("Content-type", "text/html; charset=utf-8");
					return res.end(html.join(""));
				});
			break;
			case "/style.json":
				// construct style.json
				self.getBoundingBox(function(err, bbox){
					const center = [
						((bbox[0]+bbox[2])/2),
						((bbox[1]+bbox[3])/2)
					];
					self.getZoomLevels(function(err, zoom){
						const zooms = [
							parseInt(zoom[0],10),
							parseInt(zoom[zoom.length-1],10),
						];
						const midzoom = Math.round((zooms[0]+zooms[1])/2);

						const style = {
							version: 8,
							id: "cloudtiles",
							name: "cloudtiles",
							zoom: midzoom,
							center: center,
							sources: {},
							layers: [],
						};
						
						if (self.header.tile_format === "pbf") { // vector tiles
							style.sources.cloudtiles = {
								type: "vector",
								url: "http://"+req.headers.host+"/tile.json",
							};
							// FIXME: extract layers from metadata
						} else { // raster tiles
							style.sources.cloudtiles = {
								type: "raster",
								tiles: ["http://"+req.headers.host+"/{z}/{x}/{y}"],
								tileSize: 256,
							};
							style.layers.push({
								id: "cloudtiles",
								type: "raster",
								source: "cloudtiles",
								minzoom: zooms[0],
								maxzoom: zooms[1],
							});
						}

						res.setHeader("Content-type", "application/json; charset=utf-8");
						return res.end(JSON.stringify(style,null,"\t"));
					
					});
				});
			break;
			case "/tile.json":
				// construct tilejson, extend with metadata
				// https://github.com/mapbox/tilejson-spec/tree/master/3.0.0
				self.getMeta(function(err, meta){
					if (err) return res.statusCode = 500, res.end(err.toString());
					res.setHeader("Content-type", "application/json; charset=utf-8");

					// construct tilejson
					meta.tilejson = "3.0.0";
					meta.tiles = [ "http://"+req.headers.host+"/{z}/{x}/{y}" ];
					meta.scheme = "zxy";

					if (!meta.vector_layers) meta.vector_layers = []; // for good luck!

					self.getBoundingBox(function(err, bbox){
						if (!err) meta.bounds = bbox;
						self.getZoomLevels(function(err, zoom){
							if (!err) {
								meta.minzoom = parseInt(zoom[0],10);
								meta.maxzoom = parseInt(zoom[zoom.length-1],10);
							}
							return res.end(JSON.stringify(meta,null,"\t"));
						
						});
					});
				});
			break;
			default: // get tile
				const xyz = path.split("/").filter(function(c){ // this is good enough
					return !!c;
				}).map(function(c){ // getTiles() eats integers
					return parseInt(c,10);
				});
				if (xyz.length < 3) return res.statusCode = 404, res.end("sorry");
				self.getTile(xyz[0], xyz[1], xyz[2], function(err, tile){
					if (err) return res.statusCode = 500, res.end(err.toString());
					res.setHeader("Content-type", mimes[self.header.tile_format]);

					// not compressed anyway
					if (self.header.tile_precompression === null) return res.end(tile);

					// can the client eat the precompression?
					const accepted_encodings = (req.headers["accept-encoding"]||"").split(/, */g).map(function(e){ return e.split(";").shift(); });
					if (accepted_encodings.includes(encodings[self.header.tile_precompression])) return res.setHeader("Content-Encoding", encodings[self.header.tile_precompression]), res.end(tile);
				
					// no, decompression required
					switch (self.header.tile_precompression) {
						case "brotli":
							zlib.brotliDecompress(tile, function(err, tile){ //
								if (err) return res.statusCode = 500, res.end(err);
								res.end(tile);
							});
						break;
						case "gzip":
							zlib.gunzip(tile, function(err, tile){ //
								if (err) return res.statusCode = 500, res.end(err);
								res.end(tile);
							});
						break;
					}
				});
			break;
		}
		
	});

	srvr.listen.apply(srvr, arguments);

	return srvr;

};
