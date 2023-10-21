
export async function getTile(z, x, y) {
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
