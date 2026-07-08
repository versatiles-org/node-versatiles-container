import { statSync } from 'fs';
import getFileReader from './reader_file.js';
import { describe, expect, it } from 'vitest';

const TESTFILE = new URL('../../testdata/island.versatiles', import.meta.url).pathname;

describe('getFileReader', () => {
	const read = getFileReader(TESTFILE);
	const { size } = statSync(TESTFILE);

	it('reads a chunk of data from a file', async () => {
		const buffer = await read(5, 7);
		expect(buffer.length).toEqual(7);
		expect(buffer.toString()).toEqual('tiles_v');
	});

	it('read 0 bytes', async () => {
		const buffer = await read(20, 0);
		expect(buffer.length).toEqual(0);
		expect(buffer.toString()).toEqual('');
	});

	it('position < 0', async () => {
		await expect(read(-1, 7)).rejects.toThrow(
			'Invalid read position: -1. The read position must be a non-negative integer.',
		);
		await expect(read(-1, 7)).rejects.toThrow(RangeError);
	});

	it('length < 0', async () => {
		await expect(read(15, -1)).rejects.toThrow(
			'Invalid read length: -1. The read length must be a non-negative integer.',
		);
		await expect(read(15, -1)).rejects.toThrow(RangeError);
	});

	it('position + length > size', async () => {
		await expect(read(size - 5, 8)).rejects.toThrow(
			`Read range out of bounds: The requested range ends at position ${size + 3}, which exceeds the file's limit of ${size} bytes.`,
		);
		await expect(read(size - 5, 8)).rejects.toThrow(RangeError);
	});

	it('rejects the promise when attempting to read a non-existing file', () => {
		expect(() => {
			getFileReader('non_existing_file.txt');
		}).toThrow("ENOENT: no such file or directory, open 'non_existing_file.txt'");
	});

	describe('close', () => {
		it('exposes a close method', () => {
			const reader = getFileReader(TESTFILE);
			expect(typeof reader.close).toBe('function');
		});

		it('closes the file descriptor so later reads fail', async () => {
			const reader = getFileReader(TESTFILE);
			// works before closing
			expect((await reader(0, 4)).length).toEqual(4);
			await reader.close!();
			// the descriptor is gone -> reading rejects with EBADF
			await expect(reader(0, 4)).rejects.toThrow(/EBADF/);
		});
	});
});
