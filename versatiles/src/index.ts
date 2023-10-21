import HttpReader from './nodejs/reader_http.js';
import FileReader from './nodejs/reader_file.js';
import { decompress } from './nodejs/decompress.js';



export type Compression = 'gzip' | 'br' | null;

export type Format = 'avif' | 'bin' | 'geojson' | 'jpeg' | 'json' | 'pbf' | 'png' | 'svg' | 'topojson' | 'webp' | null;

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

export interface Block {
	level: number;
	column: number;
	row: number;
	col_min: number;
	row_min: number;
	col_max: number;
	row_max: number;
	block_offset: number;
	tile_blobs_length: number | null;
	tile_index_offset: number;
	tile_index_length: number;
	tile_index: Buffer | null;
}

export interface Options {
	tms: boolean
}

export type Reader = (position: number, length: number) => Promise<Buffer>
export type Decompressor = (data: Buffer, compression: Compression) => Promise<Buffer>;



const FORMATS: Record<string, Format[]> = {
	'c01': ['png', 'jpeg', 'webp', ...Array(13).fill(null), 'pbf'],
	'v01': ['png', 'jpeg', 'webp', 'pbf'],
	'v02': [
		'bin', ...Array(15).fill(null),
		'png', 'jpeg', 'webp', 'avif', 'svg', ...Array(11).fill(null),
		'pbf', 'geojson', 'topojson', 'json'
	],
};
const COMPRESSIONS: Compression[] = [null, 'gzip', 'br'];



export class VersaTiles {
	options: Options = {
		tms: false
	};
	read: Reader;
	decompress: Decompressor;
	header?: Header;
	meta?: Object;
	block_index?: Map<string, Block>;

	constructor(source: string | Reader, options?: Options) {
		Object.assign(this.options, options);

		if (typeof source === 'string') {
			if (source.startsWith('https://') || source.startsWith('http://')) {
				this.read = HttpReader(source);
			} else {
				this.read = FileReader(source);
			}
		} else if (typeof source === 'function') {
			this.read = source;
		} else {
			throw new Error('source must be a string or a Reader');
		}

		this.decompress = decompress;
	}

	async getTileUncompressed(z: number, x: number, y: number): Promise<Buffer> {
		let tile = await this.getTile(z, x, y);
		let header = await this.getHeader();
		return await this.decompress(tile, header.tile_compression);
	}

	async getHeader(): Promise<Header> {
		// deliver if known
		if (this.header) return this.header;

		let data = await this.read(0, 66);

		// check magic bytes
		if (!/^versatiles_v0[12]$/.test(data.toString('utf8', 0, 14))) {
			throw new Error('Invalid Container');
		}

		const version = data.toString('utf8', 11, 14);

		switch (version) {
			case 'v01':
				this.header = {
					magic: data.toString('utf8', 0, 14),
					version: version,
					tile_format: FORMATS[version][data.readUInt8(14)] || 'bin',
					tile_compression: COMPRESSIONS[data.readUInt8(15)] || null,
					zoom_min: data.readUInt8(16),
					zoom_max: data.readUInt8(17),
					bbox_min_x: data.readFloatBE(18),
					bbox_min_y: data.readFloatBE(22),
					bbox_max_x: data.readFloatBE(26),
					bbox_max_y: data.readFloatBE(30),
					meta_offset: Number(data.readBigUInt64BE(34)),
					meta_length: Number(data.readBigUInt64BE(42)),
					block_index_offset: Number(data.readBigUInt64BE(50)),
					block_index_length: Number(data.readBigUInt64BE(58)),
				}
				break;
			case 'v02':
				this.header = {
					magic: data.toString('utf8', 0, 14),
					version: version,
					tile_format: FORMATS[version][data.readUInt8(14)] || 'bin',
					tile_compression: COMPRESSIONS[data.readUInt8(15)] || null,
					zoom_min: data.readUInt8(16),
					zoom_max: data.readUInt8(17),
					bbox_min_x: data.readInt32BE(18) / 1e7,
					bbox_min_y: data.readInt32BE(22) / 1e7,
					bbox_max_x: data.readInt32BE(26) / 1e7,
					bbox_max_y: data.readInt32BE(30) / 1e7,
					meta_offset: Number(data.readBigUInt64BE(34)),
					meta_length: Number(data.readBigUInt64BE(42)),
					block_index_offset: Number(data.readBigUInt64BE(50)),
					block_index_length: Number(data.readBigUInt64BE(58)),
				};
				break;
			default:
				throw new Error('Invalid Container');
		}

		Object.freeze(this.header);

		return this.header;
	}

	async getMeta(): Promise<Object> {
		if (this.meta) return this.meta;

		let header = await this.getHeader();
		let meta = {};

		if (header.meta_length > 0) {
			let header = await this.getHeader();
			let data = await this.read(header.meta_offset, header.meta_length);
			data = await this.decompress(data, header.tile_compression);

			try {
				meta = JSON.parse(data.toString());
			} catch (err) {
				meta = {}; // empty
			}
		}

		this.meta = meta;
		Object.freeze(this.meta);

		return this.meta;
	}

	async getBlockIndex(): Promise<Map<string, Block>> {
		if (this.block_index) return this.block_index;

		let header = await this.getHeader()

		// read block_index buffer
		let data = await this.read(header.block_index_offset, header.block_index_length)
		data = await this.decompress(data, 'br')

		// read index from buffer
		let blocks = [];

		switch (header.version) {
			case 'c01':
			case 'v01':

				// check blog index length
				if (data.length % 29 !== 0) throw new Error('invalid block index');

				for (let i = 0; i < data.length; i += 29) {
					blocks.push({
						level: data.readUInt8(0 + i),
						column: data.readUInt32BE(1 + i),
						row: data.readUInt32BE(5 + i),
						col_min: data.readUInt8(9 + i),
						row_min: data.readUInt8(10 + i),
						col_max: data.readUInt8(11 + i),
						row_max: data.readUInt8(12 + i),
						block_offset: 0, // all positions are relative to the whole file
						tile_blobs_length: null, // indeterminable
						tile_index_offset: Number(data.readBigUInt64BE(13 + i)),
						tile_index_length: Number(data.readBigUInt64BE(21 + i)),
						tile_index: null,
					});
				};
				break;
			case 'v02':

				// check blog index length
				if (data.length % 33 !== 0) throw new Error('invalid block index');

				for (let i = 0; i < data.length; i += 33) {
					blocks.push({
						level: data.readUInt8(0 + i),
						column: data.readUInt32BE(1 + i),
						row: data.readUInt32BE(5 + i),
						col_min: data.readUInt8(9 + i),
						row_min: data.readUInt8(10 + i),
						col_max: data.readUInt8(11 + i),
						row_max: data.readUInt8(12 + i),
						block_offset: Number(data.readBigUInt64BE(13 + i)),
						tile_blobs_length: Number(data.readBigUInt64BE(21 + i)),
						tile_index_offset: Number(data.readBigUInt64BE(13 + i) + data.readBigUInt64BE(21 + i)), // block_offset + tile_blobs_length
						tile_index_length: data.readUInt32BE(29 + i),
						tile_index: null,
					});
				};
				break;
		}

		// build map
		this.block_index = new Map(blocks.map(b => [`${b.level},${b.column},${b.row}`, b]));

		return this.block_index;
	}

	async getTileIndex(block: Block): Promise<Buffer> {
		if (block.tile_index) return block.tile_index;

		let data = await this.read(block.tile_index_offset, block.tile_index_length)
		data = await this.decompress(data, 'br');
		block.tile_index = data;

		return data;
	}

	async getTile(z: number, x: number, y: number): Promise<Buffer> {
		// when y index is inverted
		if (this.options.tms) y = Math.pow(2, z) - y - 1;

		// ensure block index is loaded
		const blockIndex = await this.getBlockIndex()

		// block xy
		const bx = x >> 8;
		const by = y >> 8;

		// tile xy (within block)
		const tx = x & 0xFF;
		const ty = y & 0xFF;

		// check if block containing tile is within bounds
		let blockKey = `${z},${bx},${by}`;
		let block = blockIndex.get(blockKey);
		if (!block) throw new Error('block not found');

		// check if block contains tile
		if (tx < block.col_min || tx > block.col_max) throw new Error('Invalid X within Block');
		if (ty < block.row_min || ty > block.row_max) throw new Error('Invalid Y within Block');

		// calculate sequential tile number
		const j = (ty - block.row_min) * (block.col_max - block.col_min + 1) + (tx - block.col_min);

		// get tile index
		let tile_index = await this.getTileIndex(block);

		const tile_offset = Number(tile_index.readBigUInt64BE(12 * j)) + block.block_offset;
		const tile_length = tile_index.readUInt32BE(12 * j + 8);

		// shortcut: return empty buffer
		if (tile_length === 0) return Buffer.allocUnsafe(0);

		return await this.read(tile_offset, tile_length);
	}
}
