/* eslint-disable @typescript-eslint/naming-convention */
import { createHash } from 'node:crypto';
import { Container } from './index.js';

const TESTFILE = new URL('../../../testdata/island.versatiles', import.meta.url).pathname;

describe('VersaTiles', () => {
	const versatiles = new Container(TESTFILE);

	describe('getHeader', () => {
		it('should return the header', async () => {
			expect(await versatiles.getHeader()).toEqual({
				magic: 'versatiles_v02',
				version: 'v02',
				tileFormat: 'pbf',
				tileMime: 'application/x-protobuf',
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
			expect(JSON.parse(await versatiles.getMetadata() ?? '')).toEqual(metadata);
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

