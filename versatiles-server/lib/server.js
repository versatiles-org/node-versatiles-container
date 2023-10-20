//import url from 'node:url';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Versatiles } from 'versatiles';
import { generateStyle } from './style.js';
import { gzip, ungzip, brotli, unbrotli } from './compressors.js';
import { StaticContent } from './static_content.js';

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
	options = {
		recompress: false,
		baseUrl: false,
		glyphsUrl: false,
		spriteUrl: false,
		tilesUrl: false,
		port: 8080,
	};
	layer;
	server;
	constructor(source, options) {
		Object.assign(this.options, options);

		this.layer = { container: new Versatiles(source) }
	}
	async #prepareLayer() {
		let header;

		if (!this.layer.mime) {
			header ??= await this.layer.container.getHeader();
			this.layer.mime = MIMETYPES[header.tile_format] || 'application/octet-stream';
		}

		if (!this.layer.precompression) {
			header ??= await this.layer.container.getHeader();
			this.layer.precompression = header.tile_precompression;
		}

		return this.layer;
	}
	async start() {
		const layer = await this.#prepareLayer();
		const recompress = this.options.recompress || false;

		const staticContent = await this.#buildStaticContent(layer);

		this.server = createServer(async (req, res) => {

			if (req.method !== 'GET') return respondWithError('Method not allowed', 405);
			const p = (new URL(req.url, 'resolve://')).pathname;

			// construct base url from request headers
			//const baseurl = this.opt.base || (req.headers["x-forwarded-proto"] || "http") + '://' + (req.headers["x-forwarded-host"] || req.headers.host);

			try {
				let response = staticContent.get(p);
				if (response) {
					return respondWithContent(...response);
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

			return respondWithError('file not found: ' + p, 404);

			async function respondWithContent(data, mime, compression) {
				const accepted_encoding = req.headers['accept-encoding'] || '';
				const accept_gzip = accepted_encoding.includes('gzip');
				const accept_br = accepted_encoding.includes('br');

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

		const port = this.options.port;

		await new Promise(r => this.server.listen(port, () => r()));

		console.log(`listening on port ${port} `);
	}
	async #buildStaticContent(layer) {
		const staticContent = new StaticContent();

		await Promise.all([
			async () => {
				const html = await readFile(resolve(__dirname, 'static/index.html'));
				staticContent.add('/', html, 'text/html; charset=utf-8');
				staticContent.add('/index.html', html, 'text/html; charset=utf-8');
			},
			async () => staticContent.add(
				'/tiles/style.json',
				await generateStyle(layer.container, this.options),
				'application/json; charset=utf-8'
			),
			async () => staticContent.add(
				'/tiles/tile.json',
				await layer.container.getMeta(),
				'application/json; charset=utf-8'
			),
			async () => {
				let header = await layer.container.getHeader();
				header = Object.fromEntries('magic,version,tile_format,tile_precompression,zoom_min,zoom_max,bbox_min_x,bbox_min_y,bbox_max_x,bbox_max_y'.split(',').map(k => [k, header[k]]))
				staticContent.add('/tiles/header.json', header, 'application/json; charset=utf-8');
			}
		].map(f => f()))

		staticContent.addFolder('/assets', resolve(__dirname, 'static/assets'));

		return staticContent;
	}
}
