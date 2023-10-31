import { createServer, Server as httpServer } from 'node:http';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Compression, Format, Reader, VersaTiles } from 'versatiles';
import { generateStyle } from './style.js';
import { gzip, ungzip, brotli, unbrotli } from './compressors.js';
import { StaticContent } from './static_content.js';

const __dirname = (new URL('../', import.meta.url)).pathname;

const MIMETYPES: { [format: string]: string } = {
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
}

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
	constructor(source: string | Reader, options: any) {
		Object.assign(this.options, options);

		this.layer = { container: new VersaTiles(source) }
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

		let server: httpServer = createServer(async (req, res) => {
			try {
				if (req.method !== 'GET') return respondWithError('Method not allowed', 405);
				if (!req.url) return respondWithError('URL not found', 404);
				const p = (new URL(req.url, 'resolve://')).pathname;

				let response = staticContent.get(p);
				if (response) {
					return respondWithContent(...response);
				}

				let match;
				if (match = p.match(/^\/tiles\/(?[0-9]+)\/(?[0-9]+)\/(?[0-9]+).*/)) {
					let [_, z, x, y] = match;
					let tile = await layer.container.getTile(parseInt(z, 10), parseInt(x, 10), parseInt(y, 10));
					if (!tile) return respondWithError('tile not found: ' + p, 404);
					return respondWithContent(tile, layer.mime, layer.compression);
				}

				return respondWithError('file not found: ' + p, 404);

			} catch (err) {
				return respondWithError(err, 500);
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

		const port = this.options.port;

		await new Promise<void>(r => server.listen(port, () => r()));
		this.server = server;

		console.log(`listening on port ${port} `);
	}
	async #buildStaticContent(layer: Layer) {
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
				await layer.container.getMetadata() || {},
				'application/json; charset=utf-8'
			),
			async () => {
				let header = await layer.container.getHeader();
				staticContent.add('/tiles/header.json', {
					bbox: header.bbox,
					tileCompression: header.tileCompression,
					tileFormat: header.tileFormat,
					version: header.version,
					zoomMax: header.zoomMax,
					zoomMin: header.zoomMin,
				}, 'application/json; charset=utf-8');
			}
		].map(f => f()))

		staticContent.addFolder('/assets', resolve(__dirname, 'static/assets'));

		return staticContent;
	}
}

type Layer = {
	container: VersaTiles,
	mime?: string;
	compression?: Compression;
};