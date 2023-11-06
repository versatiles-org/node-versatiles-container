
import type { VersaTiles } from 'versatiles';
import { colorful } from 'versatiles-styles';

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

export async function generateStyle(container: VersaTiles, options) {
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

	async function generatePBFStyle() {
		const meta = await container.getMetadata();
		if (isShortbread(meta)) return generateShortbreadStyle();
		throw new Error('not implemented yet');
	}

	function generateShortbreadStyle() {
		const baseUrl = options.baseUrl || `http://localhost:${options.port}/`;
		const glyphsUrl = options.glyphsUrl || resolveUrl(baseUrl, '/assets/fonts/{fontstack}/{range}.pbf');
		const spriteUrl = options.spriteUrl || resolveUrl(baseUrl, '/assets/sprites/sprites');
		let tilesUrl = options.tilesUrl || resolveUrl(baseUrl, '/tiles/{z}/{x}/{y}');
		if (!Array.isArray(tilesUrl)) tilesUrl = [tilesUrl];

		const style = colorful({
			glyphsUrl,
			spriteUrl,
			tilesUrl,
		});

		return style;
	}
}

function resolveUrl(...paths: string[]): string {
	paths = paths.map(path => path.replace(/[\{\}]/g, c => '%' + c.charCodeAt(0).toString(16)));
	let baseUrl = new URL(paths.shift() || '');
	paths.forEach(path => baseUrl = new URL(path, baseUrl));
	return baseUrl.href.replace(/\%7b/g, '{').replace(/\%7d/g, '}');
}

function isShortbread(meta: Buffer | object | string | null): boolean {
	if (!meta) return false;

	try {
		let obj: object;
		if (Buffer.isBuffer(meta)) {
			obj = JSON.parse(meta.toString());
		} else if (typeof meta === 'string') {
			obj = JSON.parse(meta);
		} else {
			obj = meta;
		}
		if (!('vector_layers' in obj)) return false;
		const vectorLayers = obj.vector_layers;
		if (!Array.isArray(vectorLayers)) return false;

		const layerSet = new Set(vectorLayers.map(l => l.id));
		const count = SHORTBREAD_LAYERS.reduce((s, id) => layerSet.has(id) ? s + 1 : s, 0);
		return count > 0.9 * SHORTBREAD_LAYERS.length;
	} catch (e) {
		return false;
	}
}
