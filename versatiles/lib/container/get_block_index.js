
export async function getBlockIndex() {
	if (this.block_index) return this.block_index;

	let header = await this.getHeader()

	// read block_index buffer
	let data = await this.read(header.block_index_offset, header.block_index_length)
	data = await this.decompress(data, 'br')

	// read index from buffer
	let blocks = [];

	switch (this.header.version) {
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
