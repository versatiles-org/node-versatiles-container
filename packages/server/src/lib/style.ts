import { guessStyle } from '@versatiles/style';
import type { ContainerInfo, ServerOptions } from './types.js';

/** 
 * Constant array representing the layers in the Shortbread styling.
 */
export const SHORTBREAD_LAYERS = [
	'place_labels',
	'addresses',
	'aerialways',
	'boundaries',
	'boundary_labels',
	'bridges',
	'buildings',
	'dam_lines',
	'dam_polygons',
	'ferries',
	'land',
	'ocean',
	'pier_lines',
	'pier_polygons',
	'pois',
	'public_transport',
	'sites',
	'street_labels_points',
	'street_labels',
	'street_polygons',
	'streets_polygons_labels',
	'streets',
	'water_lines_labels',
	'water_lines',
	'water_polygons_labels',
	'water_polygons',
];

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

/**
 * Resolves a complete URL from given path segments.
 * 
 * @param {...string[]} paths - An array of path segments to be resolved into a URL.
 * @returns {string} The fully resolved URL.
 */
export function resolveUrl(...paths: string[]): string {
	paths = paths.map(path => path.replace(/[\{\}]/g, c => '%' + c.charCodeAt(0).toString(16)));

	const pathStart = paths.shift();
	let baseUrl: URL;
	try {
		baseUrl = new URL(pathStart ?? '', 'https://tiles.versatiles.org/');
	} catch (error) {
		throw Error(`Invalid URL. pathStart = "${pathStart}"`);
	}

	paths.forEach(path => baseUrl = new URL(path, baseUrl));
	return baseUrl.href.replace(/\%7b/g, '{').replace(/\%7d/g, '}');
}