import fs from 'fs';
import type { Reader } from './interfaces.js';

/**
 * Creates a file reader function for reading chunks of data from a file. This reader abstracts
 * the file reading process and provides a simple async interface to read data from the specified file.
 * The reader keeps the file open, hence it should be used in contexts where the file is not
 * expected to be modified by other processes. It's important to manage the lifecycle of the file
 * descriptor properly and ensure it's closed when no longer needed.
 *
 * @param {string} filename - The name of the file to read from. This file must exist and be readable,
 *                            otherwise the function will throw an error when trying to open it.
 * @returns {Reader} A reader function that when called, returns a promise. This promise resolves with a
 *                   Buffer containing the read bytes from the file. The function reads `length` bytes of data
 *                   from the file starting at `position`. If an error occurs during the read operation,
 *                   the promise is rejected with the error. If `position` is beyond the end of the file,
 *                   the promise resolves to an empty buffer. If the read operation attempts to read beyond
 *                   the end of the file, the promise resolves with a buffer that contains only the bytes
 *                   that could be read.
 */
export default function getFileReader(filename: string): Reader {
	const fd = fs.openSync(filename, 'r');

	/**
	 * Reads a chunk of data from the file at the specified position and length.
	 * It creates a buffer of the specified `length`, seeks to the `position` in the file,
	 * and reads `length` bytes into the buffer. This function is intended to be used with files
	 * that are not being concurrently modified, as it relies on consistent file state to
	 * function correctly.
	 *
	 * @param {number} position - The starting position in the file to read from. If this position
	 *                            is beyond the end of the file, the function will resolve to an
	 *                            empty buffer.
	 * @param {number} length   - The number of bytes to read from the file starting at `position`.
	 *                            If `length` extends beyond the end of the file, the returned buffer
	 *                            will only include the bytes that could be read up to the end of the file.
	 * @returns {Promise<Buffer>} A promise that resolves with the buffer containing the read bytes. If
	 *                            an error occurs during the read, such as if the position is invalid or
	 *                            the file descriptor becomes invalid due to the file being closed, the
	 *                            promise will be rejected with an error.
	 */
	return async function read(position: number, length: number): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			fs.read(fd, {
				buffer: Buffer.alloc(length),
				position,
				length,
			}, (err, _, buf) => {
				if (err) {
					reject(err); return;
				}
				resolve(buf);
			});
		});
	};
}
