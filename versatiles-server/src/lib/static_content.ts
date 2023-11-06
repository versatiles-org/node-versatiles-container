
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import type { Compression } from 'versatiles';

export class StaticContent {
	readonly #map: Map<string, StaticResponse>;

	public constructor() {
		this.#map = new Map();
	}

	public get(path: string): StaticResponse | undefined {
		return this.#map.get(path);
	}

	// eslint-disable-next-line @typescript-eslint/max-params
	public add(path: string, content: Buffer | object | string, mime: string, compression: Compression = null): void {
		// eslint-disable-next-line @typescript-eslint/init-declarations
		let buffer: Buffer;
		if (Buffer.isBuffer(content)) {
			buffer = content;
		} else if (typeof content === 'string') {
			buffer = Buffer.from(content);
		} else {
			buffer = Buffer.from(JSON.stringify(content));
		}
		if (this.#map.has(path)) throw Error();
		this.#map.set(path, [buffer, mime, compression]);
	}

	public addFolder(url: string, dir: string): void {
		if (!existsSync(dir)) return;

		readdirSync(dir).forEach(name => {
			if (name.startsWith('.')) return;

			const subDir = resolve(dir, name);
			const subUrl = urlResolve(url, name);

			if (statSync(subDir).isDirectory()) {
				this.addFolder(subUrl, subDir);
			} else {
				let mime = 'application/octet-stream';
				const ext = extname(subDir);

				switch (ext.toLowerCase()) {
					case '.avif': mime = 'image/avif'; break;
					case '.bin': mime = 'application/octet-stream'; break;
					case '.css': mime = 'text/css'; break;
					case '.geojson': mime = 'application/geo+json'; break;
					case '.htm': mime = 'text/html'; break;
					case '.html': mime = 'text/html'; break;
					case '.jpeg': mime = 'image/jpeg'; break;
					case '.jpg': mime = 'image/jpeg'; break;
					case '.js': mime = 'text/javascript'; break;
					case '.json': mime = 'application/json'; break;
					case '.pbf': mime = 'application/x-protobuf'; break;
					case '.png': mime = 'image/png'; break;
					case '.svg': mime = 'image/svg+xml'; break;
					case '.topojson': mime = 'application/topo+json'; break;
					case '.webp': mime = 'image/webp'; break;
					default:
						console.warn('unknown file extension: ' + ext);
				}

				this.add(subUrl, readFileSync(subDir), mime);
			}
		});

		function urlResolve(from: string, to: string): string {
			if (!from.endsWith('/')) from += '/';
			const resolvedUrl = new URL(to, new URL(from, 'resolve://'));
			return resolvedUrl.pathname;
		}
	}

}

type StaticResponse = [Buffer, string, Compression];
