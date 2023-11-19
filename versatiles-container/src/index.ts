
import HttpReader from './reader_http.js';
import FileReader from './reader_file.js';
import { decompress } from './decompress.js';
import type { Block, Compression, Decompressor, Format, Header, OpenOptions, Reader, TileIndex } from './interfaces.js';
export type { Compression, Format, Header, OpenOptions, Reader } from './interfaces.js';



const FORMATS: Record<string, (Format | null)[]> = {
	'c01': ['png', 'jpeg', 'webp', null, null, null, null, null, null, null, null, null, null, null, null, null, 'pbf'],
	'v01': ['png', 'jpeg', 'webp', 'pbf'],
	'v02': [
		'bin', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
		'png', 'jpeg', 'webp', 'avif', 'svg', null, null, null, null, null, null, null, null, null, null, null,
		'pbf', 'geojson', 'topojson', 'json',
	],
};
const COMPRESSIONS: Compression[] = ['raw', 'gzip', 'br'];


/**
 * The `VersaTiles` class is a wrapper around a `.versatiles` container file. It provides methods
 * to access tile data, metadata, and other properties within the container.
 */
export class VersaTiles {
	readonly #options: OpenOptions = {
		tms: false,
	};

	readonly #reader: Reader;

	readonly #decompress: Decompressor;

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

		this.#decompress = decompress;
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

		const version = data.toString('utf8', 11, 14);

		switch (version) {
			case 'v01':
				this.#header = {
					magic: data.toString('utf8', 0, 14),
					version: version,
					tileFormat: FORMATS[version][data.readUInt8(14)] ?? 'bin',
					tileCompression: COMPRESSIONS[data.readUInt8(15)] ?? null,
					zoomMin: data.readUInt8(16),
					zoomMax: data.readUInt8(17),
					bbox: [data.readFloatBE(18), data.readFloatBE(22), data.readFloatBE(26), data.readFloatBE(30)],
					metaOffset: Number(data.readBigUInt64BE(34)),
					metaLength: Number(data.readBigUInt64BE(42)),
					blockIndexOffset: Number(data.readBigUInt64BE(50)),
					blockIndexLength: Number(data.readBigUInt64BE(58)),
				};
				break;
			case 'v02':
				this.#header = {
					magic: data.toString('utf8', 0, 14),
					version: version,
					tileFormat: FORMATS[version][data.readUInt8(14)] ?? 'bin',
					tileCompression: COMPRESSIONS[data.readUInt8(15)] ?? null,
					zoomMin: data.readUInt8(16),
					zoomMax: data.readUInt8(17),
					bbox: [data.readInt32BE(18) / 1e7, data.readInt32BE(22) / 1e7, data.readInt32BE(26) / 1e7, data.readInt32BE(30) / 1e7],
					metaOffset: Number(data.readBigUInt64BE(34)),
					metaLength: Number(data.readBigUInt64BE(42)),
					blockIndexOffset: Number(data.readBigUInt64BE(50)),
					blockIndexLength: Number(data.readBigUInt64BE(58)),
				};
				break;
			default:
				throw new Error('Invalid Container');
		}

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
			buffer = await this.#decompress(buffer, header.tileCompression);
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
		return this.#decompress(tile, header.tileCompression);
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
		data = await this.#decompress(data, 'br');

		// read index from buffer
		const blocks: Block[] = [];

		switch (header.version) {
			case 'c01':
			case 'v01':

				// check blog index length
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

				// check blog index length
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

		// eslint-disable-next-line @typescript-eslint/max-params
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
		buffer = await this.#decompress(buffer, 'br');

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
