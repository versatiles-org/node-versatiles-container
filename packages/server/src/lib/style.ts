import { guessStyle } from '@versatiles/style';
import type { ContainerInfo, ServerOptions } from './types.js';

/** 
 * Asynchronously generates a style string based on the given container and options.
 * 
 * @param {VersaTiles} container - An instance of the VersaTiles container.
 * @param {Record<string, any>} options - An object containing options for style generation.
 * @returns {Promise<string>} A promise that resolves to a style string.
 */
export function generateStyle(containerInfo: ContainerInfo, options: ServerOptions): string {
	if (typeof options.port !== 'number') throw Error('generateStyle: port must be defined');

	const { tileFormat } = containerInfo.header;
	let format: 'avif' | 'jpg' | 'pbf' | 'png' | 'webp';
	switch (tileFormat) {
		case 'jpeg': format = 'jpg'; break;
		case 'avif':
		case 'png':
		case 'webp':
		case 'pbf': format = tileFormat; break;
		case 'bin':
		case 'geojson':
		case 'json':
		case 'svg':
		case 'topojson':
			throw new Error('unknown tile format ' + tileFormat);
	}

	const baseUrl = options.baseUrl ?? `http://localhost:${options.port}/`;
	const { metadata } = containerInfo;

	const style = guessStyle({
		format,
		tiles: [options.tilesUrl ?? '/tiles/{z}/{x}/{y}'],
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
		vectorLayers: JSON.parse(metadata ?? '')?.vector_layers,
		baseUrl,
	});

	return JSON.stringify(style);
}
