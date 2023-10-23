
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
 * @property {string} magic - first bytes of the container, usually "versatiles_v02"
 * @property {string} version - version of the versatiles container, usually "v02"
 * @property {Format} tileFormat - file format of the stored tiles
 * @property {Compression} tileCompression - compression of the stored tiles
 * @property {number} zoomMin - minimum zoom level
 * @property {number} zoomMax - maximum zoom level
 * @property {[number, number, number, number]} bbox - bounding box of this container: `[lon_min, lat_min, lon_min, lat_min]`
 * @property {number} metaOffset - position of the first byte of the metadata inside the container. metadata is compressed with `tileCompression`.
 * @property {number} metaLength - length of the metadata in bytes. `metaLength = 0` means there is no metadata.
 * @property {number} blockIndexOffset - position of the first byte of the block index inside the container. block index is compressed with brotli.
 * @property {number} blockIndexLength - length of the block index in bytes. `blockIndexLength = 0` means there aren't any tiles in the container.
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
 * Defines a block of tiles, including all necessary metadata. see also the [spec v02](https://github.com/versatiles-org/versatiles-spec/blob/main/v02/readme.md#block_index)
 * @property {number} level - zoom level
 * @property {number} column - column of the block in this zoom level
 * @property {number} row - row of the block in this zoom level
 * @property {number} colMin - minimum column where a tile is stored in this block (0..255)
 * @property {number} rowMin - minimum row where a tile is stored in this block (0..255)
 * @property {number} colMax - maximum column where a tile is stored in this block (0..255)
 * @property {number} rowMax - maximum row where a tile is stored in this block (0..255)
 * @property {number} blockOffset - byte position of this block in the container
 * @property {number} tileIndexOffset - byte position of the tile index in the container
 * @property {number} tileIndexLength - byte length of the tile index
 * @property {number} tileCount - number of tiles in this block
 * @property {TileIndex=} tileIndex - tile index, if it was already fetched
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
 * @property {Float64Array} offsets - array of positions of the first byte of the tiles inside the block. tiles are compressed with `tileCompression`.
 * @property {Float64Array} lengths - array of length of the tiles in bytes. `lengths[i] = 0` means that this tile does not stored.
 */
export interface TileIndex {
	offsets: Float64Array;
	lengths: Float64Array;
}



/**
 * Defines supported options for reading a container.
 * @property {boolean} tms - if true, the [TMS (Tile Map Service) tile ordering](https://wiki.openstreetmap.org/wiki/TMS)  is used, so y = 0 means south
 */
export interface Options {
	tms: boolean
}
