/**
 * Supported compression.
 * `'raw'` signifies that the data is uncompressed.
 */
export type Compression = 'br' | 'gzip' | 'raw' | 'zstd';

/**
 * Supported tile formats.
 */
export type Format =
	'avif' | 'bin' | 'geojson' | 'jpg' | 'json' | 'pbf' | 'png' | 'svg' | 'topojson' | 'webp';

/**
 * Type definition for reading content from a VersaTiles container.
 *
 * This is useful for implementing new container readers, e.g. reading over other network protocols.
 *
 * A reader may optionally expose a `close` method to release any underlying
 * resources (e.g. a file descriptor). {@link Container.close} calls it if present.
 *
 * @param {number} position - The byte offset at which to start reading.
 * @param {number} length - The number of bytes to read.
 * @returns {Promise<Buffer>} A promise that resolves with the data read as a Buffer.
 * @throws {RangeError} If `position` is less than 0 or if `length` is less than 0.
 * @throws {RangeError} If the sum of `position` and `length` exceeds the size of the content (filesize).
 * @throws {Error} If there is any filesystem or network error such as the content not being accessible or readable.
 */
export interface Reader {
	(position: number, length: number): Promise<Buffer>;

	/**
	 * Releases any underlying resources held by the reader (e.g. an open file
	 * descriptor). Optional; readers that hold no resources may omit it.
	 * After `close` resolves, the reader must not be called again.
	 */
	close?: () => Promise<void>;
}

/**
 * Interface for the metadata header of a `*.Versatiles` container.
 *
 * @property {string} magic - Identifier for the container format, usually "versatiles_v02".
 * @property {string} version - Version of the container format, typically "v02".
 * @property {Format} tileFormat - The format used for storing tiles.
 * @property {string} tileMime - The MIME type of the tiles.
 * @property {Compression} tileCompression - The type of compression applied to tiles.
 * @property {number} zoomMin - The minimum zoom level.
 * @property {number} zoomMax - The maximum zoom level.
 * @property {[number, number, number, number]} bbox - Bounding box coordinates as [lon_min, lat_min, lon_max, lat_max].
 * @property {number} metaOffset - The byte offset for metadata within the container.
 * @property {number} metaLength - The byte size of the metadata. A value of 0 means no metadata.
 * @property {number} blockIndexOffset - The byte offset for the block index within the container.
 * @property {number} blockIndexLength - The byte size of the block index. A value of 0 indicates no tiles in the container.
 */
export interface Header {
	magic: string;
	version: string;
	tileFormat: Format;
	tileMime: string;
	tileCompression: Compression;
	zoomMin: number;
	zoomMax: number;
	bbox: [number, number, number, number];
	metaOffset: number;
	metaLength: number;
	blockIndexOffset: number;
	blockIndexLength: number;
}

/**
 * Interface for a block of tiles including necessary metadata.
 * For more details, refer to [spec v02](https://github.com/versatiles-org/versatiles-spec/blob/main/v02/readme.md#block_index).
 *
 * @property {number} level - The zoom level for this block.
 * @property {number} column - The column position of this block at the current zoom level.
 * @property {number} row - The row position of this block at the current zoom level.
 * @property {number} colMin - Minimum column index for tiles stored in this block (range: 0-255).
 * @property {number} rowMin - Minimum row index for tiles stored in this block (range: 0-255).
 * @property {number} colMax - Maximum column index for tiles stored in this block (range: 0-255).
 * @property {number} rowMax - Maximum row index for tiles stored in this block (range: 0-255).
 * @property {number} blockOffset - Byte position where this block starts in the file container.
 * @property {number} tileIndexOffset - Byte position where the tile index starts within the container.
 * @property {number} tileIndexLength - Length of the tile index in bytes.
 * @property {number} tileCount - The number of tiles contained in this block.
 * @property {TileIndex=} tileIndex - Optional tile index if it has been fetched.
 */
export interface Block {
	level: number;
	column: number;
	row: number;
	colMin: number;
	rowMin: number;
	colMax: number;
	rowMax: number;
	blockOffset: number;
	tileIndexOffset: number;
	tileIndexLength: number;
	tileCount: number;
	tileIndex?: TileIndex;
}

/**
 * Interface for the index structure used for tiles within a block.
 *
 * Byte offsets are stored as `Float64Array`, which represents integers exactly
 * up to `Number.MAX_SAFE_INTEGER` (2^53 − 1, ~9 PB). This is not a limitation of
 * this type specifically: the {@link Reader} contract addresses data by `number`
 * position, and both `fs.read` and HTTP byte-range requests are likewise
 * `Number`-based, so 2^53 is the effective addressing limit of the whole reader
 * pipeline. Storing offsets as `BigInt` here would therefore not extend the
 * reachable range.
 *
 * @property {Float64Array} offsets - Array indicating the start byte positions of tiles within the block.
 * @property {Float64Array} lengths - Array specifying the byte lengths of the tiles. A length of 0 means the tile is not stored.
 */
export interface TileIndex {
	offsets: Float64Array;
	lengths: Float64Array;
}

/**
 * Interface for defining the options available for reading a container.
 *
 * All properties are optional; omitted ones fall back to the documented default.
 *
 * @property {boolean} tms - If set to true, uses the [TMS (Tile Map Service) tile ordering](https://wiki.openstreetmap.org/wiki/TMS) where y=0 is the southernmost point. Defaults to `false`.
 * @property {number} timeout - Idle timeout in milliseconds for HTTP(S) sources, applied both while
 *   waiting for the response headers and between body chunks. Has no effect on local files or on a
 *   custom {@link Reader}, which manages its own timeouts. Defaults to 10000.
 */
export interface OpenOptions {
	tms?: boolean;
	timeout?: number;
}
