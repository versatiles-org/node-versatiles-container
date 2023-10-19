import url from 'node:url';
import { createServer } from 'node:http';
import zlib from 'node:zlib';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Versatiles } from 'versatiles';

const __dirname = (new URL('../', import.meta.url)).pathname;

const MIMETYPES = {
	bin: 'application/octet-stream',
	png: 'image/png',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	avif: 'image/avif',
	svg: 'image/svg+xml',
	pbf: 'application/x-protobuf',
	geojson: 'application/geo+json',
	topojson: 'application/topo+json',
	json: 'application/json',
}

export class Server {
	opt = {
		recompress: false,
	};
	layer;
	server;
	constructor(source, opt) {
		Object.assign(this.opt, opt);

		this.layer = {
			container: new Versatiles(source)
		}
	}
	async #prepareLayer() {
		let header;

		if (!this.layer.mime) {
			header ??= await this.layer.container.getHeader();
			this.layer.mime = MIMETYPES[header.tile_format] || 'application/octet-stream';
		}

		if (!this.layer.precompression) {
			header ??= await this.layer.container.getHeader();
			this.layer.precompression = header.precompression;
		}

		return this.layer;
	}
	async start() {
		const layer = await this.#prepareLayer();
		const recompress = this.opt.recompress || false;

		this.server = createServer(async (req, res) => {

			if (req.method !== 'GET') return respondWithError('Method not allowed', 405);
			const p = url.parse(req.url).pathname;

			// construct base url from request headers
			//const baseurl = this.opt.base || (req.headers["x-forwarded-proto"] || "http") + '://' + (req.headers["x-forwarded-host"] || req.headers.host);

			try {

				if ((p === '/') || (p === '/index.html')) {
					const html = await readFile(resolve(__dirname, 'static/index.html'));
					return respondWithContent(html, 'text/html; charset=utf-8');
				}

				if (p === '/tiles/tile.json') {
					return respondWithContent(await layer.container.getMeta(), 'application/json; charset=utf-8', 'br');
				}

				if (p === '/tiles/header.json') {
					let header = await layer.container.getHeader();
					header = Object.fromEntries('magic,version,tile_format,tile_precompression,zoom_min,zoom_max,bbox_min_x,bbox_min_y,bbox_max_x,bbox_max_y'.split(',').map(k => [k, header[k]]))
					return respondWithContent(header, 'application/json; charset=utf-8');
				}

				let match;
				if (match = p.match(/^\/tiles\/(?<z>[0-9]+)\/(?<x>[0-9]+)\/(?<y>[0-9]+).*/)) {
					let { x, y, z } = match.groups;
					x = parseInt(x, 10);
					y = parseInt(y, 10);
					z = parseInt(z, 10);
					return respondWithContent(await layer.container.getTile(z, x, y), layer.mime, layer.precompression);
				}

			} catch (err) {
				return respondWithError(err, 500);
			}

			return respondWithError('file not found', 404);

			async function respondWithContent(data, mime, compression) {
				const accepted_encoding = req.headers['accept-encoding'] || '';
				const accept_gzip = accepted_encoding.includes('gzip');
				const accept_br = accepted_encoding.includes('br');

				if (typeof data === 'object') data = JSON.stringify(data);
				if (typeof data === 'string') data = Buffer.from(data);

				switch (compression) {
					case 'br':
						if (accept_br) break;
						if (recompress && accept_gzip) {
							data = await gzip(await unbrotli(data));
							compression = 'gzip';
							break;
						}
						data = await unbrotli(data);
						compression = null;
						break;
					case 'gzip':
						if (accept_gzip) break;
						data = await ungzip(data);
						compression = null;
						break;
					default:
						if (recompress && accept_br) {
							data = await brotli(data);
							compression = 'br';
							break;
						}
						if (recompress && accept_gzip) {
							data = await gzip(data);
							compression = 'gzip';
							break;
						}
						compression = null;
						break;
				}

				if (compression) res.setHeader('content-encoding', compression);

				res.statusCode = 200;
				res.setHeader('content-type', mime);
				res.end(data);
			}

			function respondWithError(err, code = 500) {
				console.error(err);
				res.statusCode = code;
				res.setHeader('content-type', 'text/plain');
				res.end(err.toString());
			}
		});

		const port = arguments.port ?? 8080;

		await new Promise(r => this.server.listen(port, () => r()));

		console.log(`listening on port ${port} `);
	}
}

function gzip(dataIn) {
	return new Promise((res, rej) =>
		zlib.gzip(dataIn, { level: 9 }, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}

function ungzip(dataIn) {
	return new Promise((res, rej) =>
		zlib.ungzip(dataIn, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}

function brotli(dataIn) {
	return new Promise((res, rej) =>
		zlib.brotli(dataIn, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, } }, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}

function unbrotli(dataIn) {
	return new Promise((res, rej) =>
		zlib.unbrotli(dataIn, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}
