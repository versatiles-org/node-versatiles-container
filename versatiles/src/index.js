
import HttpReader from './nodejs/reader_http.js';
import FileReader from './nodejs/reader_file.js';
import { decompress } from './nodejs/decompress.js';
import { getBlockIndex } from './container/get_block_index.js';
import { getHeader } from './container/get_header.js';
import { getMeta } from './container/get_meta.js';
import { getTile } from './container/get_tile.js';
import { getTileIndex } from './container/get_tile_index.js';

export class Versatiles {
	options = {
		tms: false
	}

	constructor(source, options) {
		Object.assign(this.options, options)

		if (typeof source === 'string') {
			if (source.startsWith('https://')) {
				this.read = new HttpReader(source);
			} else if (source.startsWith('http://')) {
				this.read = new HttpReader(source);
			} else {
				this.read = new FileReader(source);
			}
		} else if (typeof source === 'function') {
			this.read = source;
		}

		Object.assign(this, {
			decompress,
			getBlockIndex,
			getHeader,
			getMeta,
			getTile,
			getTileIndex,
		})
	}

	async getTileUncompressed(z, x, y) {
		let tile = await this.getTile(z, x, y);
		let header = await this.getHeader()
		return await this.decompress(tile, header.tile_compression);
	}
}
