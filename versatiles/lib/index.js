
import HttpReader from './nodejs/reader_http.js';
import FileReader from './nodejs/reader_file.js';
import { getHeader } from './container/get_header.js';
import { getMeta } from './container/get_meta.js';
import { decompress } from './nodejs/decompress.js';

export class Versatiles {
	opt = {
		tms: false
	}
	constructor(src, opt) {
		Object.assign(this.opt, opt)

		if (src.startsWith('https://')) {
			this.read = new HttpReader(src);
		} else if (src.startsWith('http://')) {
			this.read = new HttpReader(src);
		} else {
			this.read = new FileReader(src);
		}

		Object.assign(this, {
			getHeader,
			getMeta,
			decompress,
		})
	}
}
