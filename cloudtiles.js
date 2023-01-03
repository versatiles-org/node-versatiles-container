#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const fetch = require("undici").fetch;
const format = require("util").format;
const pkg = require("./package");

// http://127.0.0.1/cloudtiles/data/hitzekarte.cloudtiles

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

	self.opt = opt || {};

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
	fetch(self.src, { headers: { ...self.requestheaders, "Range": format("bytes=%s-%s", position.toString(), (position+length).toString()) }}).then(function(resp){
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
			buffer: Buffer.alloc(Number(length)),
			position: position,
			offset: 0,
			length: Number(length), // api does not like bigint, convert to Number and hope for the best
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
		
		fn(null, self.header);
		
	});

	return self;
};

// get tile by zxy
cloudtiles.prototype.getTile = function(z, x, y, fn){
	const self = this;

	// ensure block index is loaded
	self.getBlockIndex(function(err){
		if (err) return fn(err);

		// tile xy (within block)
		const tx = x%256;
		const ty = y%256;
	
		// block xy
		const bx = ((x-tx)/256);
		const by = ((y-ty)/256);

		// check if block is within bounds
		if (!self.index.hasOwnProperty(z)) return fn(new Error("Invalid Z"));
		if (!self.index[z].hasOwnProperty(bx)) return fn(new Error("Invalid X"));
		if (!self.index[z][bx].hasOwnProperty(by)) return fn(new Error("Invalid Y"));

		const block = self.index[z][bx][by];
		
		if (tx < block.col_min || tx > block.col_max) return fn(new Error("Invalid X within Block"));
		if (ty < block.row_min || ty > block.row_max) return fn(new Error("Invalid Y within Block"));
		
		
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
		zlib.brotliDecompress(data, "brotli", function(err, data){ // decompress
			if (err) return fn(err);
			block.tile_index = data; // keep as buffer in order to keep heap lean
			return fn(null, block.tile_index);
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
			zlib.brotliDecompress(data, "brotli", function(err, data){ // decompress
				if (err) return fn(err);
				
				try {
					self.meta = JSON.parse(data);
				} catch (err) {
					self.meta = {}; // empty
				}
				
				return fn(null, self.meta);
				
			});
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
			zlib.brotliDecompress(data, "brotli", function(err, data){ // decompress
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

