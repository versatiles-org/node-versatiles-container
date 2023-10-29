
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export class StaticContent {
	map;
	constructor() {
		this.map = new Map();
	}
	get(path) {
		return this.map.get(path)
	}
	add(path, content, mime, compression) {
		if (!Buffer.isBuffer(content)) {
			if (typeof content === 'object') content = JSON.stringify(content);
			if (typeof content === 'string') content = Buffer.from(content);
		}
		if (this.map.has(path)) throw Error();
		this.map.set(path, [content, mime, compression]);
	}
	addFolder(url, dir) {
		if (!existsSync(dir)) return;

		const rec = (url, dir) => {
			readdirSync(dir).forEach(name => {
				if (name.startsWith('.')) return;

				let subDir = path.resolve(dir, name);
				let subUrl = urlResolve(url, name);

				if (statSync(subDir).isDirectory()) {
					rec(subUrl, subDir)
				} else {
					let mime = 'application/octet-stream';
					let ext = path.extname(subDir);

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
			})
		}
		rec(url, dir);

		function urlResolve(from, to) {
			if (!from.endsWith('/')) from += '/';
			let resolvedUrl = new URL(to, new URL(from, 'resolve://'));
			return resolvedUrl.pathname;
		}
	}
}