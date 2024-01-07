
import type { Header as VersatilesHeader, Reader } from '@versatiles/container';
import type { MaplibreStyle } from '@versatiles/style/dist/lib/types.js';
import type { ResponderInterface } from './responder.js';
import type { File } from '@google-cloud/storage';
import { Container as VersatilesContainer } from '@versatiles/container';
import { guessStyle } from '@versatiles/style';
import { readFile } from 'node:fs/promises';



const filenamePreview = new URL('../../static/preview.html', import.meta.url).pathname;

const containerCache = new Map<string, {
	container: VersatilesContainer;
	header: VersatilesHeader;
	metadata: unknown;
}>();

// eslint-disable-next-line @typescript-eslint/max-params
export async function serveVersatiles(file: File, path: string, query: string, responder: ResponderInterface): Promise<void> {
	if (responder.verbose) console.log(`  #${responder.requestNo} serve versatiles`);

	let container: VersatilesContainer;
	let header: VersatilesHeader;
	let metadata: unknown = {};

	const cache = containerCache.get(file.name);
	if (cache == null) {
		const reader: Reader = async (position: number, length: number): Promise<Buffer> => {
			return new Promise<Buffer>((resolve, reject) => {
				const buffers = Array<Buffer>();
				file.createReadStream({ start: position, end: position + length - 1 })
					.on('data', (chunk: Buffer) => buffers.push(chunk))
					.on('end', () => {
						resolve(Buffer.concat(buffers));
					})
					.on('error', err => {
						reject(`error accessing bucket stream - ${String(err)}`);
					});
			});
		};

		container = new VersatilesContainer(reader);
		header = await container.getHeader();

		try {
			metadata = JSON.parse(await container.getMetadata() ?? '');
		} catch (e) { }

		if (responder.verbose) {
			console.log(`  #${responder.requestNo} header: ${JSON.stringify(header)}`);
			console.log(`  #${responder.requestNo} metadata: ${JSON.stringify(metadata).slice(0, 80)}`);
		}

		containerCache.set(file.name, { container, header, metadata });
	} else {
		({ container, header, metadata } = cache);
	}

	if (responder.verbose) console.log(`  #${responder.requestNo} query: ${JSON.stringify(query)}`);

	switch (query) {
		case 'preview':
			if (responder.verbose) console.log(`  #${responder.requestNo} respond preview`);
			await responder.respond(await readFile(filenamePreview), 'text/html', 'raw');
			return;
		case 'meta.json':
			if (responder.verbose) console.log(`  #${responder.requestNo} respond with meta.json`);
			await responder.respond(JSON.stringify(metadata), 'application/json', 'raw');
			return;
		case 'style.json':
			if (responder.verbose) console.log(`  #${responder.requestNo} respond with style.json`);

			let style: MaplibreStyle;
			const format = header.tileFormat;
			const options = {
				tiles: [`${path}?tiles/{z}/{x}/{y}`],
				format,
				bounds: header.bbox,
				minzoom: header.zoomMin,
				maxzoom: header.zoomMax,
			};
			switch (format) {
				case 'jpeg': style = guessStyle({ ...options, format: 'jpg' }); break;
				case 'webp':
				case 'png':
				case 'avif':
					style = guessStyle({ ...options, format });
					break;
				case 'pbf':
					if (metadata == null) {
						responder.error(500, 'metadata must be defined');
						return;
					}
					if (typeof metadata !== 'object') {
						responder.error(500, 'metadata must be an object');
						return;
					}
					if (!('vector_layers' in metadata)) {
						responder.error(500, 'metadata must contain property vector_layers');
						return;
					}
					const vectorLayers = metadata.vector_layers;
					if (!Array.isArray(vectorLayers)) {
						responder.error(500, 'metadata.vector_layers must be an array');
						return;
					}
					style = guessStyle({ ...options, format, vectorLayers });
					break;
				case 'bin':
				case 'geojson':
				case 'json':
				case 'svg':
				case 'topojson':
					responder.error(500, `tile format "${format}" is not supported`);
					return;
			}
			await responder.respond(JSON.stringify(style), 'application/json', 'raw');
			return;
	}

	const match = /tiles\/(?<z>\d+)\/(?<x>\d+)\/(?<y>\d+)/.exec(query);
	if (match == null) {
		responder.error(400, 'get parameter must be "meta.json", "style.json", or "tile/{z}/{x}/{y}"');
		return;
	}

	const { z, x, y } = match.groups as { x: string; y: string; z: string };
	if (responder.verbose) console.log(`  #${responder.requestNo} fetch tile x:${x}, y:${y}, z:${z}`);

	const tile = await container.getTile(
		parseInt(z, 10),
		parseInt(x, 10),
		parseInt(y, 10),
	);
	if (tile == null) {
		responder.error(404, `map tile {x:${x}, y:${y}, z:${z}} not found`);
	} else {
		if (responder.verbose) console.log(`  #${responder.requestNo} return tile ${z}/${x}/${y}`);
		await responder.respond(tile, header.tileMime, header.tileCompression);
	}

	return;
}