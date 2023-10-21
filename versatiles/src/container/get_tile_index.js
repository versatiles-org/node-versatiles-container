

// get tile index for block
export async function getTileIndex(block) {
	if (block.tile_index) return block.tile_index;

	let data = await this.read(block.tile_index_offset, block.tile_index_length)
	block.tile_index = await this.decompress(data, 'br');

	return block.tile_index;
}
