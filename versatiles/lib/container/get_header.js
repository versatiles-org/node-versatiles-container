


const COMPRESSION = [null, 'gzip', 'br'];

const FORMATS = {
	'c01': ['png', 'jpeg', 'webp', ...Array(13), 'pbf'], // legacy opencloudtiles
	'v01': ['png', 'jpeg', 'webp', 'pbf'],
	'v02': [
		'bin', ...Array(15),
		'png', 'jpeg', 'webp', 'avif', 'svg', ...Array(11),
		'pbf', 'geojson', 'topojson', 'json'
	],
};

export async function getHeader() {
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
				tile_precompression: COMPRESSION[data.readUInt8(15)] || null,
				zoom_min: data.readUInt8(16),
				zoom_max: data.readUInt8(17),
				bbox_min_x: data.readFloatBE(18),
				bbox_min_y: data.readFloatBE(22),
				bbox_max_x: data.readFloatBE(26),
				bbox_max_y: data.readFloatBE(30),
				meta_offset: data.readBigUInt64BE(34),
				meta_length: data.readBigUInt64BE(42),
				block_index_offset: data.readBigUInt64BE(50),
				block_index_length: data.readBigUInt64BE(58),
			}
			break;
		case 'v02':
			this.header = {
				magic: data.toString('utf8', 0, 14),
				version: version,
				tile_format: FORMATS[version][data.readUInt8(14)] || 'bin',
				tile_precompression: COMPRESSION[data.readUInt8(15)] || null,
				zoom_min: data.readUInt8(16),
				zoom_max: data.readUInt8(17),
				bbox_min_x: data.readInt32BE(18) / 1e7,
				bbox_min_y: data.readInt32BE(22) / 1e7,
				bbox_max_x: data.readInt32BE(26) / 1e7,
				bbox_max_y: data.readInt32BE(30) / 1e7,
				meta_offset: data.readBigUInt64BE(34),
				meta_length: data.readBigUInt64BE(42),
				block_index_offset: data.readBigUInt64BE(50),
				block_index_length: data.readBigUInt64BE(58),
			};
			break;
		default:
			throw new Error('Invalid Container');
	}

	Object.freeze(this.header);

	return this.header;
}
