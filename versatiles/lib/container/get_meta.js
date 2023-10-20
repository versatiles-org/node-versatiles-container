
export async function getMeta() {
	if (this.meta) return this.meta;

	let meta = {};

	if (this.header.meta_length > 0) {
		let header = await this.getHeader();
		let data = await this.read(header.meta_offset, header.meta_length);
		data = await this.decompress(data, header.tile_precompression);

		try {
			meta = JSON.parse(data);
		} catch (err) {
			meta = {}; // empty
		}
	}

	this.meta = meta;
	Object.freeze(this.meta);

	return this.meta;
}
