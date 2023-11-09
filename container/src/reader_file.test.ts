import { statSync } from 'fs';
import getFileReader from './reader_file.js';

const TESTFILE = new URL('../../test/island.versatiles', import.meta.url).pathname;

describe('getFileReader', () => {
	it('reads a chunk of data from a file', async () => {
		const read = getFileReader(TESTFILE);
		const buffer = await read(5, 7);
		expect(buffer.length).toEqual(7);
		expect(buffer.toString()).toEqual('tiles_v');
	});

	it('reads to the end of the file when length exceeds file size', async () => {
		const read = getFileReader(TESTFILE);
		const { size } = statSync(TESTFILE);
		console.log(size);

		await expect(async () => {
			await read(size - 5, 10);
		}).rejects.toThrow('position + length > size');
	});

	it('rejects the promise when attempting to read a non-existing file', () => {
		expect(() => {
			getFileReader('non_existing_file.txt');
		}).toThrow('ENOENT: no such file or directory, open \'non_existing_file.txt\'');
	});
});
