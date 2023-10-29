
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

export async function generateStyle(container, options) {
	let tileFormat = await container.getTileFormat();

	switch (tileFormat) {
		case 'pbf':
			return await generatePBFStyle();
		case 'png':
		case 'jpeg':
		case 'webp':
		case 'avif':
			throw new Error('not implemented yet');
		default:
			throw new Error(`can not generate style for tile format "${tileFormat}"`);
	}

	async function generatePBFStyle() {
		let meta = await container.getMetadata();
		if (isShortbread(meta)) return generateShortbreadStyle();
		throw new Error('not implemented yet');
	}

	function generateShortbreadStyle() {
		let baseUrl = options.baseUrl || `http://localhost:${options.port}/`;
		let glyphsUrl = options.glyphsUrl || resolveUrl(baseUrl, '/assets/fonts/{fontstack}/{range}.pbf');
		let spriteUrl = options.spriteUrl || resolveUrl(baseUrl, '/assets/sprites/sprites');
		let tilesUrl = options.tilesUrl || resolveUrl(baseUrl, '/tiles/{z}/{x}/{y}');
		if (!Array.isArray(tilesUrl)) tilesUrl = [tilesUrl];

		let style = colorful({
			glyphsUrl,
			spriteUrl,
			tilesUrl,
		})

		return style
	}
}

function resolveUrl(...paths) {
	paths = paths.map(path => path.replace(/[\{\}]/g, c => '%' + c.charCodeAt(0).toString(16)))
	let baseUrl = paths.shift();
	paths.forEach(path => baseUrl = (new URL(path, baseUrl)).href);
	baseUrl = baseUrl.replace(/\%7b/g, '{').replace(/\%7d/g, '}')
	return baseUrl;
}

function isShortbread(meta) {
	try {

		if (Buffer.isBuffer(meta)) meta = meta.toString();
		if (typeof meta === 'string') meta = JSON.parse(meta);

		let layerSet = new Set(meta.vector_layers.map(l => l.id));
		let count = SHORTBREAD_LAYERS.reduce((s, id) => s + layerSet.has(id), 0);
		return count > 0.9 * SHORTBREAD_LAYERS.length;
	} catch (e) {
		return false;
	}
}
