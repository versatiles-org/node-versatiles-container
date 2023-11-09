/* eslint-disable @typescript-eslint/naming-convention */
import { createHash } from 'node:crypto';
import type { Block } from './index.js';
import { VersaTiles } from './index.js';

const TESTFILE = new URL('../../test/island.versatiles', import.meta.url).pathname;

describe('VersaTiles', () => {
	const versatiles = new VersaTiles(TESTFILE);

	describe('getHeader', () => {
		it('should return the header', async () => {
			expect(await versatiles.getHeader()).toEqual({
				magic: 'versatiles_v02',
				version: 'v02',
				tileFormat: 'pbf',
				tileCompression: 'br',
				zoomMin: 8,
				zoomMax: 14,
				bbox: [-97.8662109, 62.6034531, -97.7124023, 62.6842281],
				metaOffset: 66,
				metaLength: 628,
				blockIndexOffset: 374009,
				blockIndexLength: 158,
			});
		});
	});

	describe('getMetadata', () => {
		it('should return metadata', async () => {
			const metadata = {
				vector_layers: [
					{ id: 'place_labels', minzoom: 3, maxzoom: 14, fields: { kind: 'String', name: 'String', name_de: 'String', name_en: 'String', population: 'Number' } },
					{ id: 'boundaries', minzoom: 0, maxzoom: 14, fields: { admin_level: 'Number', coastline: 'Boolean', disputed: 'Boolean', maritime: 'Boolean' } },
					{ id: 'boundary_labels', minzoom: 2, maxzoom: 14, fields: { admin_level: 'Number', land_area: 'Number', name: 'String', name_de: 'String', name_en: 'String', name_full: 'String', name_latin: 'String', way_area: 'Number' } },
					{ id: 'addresses', minzoom: 14, maxzoom: 14, fields: { housename: 'String', housenumber: 'String' } },
					{ id: 'water_lines', minzoom: 4, maxzoom: 14, fields: { bridge: 'Boolean', kind: 'String', tunnel: 'Boolean' } },
					{ id: 'water_lines_labels', minzoom: 4, maxzoom: 14, fields: { bridge: 'Boolean', kind: 'String', name: 'String', name_de: 'String', name_en: 'String', tunnel: 'Boolean' } },
					{ id: 'dam_lines', minzoom: 12, maxzoom: 14, fields: { kind: 'String' } },
					{ id: 'dam_polygons', minzoom: 12, maxzoom: 14, fields: { kind: 'String' } },
					{ id: 'pier_lines', minzoom: 12, maxzoom: 14, fields: { kind: 'String' } },
					{ id: 'pier_polygons', minzoom: 12, maxzoom: 14, fields: { kind: 'String' } },
					{ id: 'bridges', minzoom: 12, maxzoom: 14, fields: { kind: 'String' } },
					{ id: 'street_polygons', minzoom: 11, maxzoom: 14, fields: { bridge: 'Boolean', kind: 'String', name: 'String', name_de: 'String', name_en: 'String', rail: 'Boolean', service: 'String', surface: 'String', tunnel: 'Boolean' } },
					{ id: 'streets_polygons_labels', minzoom: 14, maxzoom: 14, fields: { kind: 'String', name: 'String', name_de: 'String', name_en: 'String' } },
					{ id: 'ferries', minzoom: 8, maxzoom: 14, fields: { kind: 'String', name: 'String', name_de: 'String', name_en: 'String' } },
					{ id: 'streets', minzoom: 14, maxzoom: 14, fields: { bicycle: 'String', bridge: 'Boolean', horse: 'String', kind: 'String', link: 'Boolean', oneway: 'Boolean', oneway_reverse: 'Boolean', rail: 'Boolean', service: 'String', surface: 'String', tracktype: 'String', tunnel: 'Boolean' } },
					{ id: 'street_labels', minzoom: 10, maxzoom: 14, fields: { kind: 'String', name: 'String', name_de: 'String', name_en: 'String', ref: 'String', ref_cols: 'Number', ref_rows: 'Number', tunnel: 'Boolean' } },
					{ id: 'street_labels_points', minzoom: 12, maxzoom: 14, fields: { 'kind': 'String', 'name': 'String', 'name_de': 'String', 'name_en': 'String', 'ref': 'String' } },
					{ id: 'aerialways', minzoom: 12, maxzoom: 14, fields: { kind: 'String' } },
					{ id: 'public_transport', minzoom: 11, maxzoom: 14, fields: { iata: 'String', kind: 'String', name: 'String', name_de: 'String', name_en: 'String', station: 'String' } },
					{ id: 'buildings', minzoom: 14, maxzoom: 14, fields: { amenity: 'String', cuisine: 'String', denomination: 'String', dummy: 'Number', historic: 'String', housename: 'String', housenumber: 'String', information: 'String', man_made: 'String', name: 'String', name_de: 'String', name_en: 'String', religion: 'String', shop: 'String', tourism: 'String' } },
					{ id: 'water_polygons', minzoom: 4, maxzoom: 14, fields: { kind: 'String', way_area: 'Number' } },
					{ id: 'ocean', minzoom: 8, maxzoom: 14, fields: { x: 'Number', y: 'Number' } },
					{ id: 'water_polygons_labels', minzoom: 14, maxzoom: 14, fields: { kind: 'String', name: 'String', name_de: 'String', name_en: 'String', way_area: 'Number' } },
					{ id: 'land', minzoom: 7, maxzoom: 14, fields: { amenity: 'String', housenumber: 'String', kind: 'String', leisure: 'String', name: 'String', name_de: 'String', name_en: 'String', 'recycling:clothes': 'Boolean', 'recycling:glass_bottles': 'Boolean', 'recycling:paper': 'Boolean', 'recycling:scrap_metal': 'Boolean' } },
					{ id: 'sites', minzoom: 14, maxzoom: 14, fields: { amenity: 'String', kind: 'String', name: 'String', name_de: 'String', name_en: 'String' } },
					{ id: 'pois', minzoom: 14, maxzoom: 14, fields: { amenity: 'String', atm: 'Boolean', cuisine: 'String', denomination: 'String', emergency: 'String', highway: 'String', historic: 'String', information: 'String', leisure: 'String', man_made: 'String', name: 'String', name_de: 'String', name_en: 'String', 'recycling:clothes': 'Boolean', 'recycling:glass_bottles': 'Boolean', 'recycling:paper': 'Boolean', 'recycling:scrap_metal': 'Boolean', religion: 'String', shop: 'String', sport: 'String', tourism: 'String', 'tower:type': 'String', vending: 'String' } },
				],
			};
			expect(await versatiles.getMetadata()).toEqual(metadata);
		});
	});

	describe('getTileFormat', () => {
		it('should return tile format', async () => {
			expect(await versatiles.getTileFormat()).toEqual('pbf');
		});
	});

	describe('getBlockIndex', () => {
		it('should return correct block and tiles index', async () => {
			const blockIndex = new Map([
				['8,0,0', { blockOffset: 694, colMax: 61, colMin: 55, column: 0, level: 8, row: 0, rowMax: 73, rowMin: 67, tileCount: 49, tileIndexLength: 237, tileIndexOffset: 183692 }],
				['9,0,0', { blockOffset: 183929, colMax: 119, colMin: 113, column: 0, level: 9, row: 0, rowMax: 143, rowMin: 137, tileCount: 49, tileIndexLength: 244, tileIndexOffset: 274153 }],
				['10,0,1', { blockOffset: 274397, colMax: 236, colMin: 230, column: 0, level: 10, row: 1, rowMax: 28, rowMin: 22, tileCount: 49, tileIndexLength: 212, tileIndexOffset: 308349 }],
				['11,1,2', { blockOffset: 308561, colMax: 214, colMin: 208, column: 1, level: 11, row: 2, rowMax: 54, rowMin: 48, tileCount: 49, tileIndexLength: 208, tileIndexOffset: 324614 }],
				['12,3,4', { blockOffset: 324822, colMax: 170, colMin: 164, column: 3, level: 12, row: 4, rowMax: 105, rowMin: 99, tileCount: 49, tileIndexLength: 226, tileIndexOffset: 336861 }],
				['13,7,8', { blockOffset: 337087, colMax: 81, colMin: 75, column: 7, level: 13, row: 8, rowMax: 208, rowMin: 202, tileCount: 49, tileIndexLength: 231, tileIndexOffset: 349320 }],
				['14,14,17', { blockOffset: 349551, colMax: 160, colMin: 154, column: 14, level: 14, row: 17, rowMax: 158, rowMin: 151, tileCount: 56, tileIndexLength: 274, tileIndexOffset: 373735 }],
			]);
			expect(await versatiles.getBlockIndex()).toEqual(blockIndex);

			const tileIndex = {
				offsets: new Float64Array([
					308561, 308561, 317429, 319286, 320798, 308561, 308561,
					308951, 312909, 317099, 318523, 319569, 308561, 308561,
					308562, 313333, 315153, 318256, 321748, 308561, 308561,
					309442, 312467, 316600, 308561, 321248, 322811, 308561,
					311788, 308561, 315505, 318757, 320413, 323227, 324296,
					310039, 313679, 316054, 308561, 320242, 308561, 323705,
					310787, 314371, 308561, 317939, 319829, 322280, 308561,
				]),
				lengths: new Float64Array([
					0, 0, 510, 283, 450, 1, 1,
					491, 424, 330, 234, 260, 1, 1,
					389, 346, 352, 267, 532, 1, 1,
					597, 442, 499, 0, 500, 416, 1,
					679, 0, 549, 529, 385, 478, 318,
					748, 692, 546, 0, 171, 0, 591,
					1001, 782, 0, 317, 413, 531, 0,
				]),
			};
			expect(await versatiles.getTileIndex(blockIndex.get('11,1,2') as Block)).toEqual(tileIndex);
		});
	});

	describe('getTile', () => {
		it('should the correct tile as Buffer 1/3', async () => {
			expect(hash(await versatiles.getTile(8, 55, 67)))
				.toEqual('5vXat1C20MiX66nF8vOO+CE2/vwHdWzwT7Kvrt38xVM=');
		});

		it('should the correct tile as Buffer 2/3', async () => {
			expect(hash(await versatiles.getTile(11, 470, 565)))
				.toEqual('uhYw9KUvTkhcY+KRXqChqo8OVpfuWHcuxTWls9kTcL4=');
		});

		it('should the correct tile as Buffer 3/3', async () => {
			expect(hash(await versatiles.getTile(14, 3740, 4505)))
				.toEqual('FUUo5+mGVaT4br9tWFqYCScatIXEvrnLcMIC5KBRfIk=');
		});

		it('should return null if the tile cannot be found', async () => {
			expect(await versatiles.getTile(14, 3750, 4505)).toBeNull();
		});
	});

	describe('getTileUncompressed', () => {
		it('should the correct tile as Buffer 1/3', async () => {
			expect(hash(await versatiles.getTileUncompressed(8, 55, 67)))
				.toEqual('ISZuz4Nvv0yCNnZQpLxATu6lYTB5conusgV42FIYBm4=');
		});

		it('should the correct tile as Buffer 2/3', async () => {
			expect(hash(await versatiles.getTileUncompressed(11, 470, 565)))
				.toEqual('RruPwVIUvaQ1nEMzUmXNubjh8yL3ygOiG+aRwIIkrUs=');
		});

		it('should the correct tile as Buffer 3/3', async () => {
			expect(hash(await versatiles.getTileUncompressed(14, 3740, 4505)))
				.toEqual('yubXQj2G+xYXgIDaUXzPHqnhghRnjAUgFMe8mSQEE2A=');
		});

		it('should return null if the tile cannot be found', async () => {
			expect(await versatiles.getTileUncompressed(8, 50, 67)).toBeNull();
		});
	});
});

function hash(buffer: Buffer | null): string {
	if (!buffer) return 'null';
	const hasher = createHash('sha256');
	hasher.update(buffer);
	return hasher.digest('base64');
}

