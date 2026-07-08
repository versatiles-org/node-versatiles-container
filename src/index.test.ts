import { createHash } from 'node:crypto';
import { brotliCompressSync } from 'node:zlib';
import { Container } from './index.js';
import type { Block, TileIndex } from './index.js';
import { describe, expect, it } from 'vitest';

const TESTFILE = new URL('../testdata/island.versatiles', import.meta.url).pathname;

// exposes the protected internal methods for testing
class TestContainer extends Container {
	public getTileIndex(block: Block): Promise<TileIndex> {
		return super.getTileIndex(block);
	}
}

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

		it('should throw on invalid magic bytes', async () => {
			// a reader that yields 66 zero-bytes -> magic check fails
			const container = new Container(async (_, length) => Buffer.alloc(length));
			await expect(container.getHeader()).rejects.toThrow('Invalid Container');
		});
	});

	describe('getMetadata', () => {
		it('should return metadata', async () => {
			const metadata = {
				vector_layers: [
					{
						id: 'place_labels',
						minzoom: 3,
						maxzoom: 14,
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							population: 'Number',
						},
					},
					{
						id: 'boundaries',
						minzoom: 0,
						maxzoom: 14,
						fields: {
							admin_level: 'Number',
							coastline: 'Boolean',
							disputed: 'Boolean',
							maritime: 'Boolean',
						},
					},
					{
						id: 'boundary_labels',
						minzoom: 2,
						maxzoom: 14,
						fields: {
							admin_level: 'Number',
							land_area: 'Number',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							name_full: 'String',
							name_latin: 'String',
							way_area: 'Number',
						},
					},
					{
						id: 'addresses',
						minzoom: 14,
						maxzoom: 14,
						fields: { housename: 'String', housenumber: 'String' },
					},
					{
						id: 'water_lines',
						minzoom: 4,
						maxzoom: 14,
						fields: { bridge: 'Boolean', kind: 'String', tunnel: 'Boolean' },
					},
					{
						id: 'water_lines_labels',
						minzoom: 4,
						maxzoom: 14,
						fields: {
							bridge: 'Boolean',
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							tunnel: 'Boolean',
						},
					},
					{
						id: 'dam_lines',
						minzoom: 12,
						maxzoom: 14,
						fields: { kind: 'String' },
					},
					{
						id: 'dam_polygons',
						minzoom: 12,
						maxzoom: 14,
						fields: { kind: 'String' },
					},
					{
						id: 'pier_lines',
						minzoom: 12,
						maxzoom: 14,
						fields: { kind: 'String' },
					},
					{
						id: 'pier_polygons',
						minzoom: 12,
						maxzoom: 14,
						fields: { kind: 'String' },
					},
					{
						id: 'bridges',
						minzoom: 12,
						maxzoom: 14,
						fields: { kind: 'String' },
					},
					{
						id: 'street_polygons',
						minzoom: 11,
						maxzoom: 14,
						fields: {
							bridge: 'Boolean',
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							rail: 'Boolean',
							service: 'String',
							surface: 'String',
							tunnel: 'Boolean',
						},
					},
					{
						id: 'streets_polygons_labels',
						minzoom: 14,
						maxzoom: 14,
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
						},
					},
					{
						id: 'ferries',
						minzoom: 8,
						maxzoom: 14,
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
						},
					},
					{
						id: 'streets',
						minzoom: 14,
						maxzoom: 14,
						fields: {
							bicycle: 'String',
							bridge: 'Boolean',
							horse: 'String',
							kind: 'String',
							link: 'Boolean',
							oneway: 'Boolean',
							oneway_reverse: 'Boolean',
							rail: 'Boolean',
							service: 'String',
							surface: 'String',
							tracktype: 'String',
							tunnel: 'Boolean',
						},
					},
					{
						id: 'street_labels',
						minzoom: 10,
						maxzoom: 14,
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							ref: 'String',
							ref_cols: 'Number',
							ref_rows: 'Number',
							tunnel: 'Boolean',
						},
					},
					{
						id: 'street_labels_points',
						minzoom: 12,
						maxzoom: 14,
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							ref: 'String',
						},
					},
					{
						id: 'aerialways',
						minzoom: 12,
						maxzoom: 14,
						fields: { kind: 'String' },
					},
					{
						id: 'public_transport',
						minzoom: 11,
						maxzoom: 14,
						fields: {
							iata: 'String',
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							station: 'String',
						},
					},
					{
						id: 'buildings',
						minzoom: 14,
						maxzoom: 14,
						fields: {
							amenity: 'String',
							cuisine: 'String',
							denomination: 'String',
							dummy: 'Number',
							historic: 'String',
							housename: 'String',
							housenumber: 'String',
							information: 'String',
							man_made: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							religion: 'String',
							shop: 'String',
							tourism: 'String',
						},
					},
					{
						id: 'water_polygons',
						minzoom: 4,
						maxzoom: 14,
						fields: { kind: 'String', way_area: 'Number' },
					},
					{
						id: 'ocean',
						minzoom: 8,
						maxzoom: 14,
						fields: { x: 'Number', y: 'Number' },
					},
					{
						id: 'water_polygons_labels',
						minzoom: 14,
						maxzoom: 14,
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							way_area: 'Number',
						},
					},
					{
						id: 'land',
						minzoom: 7,
						maxzoom: 14,
						fields: {
							amenity: 'String',
							housenumber: 'String',
							kind: 'String',
							leisure: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							'recycling:clothes': 'Boolean',
							'recycling:glass_bottles': 'Boolean',
							'recycling:paper': 'Boolean',
							'recycling:scrap_metal': 'Boolean',
						},
					},
					{
						id: 'sites',
						minzoom: 14,
						maxzoom: 14,
						fields: {
							amenity: 'String',
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
						},
					},
					{
						id: 'pois',
						minzoom: 14,
						maxzoom: 14,
						fields: {
							amenity: 'String',
							atm: 'Boolean',
							cuisine: 'String',
							denomination: 'String',
							emergency: 'String',
							highway: 'String',
							historic: 'String',
							information: 'String',
							leisure: 'String',
							man_made: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							'recycling:clothes': 'Boolean',
							'recycling:glass_bottles': 'Boolean',
							'recycling:paper': 'Boolean',
							'recycling:scrap_metal': 'Boolean',
							religion: 'String',
							shop: 'String',
							sport: 'String',
							tourism: 'String',
							'tower:type': 'String',
							vending: 'String',
						},
					},
				],
			};
			expect(JSON.parse((await versatiles.getMetadata()) ?? '')).toEqual(metadata);
		});
	});

	describe('getTile', () => {
		it('should the correct tile as Buffer 1/3', async () => {
			expect(hash(await versatiles.getTile(8, 55, 67))).toEqual(
				'5vXat1C20MiX66nF8vOO+CE2/vwHdWzwT7Kvrt38xVM=',
			);
		});

		it('should the correct tile as Buffer 2/3', async () => {
			expect(hash(await versatiles.getTile(11, 470, 565))).toEqual(
				'uhYw9KUvTkhcY+KRXqChqo8OVpfuWHcuxTWls9kTcL4=',
			);
		});

		it('should the correct tile as Buffer 3/3', async () => {
			expect(hash(await versatiles.getTile(14, 3740, 4505))).toEqual(
				'FUUo5+mGVaT4br9tWFqYCScatIXEvrnLcMIC5KBRfIk=',
			);
		});

		it('should return null if the tile cannot be found', async () => {
			expect(await versatiles.getTile(14, 3750, 4505)).toBeNull();
		});

		it('should reject non-integer coordinates', async () => {
			await expect(versatiles.getTile(8, 55.5, 67)).rejects.toThrow(RangeError);
			await expect(versatiles.getTile(8, 55, 67)).resolves.not.toBeNull();
		});

		it('should reject negative coordinates', async () => {
			await expect(versatiles.getTile(8, -1, 67)).rejects.toThrow(RangeError);
			await expect(versatiles.getTile(-1, 55, 67)).rejects.toThrow(RangeError);
			await expect(versatiles.getTile(8, 55, -1)).rejects.toThrow(RangeError);
		});

		it('should reject zoom levels above 30', async () => {
			await expect(versatiles.getTile(31, 0, 0)).rejects.toThrow(RangeError);
			await expect(versatiles.getTile(30, 0, 0)).resolves.toBeNull();
		});

		it('should reject coordinates outside the 2^z grid', async () => {
			// at zoom 8 the grid is 256×256, so index 256 is out of range
			await expect(versatiles.getTile(8, 256, 0)).rejects.toThrow(RangeError);
			await expect(versatiles.getTile(8, 0, 256)).rejects.toThrow(RangeError);
			// the last valid index (255) must not throw
			await expect(versatiles.getTile(8, 255, 255)).resolves.toBeNull();
		});

		it('should flip the y coordinate when the tms option is set', async () => {
			// tms flips y: for z=14 the internal y = 2^14 - y - 1, so the tms
			// request for y=11878 must resolve to the same tile as plain y=4505.
			const plain = await versatiles.getTile(14, 3740, 4505);
			const tmsContainer = new Container(TESTFILE, { tms: true });
			const flipped = await tmsContainer.getTile(14, 3740, 2 ** 14 - 4505 - 1);
			expect(flipped).not.toBeNull();
			expect(hash(flipped)).toEqual(hash(plain));
			await tmsContainer.close();
		});
	});

	describe('getTileUncompressed', () => {
		it('should the correct tile as Buffer 1/3', async () => {
			expect(hash(await versatiles.getTileUncompressed(8, 55, 67))).toEqual(
				'ISZuz4Nvv0yCNnZQpLxATu6lYTB5conusgV42FIYBm4=',
			);
		});

		it('should the correct tile as Buffer 2/3', async () => {
			expect(hash(await versatiles.getTileUncompressed(11, 470, 565))).toEqual(
				'RruPwVIUvaQ1nEMzUmXNubjh8yL3ygOiG+aRwIIkrUs=',
			);
		});

		it('should the correct tile as Buffer 3/3', async () => {
			expect(hash(await versatiles.getTileUncompressed(14, 3740, 4505))).toEqual(
				'yubXQj2G+xYXgIDaUXzPHqnhghRnjAUgFMe8mSQEE2A=',
			);
		});

		it('should return null if the tile cannot be found', async () => {
			expect(await versatiles.getTileUncompressed(8, 50, 67)).toBeNull();
		});
	});

	describe('getTileIndex', () => {
		it('throws a descriptive error on a truncated tile index', async () => {
			// a brotli payload that decompresses to fewer bytes than tileCount * 12
			const payload = brotliCompressSync(Buffer.alloc(4));
			const container = new TestContainer(async () => payload);
			const block = {
				level: 0,
				column: 0,
				row: 0,
				colMin: 0,
				rowMin: 0,
				colMax: 0,
				rowMax: 0,
				blockOffset: 0,
				tileIndexOffset: 1,
				tileIndexLength: payload.length,
				tileCount: 5, // needs 5 * 12 = 60 bytes, but only 4 are available
			} satisfies Block;

			await expect(container.getTileIndex(block)).rejects.toThrow('invalid tile index');
		});

		it('throws when a tile offset exceeds the safe integer range', async () => {
			// one 12-byte entry whose 8-byte offset is 2^53 (just past MAX_SAFE_INTEGER)
			const raw = Buffer.alloc(12);
			raw.writeBigUInt64BE(2n ** 53n, 0);
			raw.writeUInt32BE(10, 8);
			const payload = brotliCompressSync(raw);
			const container = new TestContainer(async () => payload);
			const block = {
				level: 0,
				column: 0,
				row: 0,
				colMin: 0,
				rowMin: 0,
				colMax: 0,
				rowMax: 0,
				blockOffset: 0,
				tileIndexOffset: 1,
				tileIndexLength: payload.length,
				tileCount: 1,
			} satisfies Block;

			await expect(container.getTileIndex(block)).rejects.toThrow('safe integer range');
		});
	});

	describe('close', () => {
		it('closes the underlying file reader', async () => {
			const container = new Container(TESTFILE);
			expect((await container.getHeader()).version).toEqual('v02');
			await expect(container.close()).resolves.toBeUndefined();
		});

		it('is a no-op for readers without a close method', async () => {
			// a custom Reader function that holds no resources
			const container = new Container(async () => Buffer.alloc(0));
			await expect(container.close()).resolves.toBeUndefined();
		});
	});
});

function hash(buffer: Buffer | null): string {
	if (!buffer) return 'null';
	const hasher = createHash('sha256');
	hasher.update(buffer);
	return hasher.digest('base64');
}
