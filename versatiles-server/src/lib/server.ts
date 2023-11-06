import type { Server as httpServer } from 'node:http';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Compression, Reader } from 'versatiles';
import { Format, VersaTiles } from 'versatiles';
import { generateStyle } from './style.js';
import { gzip, ungzip, brotli, unbrotli } from './compressors.js';
import { StaticContent } from './static_content.js';

const __dirname = new URL('../', import.meta.url).pathname;

const MIMETYPES: Record<string, string> = {
	'bin': 'application/octet-stream',
	'png': 'image/png',
	'jpeg': 'image/jpeg',
	'webp': 'image/webp',
	'avif': 'image/avif',
	'svg': 'image/svg+xml',
	'pbf': 'application/x-protobuf',
	'geojson': 'application/geo+json',
	'topojson': 'application/topo+json',
	'json': 'application/json',
};

export class Server {
	options = {
		compress: false,
		baseUrl: false,
		glyphsUrl: false,
		spriteUrl: false,
		tilesUrl: false,
		port: 8080,
	};

	layer: Layer;

	server?: httpServer;

	constructor(source: Reader | string, options: any) {
		Object.assign(this.options, options);

		this.layer = { container: new VersaTiles(source) };
	}

	async #prepareLayer() {
		let header;

		if (!this.layer.mime) {
			header ??= await this.layer.container.getHeader();
			this.layer.mime = MIMETYPES[header.tileFormat || '?'] || 'application/octet-stream';
		}

		if (!this.layer.compression) {
			header ??= await this.layer.container.getHeader();
			this.layer.compression = header.tileCompression;
		}

		return this.layer;
	}

	async start() {
		const layer = await this.#prepareLayer();
		const compress = this.options.compress || false;

		const staticContent = await this.#buildStaticContent(layer);

		const server: httpServer = createServer(async(req, res) => {
			try {
				if (req.method !== 'GET') {
					respondWithError('Method not allowed', 405); return; 
				}
				if (!req.url) {
					respondWithError('URL not found', 404); return; 
				}
				const p = new URL(req.url, 'resolve://').pathname;

				const response = staticContent.get(p);
				if (response) {
					await respondWithContent(...response); return;
				}

				let match;
				if (match = /^\/tiles\/(?[0-9]+)\/(?[0-9]+)\/(?[0-9]+).*/.exec(p)) {
					const [_, z, x, y] = match;
					const tile = await layer.container.getTile(parseInt(z, 10), parseInt(x, 10), parseInt(y, 10));
					if (!tile) {
						respondWithError('tile not found: ' + p, 404); return; 
					}
					await respondWithContent(tile, layer.mime, layer.compression); return;
				}

				respondWithError('file not found: ' + p, 404); return;

			} catch (err) {
				respondWithError(err, 500); return;
			}

			async function respondWithContent(data: Buffer | string, mime?: string, compression?: Compression) {
				mime ??= 'application/octet-stream';
				compression ??= null;

				const accepted_encoding = req.headers['accept-encoding'] || '';
				const accept_gzip = accepted_encoding.includes('gzip');
				const accept_br = accepted_encoding.includes('br');

				if (typeof data === 'string') data = Buffer.from(data);

				switch (compression) {
					case 'br':
						if (accept_br) break;
						if (compress && accept_gzip) {
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
						if (compress && accept_br) {
							data = await brotli(data);
							compression = 'br';
							break;
						}
						if (compress && accept_gzip) {
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

			function respondWithError(err: any, code = 500) {
				console.error(err);
				res.statusCode = code;
				res.setHeader('content-type', 'text/plain');
				res.end(String(err));
			}
		});

		const { port } = this.options;

		await new Promise<void>(r => server.listen(port, () => {
			r(); 
		}));
		this.server = server;

		console.log(`listening on port ${port} `);
	}

	async #buildStaticContent(layer: Layer) {
		const staticContent = new StaticContent();

		await Promise.all([
			async() => {
				const html = await readFile(resolve(__dirname, 'static/index.html'));
				staticContent.add('/', html, 'text/html; charset=utf-8');
				staticContent.add('/index.html', html, 'text/html; charset=utf-8');
			},
			async() => {
				staticContent.add(
					'/tiles/style.json',
					await generateStyle(layer.container, this.options),
					'application/json; charset=utf-8',
				); 
			},
			async() => {
				staticContent.add(
					'/tiles/tile.json',
					await layer.container.getMetadata() || {},
					'application/json; charset=utf-8',
				); 
			},
			async() => {
				const header = await layer.container.getHeader();
				staticContent.add('/tiles/header.json', {
					bbox: header.bbox,
					tileCompression: header.tileCompression,
					tileFormat: header.tileFormat,
					version: header.version,
					zoomMax: header.zoomMax,
					zoomMin: header.zoomMin,
				}, 'application/json; charset=utf-8');
			},
		].map(async f => f()));

		staticContent.addFolder('/assets', resolve(__dirname, 'static/assets'));

		return staticContent;
	}
}

interface Layer {
	container: VersaTiles;
	mime?: string;
	compression?: Compression;
}