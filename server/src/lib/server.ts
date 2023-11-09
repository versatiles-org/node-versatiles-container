import type { Server as httpServer } from 'node:http';
import { createServer } from 'node:http';
import { resolve as resolvePath } from 'node:path';
import { readFile } from 'node:fs/promises';
import { generateStyle } from './style.js';
import { gzip, ungzip, brotli, unbrotli } from './compressors.js';
import { StaticContent } from './static_content.js';
import type { Compression, Reader } from '@versatiles/container';
import { VersaTiles } from '@versatiles/container';

const DIRNAME = new URL('../../', import.meta.url).pathname;

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

export interface Options {
	compress?: boolean;
	baseUrl?: string;
	glyphsUrl?: string;
	spriteUrl?: string;
	tilesUrl?: string;
	host?: string;
	port?: number;
	tms?: boolean;
}

export class Server {
	private readonly options: Options = {
		compress: true,
		port: 8080,
		host: '0.0.0.0',
	};

	private readonly layer: Layer;

	private server?: httpServer;

	public constructor(source: Reader | string, options: Options) {
		Object.assign(this.options, options);

		this.layer = {
			container: new VersaTiles(source, { tms: options.tms ?? false }),
		};
	}

	public getUrl(): string {
		return `http://${this.options.host}:${this.options.port}/`;
	}

	public async start(): Promise<void> {
		const layer = await this.#prepareLayer();
		const compress = this.options.compress ?? false;

		const staticContent = await this.#buildStaticContent(layer);

		const server = createServer((req, res) => {
			void (async (): Promise<void> => {
				try {
					if (req.method !== 'GET') {
						respondWithError('Method not allowed', 405); return;
					}
					if (!(req.url ?? '')) {
						respondWithError('URL not found', 404); return;
					}
					const p = new URL(req.url ?? '', 'resolve://').pathname;

					const response = staticContent.get(p);
					if (response) {
						await respondWithContent(...response); return;
					}

					const match = /^\/tiles\/([0-9]+)\/([0-9]+)\/([0-9]+).*/.exec(p);
					if (match) {
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

				async function respondWithContent(data: Buffer | string, mime?: string, compression?: Compression): Promise<void> {
					mime ??= 'application/octet-stream';
					compression ??= null;

					const acceptedEncoding = req.headers['accept-encoding'] ?? '';
					const acceptGzip = acceptedEncoding.includes('gzip');
					const acceptBr = acceptedEncoding.includes('br');

					if (typeof data === 'string') data = Buffer.from(data);

					switch (compression) {
						case 'br':
							if (acceptBr) break;
							if (compress && acceptGzip) {
								data = await gzip(await unbrotli(data));
								compression = 'gzip';
								break;
							}
							data = await unbrotli(data);
							compression = null;
							break;
						case 'gzip':
							if (acceptGzip) break;
							data = await ungzip(data);
							compression = null;
							break;
						default:
							if (compress && acceptBr) {
								data = await brotli(data);
								compression = 'br';
								break;
							}
							if (compress && acceptGzip) {
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

				function respondWithError(err: unknown, code = 500): void {
					console.error(err);
					res.statusCode = code;
					res.setHeader('content-type', 'text/plain');
					res.end(String(err));
				}
			})();
		});

		this.server = server;

		const { host, port } = this.options;

		await new Promise<void>(r => server.listen(port, host, () => {
			r();
		}));

		console.log(`listening on port ${port}`);
	}

	public async stop(): Promise<void> {
		if (this.server === undefined) return;
		await new Promise<void>((resolve, reject) => {
			this.server?.close(err => {
				if (err) reject(err);
				else resolve();
			});
		});
		this.server = undefined;
	}

	async #prepareLayer(): Promise<Layer> {
		let header;

		if (this.layer.mime == null) {
			header ??= await this.layer.container.getHeader();
			this.layer.mime = MIMETYPES[header.tileFormat ?? '?'] || 'application/octet-stream';
		}

		if (!this.layer.compression) {
			header ??= await this.layer.container.getHeader();
			this.layer.compression = header.tileCompression;
		}

		return this.layer;
	}

	async #buildStaticContent(layer: Layer): Promise<StaticContent> {
		const staticContent = new StaticContent();

		await Promise.all([
			async (): Promise<void> => {
				const html = await readFile(resolvePath(DIRNAME, 'static/index.html'));
				staticContent.add('/', html, 'text/html; charset=utf-8');
				staticContent.add('/index.html', html, 'text/html; charset=utf-8');
			},
			async (): Promise<void> => {
				staticContent.add(
					'/tiles/style.json',
					await generateStyle(layer.container, { ...this.options }),
					'application/json; charset=utf-8',
				);
			},
			async (): Promise<void> => {
				staticContent.add(
					'/tiles/tile.json',
					await layer.container.getMetadata() ?? {},
					'application/json; charset=utf-8',
				);
			},
			async (): Promise<void> => {
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

		staticContent.addFolder('/assets', resolvePath(DIRNAME, 'static/assets'));

		return staticContent;
	}
}

interface Layer {
	container: VersaTiles;
	mime?: string;
	compression?: Compression;
}