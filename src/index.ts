/**
 * @module
 *
 * This module provides functionality to interact with and retrieve tile data from `.versatiles` container files,
 * typically used for storing geospatial tile data in a compressed, optimized format. The module supports
 * multiple file and compression formats.
 *
 * Dependencies:
 * - `HttpReader` and `FileReader`: Adapters for reading data from HTTP/HTTPS URLs or local files, respectively.
 * - `decompress`: Utility for decompressing tile data in supported formats.
 * - Type definitions (`Block`, `Compression`, `Format`, `Header`, `OpenOptions`, `Reader`, and `TileIndex`)
 *   from the module's `interfaces.js` file to ensure type safety and consistency.
 *
 * Exported Constants:
 * - `FORMATS`: Supported formats organized by version for different tile data, including image formats (e.g., PNG, JPG)
 *   and vector formats (e.g., PBF).
 * - `COMPRESSIONS`: Available compression types, including 'raw' (no compression), 'gzip', and 'br' (Brotli).
 * - `MIMETYPES`: Maps supported tile formats to their respective MIME types for handling and delivery.
 *
 * Exported Types:
 * - The module re-exports `Compression`, `Format`, `Header`, `OpenOptions`, and `Reader` types for use in other modules.
 *
 * Primary Class:
 * - `Container`: A main wrapper class that provides methods to access tile data, metadata, and configuration settings
 *   for `.versatiles` containers. Methods include `getHeader`, `getMetadata`, `getTile`, and `getTileUncompressed`,
 *   which enable detailed control and retrieval of tile information, metadata, and decompressed content.
 *
 * @example
 * ```ts
 * import { Container } from '@versatiles/container';
 * const container = new Container('path/to/versatiles-file');
 * const tile = await container.getTile(12, 2200, 1343);
 * const metadata = await container.getMetadata();
 * ```
 */

import HttpReader from './lib/reader_http.js';
import FileReader from './lib/reader_file.js';
import { decompress } from './lib/decompress.js';
import type { Block, Compression, Format, Header, OpenOptions, Reader, TileIndex } from './lib/interfaces.js';
export type { Block, Compression, Format, Header, OpenOptions, Reader, TileIndex } from './lib/interfaces.js';



const FORMATS: Record<string, (Format | null)[]> = {
	'c01': ['png', 'jpg', 'webp', null, null, null, null, null, null, null, null, null, null, null, null, null, 'pbf'],
	'v01': ['png', 'jpg', 'webp', 'pbf'],
	'v02': [
		'bin', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
		'png', 'jpg', 'webp', 'avif', 'svg', null, null, null, null, null, null, null, null, null, null, null,
		'pbf', 'geojson', 'topojson', 'json',
	],
};
const COMPRESSIONS: Compression[] = ['raw', 'gzip', 'br'];
const MIMETYPES: Record<Format, string> = {
	'avif': 'image/avif',
	'bin': 'application/octet-stream',
	'geojson': 'application/geo+json; charset=utf-8',
	'jpg': 'image/jpeg',
	'json': 'application/json; charset=utf-8',
	'pbf': 'application/x-protobuf',
	'png': 'image/png',
	'svg': 'image/svg+xml; charset=utf-8',
	'topojson': 'application/topo+json; charset=utf-8',
	'webp': 'image/webp',
};


/**
 * The `VersaTiles` class is a wrapper around a `.versatiles` container file. It provides methods
 * to access tile data, metadata, and other properties within the container.
 */
export class Container {
	readonly #options: OpenOptions = {
		tms: false,
	};

	readonly #reader: Reader;

	#header?: Header;

	#metadata?: string;

	#blockIndex?: Map<string, Block>;

	/**
	 * Constructs a new instance of the VersaTiles class.
	 * 
	 * @param source - The data source for the tiles. This can be a URL starting with `http://` or `https://`,
	 * a path to a local file, or a custom `Reader` function that reads data chunks based on offset and length.
	 * @param options - Optional settings that configure tile handling.
	 * @throws Will throw an error if the provided source is neither a string nor a Reader function.
	 */
	public constructor(source: Reader | string, options?: OpenOptions) {
		if (options) Object.assign(this.#options, options);

		if (typeof source === 'string') {
			if (source.startsWith('https://') || source.startsWith('http://')) {
				this.#reader = HttpReader(source);
			} else {
				this.#reader = FileReader(source);
			}
		} else if (typeof source === 'function') {
			this.#reader = source;
		} else {
			throw new Error('source must be a string or a Reader');
		}
	}

	/**
	 * Asynchronously retrieves the header information from the `.versatiles` container.
	 * 
	 * @returns A promise that resolves with the header object.
	 * @throws Will throw an error if the container does not start with expected magic bytes indicating a valid format.
	 */
	public async getHeader(): Promise<Header> {
		// deliver if known
		if (this.#header) return this.#header;

		const data = await this.read(0, 66);

		// check magic bytes
		if (!/^versatiles_v0[12]$/.test(data.toString('utf8', 0, 14))) {
			throw new Error('Invalid Container');
		}

		const magic: string = data.toString('utf8', 0, 14);
		const version: string = data.toString('utf8', 11, 14);
		const tileFormat: Format = FORMATS[version][data.readUInt8(14)] ?? 'bin';
		const tileMime: string = MIMETYPES[tileFormat];
		const tileCompression: Compression = COMPRESSIONS[data.readUInt8(15)] ?? 'raw';
		const zoomMin: number = data.readUInt8(16);
		const zoomMax: number = data.readUInt8(17);
		let bbox: [number, number, number, number];
		const metaOffset = Number(data.readBigUInt64BE(34));
		const metaLength = Number(data.readBigUInt64BE(42));
		const blockIndexOffset = Number(data.readBigUInt64BE(50));
		const blockIndexLength = Number(data.readBigUInt64BE(58));

		switch (version) {
			case 'v01':
				bbox = [data.readFloatBE(18), data.readFloatBE(22), data.readFloatBE(26), data.readFloatBE(30)];
				break;
			case 'v02':
				bbox = [data.readInt32BE(18) / 1e7, data.readInt32BE(22) / 1e7, data.readInt32BE(26) / 1e7, data.readInt32BE(30) / 1e7];
				break;
			default:
				throw new Error('Invalid Container');
		}

		this.#header = { magic, version, tileFormat, tileMime, tileCompression, zoomMin, zoomMax, bbox, metaOffset, metaLength, blockIndexOffset, blockIndexLength };

		return this.#header;
	}

	/**
	 * Asynchronously retrieves the metadata associated with the `.versatiles` container.
	 * Metadata typically includes information about `vector_layers` for vector tiles.
	 * If the container does not include metadata, this method returns `null`.
	 * 
	 * @returns A promise that resolves with an object representing the metadata.
	 */
	public async getMetadata(): Promise<string | undefined> {
		if (this.#metadata !== undefined) return this.#metadata;

		const header = await this.getHeader();

		if (header.metaLength === 0) {
			this.#metadata = undefined;
		} else {
			let buffer: Buffer = await this.read(header.metaOffset, header.metaLength);
			buffer = await decompress(buffer, header.tileCompression);
			this.#metadata = buffer.toString();
		}

		return this.#metadata;
	}

	/**
	 * Asynchronously retrieves a specific tile's data as a Buffer. If the tile data is compressed as
	 * defined in the container header, the returned Buffer will contain the compressed data.
	 * To obtain uncompressed data, use the `getTileUncompressed` method.
	 * If the specified tile does not exist, the method returns `null`.
	 * 
	 * @param z - The zoom level of the tile.
	 * @param x - The x coordinate of the tile within its zoom level.
	 * @param y - The y coordinate of the tile within its zoom level.
	 * @returns A promise that resolves with the tile data as a Buffer, or null if the tile cannot be found.
	 */
	public async getTile(z: number, x: number, y: number): Promise<Buffer | null> {
		// when y index is inverted
		if (this.#options.tms) y = Math.pow(2, z) - y - 1;

		// ensure block index is loaded
		const blockIndex = await this.getBlockIndex();

		// block xy
		const bx = x >> 8;
		const by = y >> 8;

		// tile xy (within block)
		const tx = x & 0xFF;
		const ty = y & 0xFF;

		// check if block containing tile is within bounds
		const blockKey = `${z},${bx},${by}`;
		const block = blockIndex.get(blockKey);
		if (!block) return null;

		// check if block contains tile
		if (tx < block.colMin || tx > block.colMax) return null;
		if (ty < block.rowMin || ty > block.rowMax) return null;

		// calculate sequential tile number
		const j = (ty - block.rowMin) * (block.colMax - block.colMin + 1) + (tx - block.colMin);

		// get tile index
		const tileIndex = await this.getTileIndex(block);
		const offset = tileIndex.offsets[j];
		const length = tileIndex.lengths[j];

		if (length === 0) return null;

		return this.read(offset, length);
	}

	/**
	 * Asynchronously retrieves a specific tile's uncompressed data as a Buffer. This method first
	 * retrieves the compressed tile data using `getTile` and then decompresses it based on the
	 * compression setting in the container header.
	 * If the specified tile does not exist, the method returns `null`.
	 * 
	 * @param z - The zoom level of the tile.
	 * @param x - The x coordinate of the tile within its zoom level.
	 * @param y - The y coordinate of the tile within its zoom level.
	 * @returns A promise that resolves with the uncompressed tile data as a Buffer, or null if the tile cannot be found.
	 */
	public async getTileUncompressed(z: number, x: number, y: number): Promise<Buffer | null> {
		const tile = await this.getTile(z, x, y);
		if (!tile) return null;
		const header = await this.getHeader();
		return decompress(tile, header.tileCompression);
	}

	/**
	 * Asynchronously retrieves a mapping of tile block indices. The map's keys are formatted as "{z},{x},{y}".
	 * This method is for internal use to manage tile lookup within the container.
	 * 
	 * @returns A promise that resolves with the block index map.
	 * @protected
	 */
	protected async getBlockIndex(): Promise<Map<string, Block>> {
		if (this.#blockIndex) return this.#blockIndex;

		const header = await this.getHeader();

		// read block_index buffer
		let data = await this.read(header.blockIndexOffset, header.blockIndexLength);
		data = await decompress(data, 'br');

		// read index from buffer
		const blocks: Block[] = [];

		switch (header.version) {
			case 'c01':
			case 'v01':

				// check block index length
				if (data.length % 29 !== 0) throw new Error('invalid block index');

				for (let i = 0; i < data.length; i += 29) {
					const slice = data.subarray(i, i + 29);
					addBlock(
						slice,
						0n,
						slice.readBigUInt64BE(13),
						slice.readBigUInt64BE(21),
					);
				}
				break;
			case 'v02':

				// check block index length
				if (data.length % 33 !== 0) throw new Error('invalid block index');

				for (let i = 0; i < data.length; i += 33) {
					const slice = data.subarray(i, i + 33);
					addBlock(
						slice,
						slice.readBigUInt64BE(13),
						slice.readBigUInt64BE(13) + slice.readBigUInt64BE(21), // block_offset + tile_blobs_length
						slice.readUInt32BE(29),
					);
				}
				break;
		}

		// build map
		this.#blockIndex = new Map(blocks.map(b => [`${b.level},${b.column},${b.row}`, b]));

		return this.#blockIndex;

		function addBlock(buffer: Buffer, blockOffset: bigint, tileIndexOffset: bigint, tileIndexLength: bigint | number): void {
			const block = {
				level: buffer.readUInt8(0),
				column: buffer.readUInt32BE(1),
				row: buffer.readUInt32BE(5),
				colMin: buffer.readUInt8(9),
				rowMin: buffer.readUInt8(10),
				colMax: buffer.readUInt8(11),
				rowMax: buffer.readUInt8(12),
				blockOffset: Number(blockOffset),
				tileIndexOffset: Number(tileIndexOffset),
				tileIndexLength: Number(tileIndexLength),
				tileCount: 0,
			};
			block.tileCount = (block.colMax - block.colMin + 1) * (block.rowMax - block.rowMin + 1);
			blocks.push(block);
		}
	}

	/**
	 * Asynchronously retrieves the tile index for a specified block. This is an internal method used to 
	 * maintain a lookup for every tile within a block.
	 * 
	 * @param block - The block for which to retrieve the tile index.
	 * @returns A promise that resolves with the tile index.
	 * @protected
	 */
	protected async getTileIndex(block: Block): Promise<TileIndex> {
		if (block.tileIndex) return block.tileIndex;

		let buffer = await this.read(block.tileIndexOffset, block.tileIndexLength);
		buffer = await decompress(buffer, 'br');

		const offsets = new Float64Array(block.tileCount);
		const lengths = new Float64Array(block.tileCount);

		for (let i = 0; i < block.tileCount; i++) {
			offsets[i] = Number(buffer.readBigUInt64BE(12 * i)) + block.blockOffset;
			lengths[i] = buffer.readUInt32BE(12 * i + 8);
		}

		block.tileIndex = { offsets, lengths };

		return block.tileIndex;
	}

	/**
	 * A protected method to read a chunk of data from the source based on the specified offset and length.
	 * 
	 * @param offset - The offset from the start of the source data to begin reading.
	 * @param length - The number of bytes to read from the source.
	 * @returns A promise that resolves with the read data as a Buffer.
	 * @protected
	 */
	protected async read(offset: number, length: number): Promise<Buffer> {
		if (length === 0) return Buffer.allocUnsafe(0);
		return this.#reader(offset, length);
	}
}
