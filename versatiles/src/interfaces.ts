
/**
 * Different types of supported compressions. `null` means uncompressed.
 */
export type Compression = 'gzip' | 'br' | null;



/**
 * Different file formats.
 */
export type Format = 'avif' | 'bin' | 'geojson' | 'jpeg' | 'json' | 'pbf' | 'png' | 'svg' | 'topojson' | 'webp' | null;



/**
 * Decompressor function type
 */
export type Decompressor = (data: Buffer, compression: Compression) => Promise<Buffer>;



/**
 * Defines an asynchronous container reader function.
 * It's basically a function that returns `length`s bytes starting at `position` of a container file.
 * You can define your own reader function to access containers via any network/interface/hardware.
 * @property {number} position - offset of first byte to read
 * @property {number} length - number of bytes to read
 */
export type Reader = (position: number, length: number) => Promise<Buffer>;




/**
 * Defines the header of a container.
 * @property {string} magic
 * @property {string} version
 * @property {Format} tile_format
 * @property {Compression} tile_compression
 * @property {number} zoom_min
 * @property {number} zoom_max
 * @property {number} bbox_min_x
 * @property {number} bbox_min_y
 * @property {number} bbox_max_x
 * @property {number} bbox_max_y
 * @property {number} meta_offset
 * @property {number} meta_length
 * @property {number} block_index_offset
 * @property {number} block_index_length
 */
export interface Header {
	magic: string;
	version: string;
	tileFormat: Format;
	tileCompression: Compression;
	zoomMin: number;
	zoomMax: number;
	bbox: [number, number, number, number]; //minX, minY, maxX, maxY
	metaOffset: number;
	metaLength: number;
	blockIndexOffset: number;
	blockIndexLength: number;
}



/**
 * Defines a block of tiles, including all necessary metadata.
 * @property {number} level
 * @property {number} column
 * @property {number} row
 * @property {number} col_min
 * @property {number} row_min
 * @property {number} col_max
 * @property {number} row_max
 * @property {number} block_offset
 * @property {(number|null)} tile_blobs_length
 * @property {number} tile_index_offset
 * @property {number} tile_index_length
 * @property {number} tile_count
 * @property {TileIndex=} tile_index
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
 * Defines an index of tiles inside a block.
 * @property {Float64Array} offsets
 * @property {Float64Array} lengths
 */
export interface TileIndex {
	offsets: Float64Array;
	lengths: Float64Array;
}



/**
 * Defines supported options for reading a container.
 * @property {boolean} tms
 */
export interface Options {
	tms: boolean
}
