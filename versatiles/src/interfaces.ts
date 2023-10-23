
/**
 * Compression Types
 * @typedef {('gzip'|'br'|null)} Compression
 */
export type Compression = 'gzip' | 'br' | null;

/**
 * File Format Types
 * @typedef {('avif'|'bin'|'geojson'|'jpeg'|'json'|'pbf'|'png'|'svg'|'topojson'|'webp'|null)} Format
 */
export type Format = 'avif' | 'bin' | 'geojson' | 'jpeg' | 'json' | 'pbf' | 'png' | 'svg' | 'topojson' | 'webp' | null;

/**
 * Header interface
 * @interface Header
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
	tile_format: Format;
	tile_compression: Compression;
	zoom_min: number;
	zoom_max: number;
	bbox_min_x: number;
	bbox_min_y: number;
	bbox_max_x: number;
	bbox_max_y: number;
	meta_offset: number;
	meta_length: number;
	block_index_offset: number;
	block_index_length: number;
}

/**
 * Block interface
 * @interface Block
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
	col_min: number;
	row_min: number;
	col_max: number;
	row_max: number;
	block_offset: number;
	tile_index_offset: number;
	tile_index_length: number;
	tile_count: number;
	tile_index?: TileIndex;
}

/**
 * TileIndex interface
 * @interface Block
 * @property {Float64Array} offsets
 * @property {Float64Array} lengths
 */
export interface TileIndex {
	offsets: Float64Array;
	lengths: Float64Array;
}

/**
 * Options interface
 * @interface Options
 * @property {boolean} tms
 */
export interface Options {
	tms: boolean
}

/**
 * Reader function type
 * @typedef {function(number, number): Promise<Buffer>} Reader
 */
export type Reader = (position: number, length: number) => Promise<Buffer>

/**
 * Decompressor function type
 * @typedef {function(Buffer, Compression): Promise<Buffer>} Decompressor
 */
export type Decompressor = (data: Buffer, compression: Compression) => Promise<Buffer>;
