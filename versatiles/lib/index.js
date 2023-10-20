
import HttpReader from './nodejs/reader_http.js';
import FileReader from './nodejs/reader_file.js';
import { getHeader } from './container/get_header.js';
import { getMeta } from './container/get_meta.js';
import { getTile } from './container/get_tile.js';
import { decompress } from './nodejs/decompress.js';

export class Versatiles {
	opt = {
		tms: false
	}
	constructor(source, options) {
		Object.assign(this.opt, options)

		if (source.startsWith('https://')) {
			this.read = new HttpReader(source);
		} else if (source.startsWith('http://')) {
			this.read = new HttpReader(source);
		} else {
			this.read = new FileReader(source);
		}

		Object.assign(this, {
			decompress,
			getHeader,
			getMeta,
			getTile,
		})
	}
}
