
import type { VersaTiles } from 'versatiles';
import { Colorful } from 'versatiles-styles';

const SHORTBREAD_LAYERS = [
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

export async function generateStyle(container: VersaTiles, options: Record<string, boolean | number | string | null>): Promise<string> {
	const tileFormat = await container.getTileFormat();

	switch (tileFormat) {
		case 'pbf':
			return generatePBFStyle();
		case 'png':
		case 'jpeg':
		case 'webp':
		case 'avif':
			throw new Error('not implemented yet');
		default:
			throw new Error(`can not generate style for tile format "${tileFormat}"`);
	}

	async function generatePBFStyle(): Promise<string> {
		const meta = await container.getMetadata();
		if (isShortbread(meta)) return generateShortbreadStyle();
		throw new Error('not implemented yet');
	}

	function generateShortbreadStyle(): string {
		const colorful = new Colorful();

		const baseUrl: string = (typeof options.baseUrl === 'string')
			? options.baseUrl
			: `http://localhost:${options.port}/`;

		colorful.glyphsUrl = (typeof options.glyphsUrl === 'string')
			? options.glyphsUrl
			: resolveUrl(baseUrl, '/assets/fonts/{fontstack}/{range}.pbf');

		colorful.spriteUrl = (typeof options.spriteUrl === 'string')
			? options.spriteUrl
			: resolveUrl(baseUrl, '/assets/sprites/sprites');

		colorful.tilesUrls = (typeof options.tilesUrl === 'string')
			? [options.tilesUrl]
			: [resolveUrl(baseUrl, '/tiles/{z}/{x}/{y}')];

		return JSON.stringify(colorful.build());
	}
}

function resolveUrl(...paths: string[]): string {
	paths = paths.map(path => path.replace(/[\{\}]/g, c => '%' + c.charCodeAt(0).toString(16)));
	let baseUrl = new URL(paths.shift() ?? '');
	paths.forEach(path => baseUrl = new URL(path, baseUrl));
	return baseUrl.href.replace(/\%7b/g, '{').replace(/\%7d/g, '}');
}

function isShortbread(meta: Buffer | object | string | null): boolean {
	if (meta == null) return false;

	try {
		if (Buffer.isBuffer(meta)) meta = meta.toString();
		if (typeof meta === 'string') meta = JSON.parse(meta) as object;

		if (!('vector_layers' in meta)) return false;
		const vectorLayers = meta.vector_layers;
		if (!Array.isArray(vectorLayers)) return false;

		const layerSet = new Set(vectorLayers.map((l: { id?: string }) => String(l.id)));
		const count = SHORTBREAD_LAYERS.reduce((s, id) => layerSet.has(id) ? s + 1 : s, 0);
		return count > 0.9 * SHORTBREAD_LAYERS.length;
	} catch (e) {
		return false;
	}
}
