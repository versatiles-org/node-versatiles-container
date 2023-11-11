import type { Server as httpServer } from 'node:http';
import { createServer } from 'node:http';
import { resolve as resolvePath } from 'node:path';
import { readFile } from 'node:fs/promises';
import { generateStyle } from './style.js';
import { StaticContent } from './static_content.js';
import type { Compression, Reader } from '@versatiles/container';
import { VersaTiles } from '@versatiles/container';
import { respondWithContent, respondWithError } from './response.js';
import type { ResponseConfig } from './types.js';

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
	private readonly options: Options = {};

	private readonly layer: Layer;

	private server?: httpServer;

	public constructor(source: Reader | string, options: Options) {
		Object.assign(this.options, options);

		this.options.compress ??= true;
		this.options.port ??= 8080;
		this.options.host ??= '0.0.0.0';
		this.options.baseUrl ??= `http://localhost:${this.options.port}/`;

		this.layer = {
			container: new VersaTiles(source, { tms: options.tms ?? false }),
		};
	}

	public getUrl(): string {
		return this.options.baseUrl ?? `http://localhost:${this.options.port}/`;
	}

	public async start(): Promise<void> {
		const layer = await this.#prepareLayer();
		const recompress = this.options.compress ?? false;

		const staticContent = await this.#buildStaticContent(layer);

		const server = createServer((req, res) => {
			void (async (): Promise<void> => {
				try {
					if (req.method !== 'GET') {
						respondWithError(res, 'Method not allowed', 405); return;
					}

					if (!(req.url ?? '')) {
						respondWithError(res, 'URL not found', 404); return;
					}

					// check request

					const acceptedEncoding = req.headers['accept-encoding'] ?? '';
					const responseConfig: ResponseConfig = {
						acceptBr: acceptedEncoding.includes('br'),
						acceptGzip: acceptedEncoding.includes('gzip'),
						recompress,
					};

					const path = new URL(req.url ?? '', 'resolve://').pathname;

					// check if tile request

					const match = /^\/tiles\/([0-9]+)\/([0-9]+)\/([0-9]+).*/.exec(path);
					if (match) {
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const [_, z, x, y] = match;
						const buffer = await layer.container.getTile(parseInt(z, 10), parseInt(x, 10), parseInt(y, 10));
						if (!buffer) {
							respondWithError(res, 'tile not found: ' + path, 404); return;
						}
						await respondWithContent(res,
							{ buffer, mime: layer.mime, compression: layer.compression },
							responseConfig);
						return;
					}

					// check if request for static content

					const responseContent = staticContent.get(path);

					if (responseContent) {
						await respondWithContent(res, responseContent, responseConfig); return;
					}

					// error 404

					respondWithError(res, 'file not found: ' + path, 404); return;

				} catch (err) {
					respondWithError(res, err, 500); return;
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