
import type { Compression } from '@versatiles/container';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const mimeTypes = new Map([
	['.avif', 'image/avif'],
	['.bin', 'application/octet-stream'],
	['.css', 'text/css'],
	['.geojson', 'application/geo+json'],
	['.htm', 'text/html'],
	['.html', 'text/html'],
	['.jpeg', 'image/jpeg'],
	['.jpg', 'image/jpeg'],
	['.js', 'text/javascript'],
	['.json', 'application/json'],
	['.pbf', 'application/x-protobuf'],
	['.png', 'image/png'],
	['.svg', 'image/svg+xml'],
	['.topojson', 'application/topo+json'],
	['.webp', 'image/webp'],
]);

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
				const ext = extname(subDir);
				const mime = mimeTypes.get(ext.toLowerCase());

				if (mime == null) {
					console.warn('unknown file extension: ' + ext);
				}

				this.add(subUrl, readFileSync(subDir), mime ?? 'application/octet-stream');
			}
		});

		function urlResolve(from: string, to: string): string {
			if (!from.endsWith('/')) from += '/';
			const resolvedUrl = new URL(to, new URL(from, 'resolve://'));
			return resolvedUrl.pathname;
		}
	}

	public getContentList(): Map<string, StaticResponse> {
		return this.#map;
	}
}

type StaticResponse = [Buffer, string, Compression];
