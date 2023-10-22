import fs from 'fs';
import { Reader } from './interfaces';

/**
 * Creates a file reader function for reading chunks of data from a file.
 *
 * @param {string} filename - The name of the file to read from.
 * @returns {Reader} A reader function for reading chunks of data.
 */
export default function getFileReader(filename: string): Reader {
	const fd = fs.openSync(filename, 'r');

	/**
	 * Reads a chunk of data from the file at the specified position and length.
	 *
	 * @param {number} position - The starting position in the file to read from.
	 * @param {number} length - The number of bytes to read.
	 * @returns {Promise<Buffer>} A promise that resolves with the read buffer.
	 */
	return async function read(position: number, length: number): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			fs.read(fd, {
				buffer: Buffer.alloc(length),
				position,
				offset: 0,
				length,
			}, (err, _, buf) => {
				if (err) return reject(err);
				resolve(buf);
			});
		});
	}
}
