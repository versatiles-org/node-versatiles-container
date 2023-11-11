/**
 * Supported compression.
 * `null` signifies that the data is uncompressed.
 */
export type Compression = 'br' | 'gzip' | null;


/**
 * Supported tile formats.
 */
export type Format = 'avif' | 'bin' | 'geojson' | 'jpeg' | 'json' | 'pbf' | 'png' | 'svg' | 'topojson' | 'webp' | null;


/**
 * Type definition for a function that decompresses data.
 * 
 * @param {Buffer} data - The compressed data.
 * @param {Compression} compression - The type of compression used.
 * @returns {Promise<Buffer>} - The decompressed data.
 */
export type Decompressor = (data: Buffer, compression: Compression) => Promise<Buffer>;



/**
 * Type definition for reading content from a VersaTiles container.
 * 
 * This is useful for implementing new container readers, e.g. reading over other network protocols.
 * 
 * @param {number} position - The byte offset at which to start reading.
 * @param {number} length - The number of bytes to read.
 * @returns {Promise<Buffer>} A promise that resolves with the data read as a Buffer.
 * @throws {RangeError} If `position` is less than 0 or if `length` is less than 0.
 * @throws {RangeError} If the sum of `position` and `length` exceeds the size of the content (filesize).
 * @throws {Error} If there is any filesystem or network error such as the content not being accessible or readable.
 */
export type Reader = (position: number, length: number) => Promise<Buffer>;



/**
 * Interface for the metadata header of a `*.Versatiles` container.
 * 
 * @property {string} magic - Identifier for the container format, usually "versatiles_v02".
 * @property {string} version - Version of the container format, typically "v02".
 * @property {Format} tileFormat - The format used for storing tiles.
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
 * @property {Float64Array} offsets - Array indicating the start byte positions of tiles within the block.
 * @property {Float64Array} lengths - Array specifying the byte lengths of the tiles. A length of 0 means the tile is not stored.
 */
export interface TileIndex {
	offsets: Float64Array;
	lengths: Float64Array;
}



/**
 * Interface for defining the options available for reading a container.
 * @property {boolean} tms - If set to true, uses the [TMS (Tile Map Service) tile ordering](https://wiki.openstreetmap.org/wiki/TMS) where y=0 is the southernmost point.
 */
export interface OpenOptions {
	tms: boolean;
}
