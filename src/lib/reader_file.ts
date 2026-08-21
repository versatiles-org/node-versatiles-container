import fs from 'node:fs';
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
 *                   the promise is rejected with the error. Reads are bounds-checked against the file size
 *                   captured when the reader was created: a range that ends beyond the end of the file is
 *                   rejected with a `RangeError` rather than returning a short buffer.
 */
export default function getFileReader(filename: string): Reader {
	const fd = fs.openSync(filename, 'r');
	const { size } = fs.statSync(filename);

	/**
	 * Reads a chunk of data from the file at the specified position and length.
	 * It creates a buffer of the specified `length`, seeks to the `position` in the file,
	 * and reads `length` bytes into the buffer. This function is intended to be used with files
	 * that are not being concurrently modified, as it relies on consistent file state to
	 * function correctly.
	 *
	 * @param {number} position - The starting position in the file to read from. Must be non-negative.
	 * @param {number} length   - The number of bytes to read from the file starting at `position`.
	 *                            Must be non-negative.
	 * @returns {Promise<Buffer>} A promise that resolves with the buffer containing the read bytes. If
	 *                            an error occurs during the read, such as the file descriptor becoming
	 *                            invalid due to the file being closed, the promise will be rejected with
	 *                            an error.
	 * @throws {RangeError} If `position` or `length` is negative, or if `position + length` exceeds the
	 *                      size of the file.
	 */
	const read: Reader = async function read(position: number, length: number): Promise<Buffer> {
		if (position < 0) {
			throw new RangeError(
				`Invalid read position: ${position}. The read position must be a non-negative integer.`,
			);
		}
		if (length < 0) {
			throw new RangeError(
				`Invalid read length: ${length}. The read length must be a non-negative integer.`,
			);
		}
		if (position + length > size) {
			throw new RangeError(
				`Read range out of bounds: The requested range ends at position ${position + length}, which exceeds the file's limit of ${size} bytes.`,
			);
		}

		return new Promise((resolve, reject) => {
			fs.read(
				fd,
				{
					buffer: Buffer.alloc(length),
					position,
					length,
				},
				(err, _, buf) => {
					if (err) {
						reject(err);
						return;
					}
					resolve(buf);
				},
			);
		});
	};

	/**
	 * Closes the underlying file descriptor. After this resolves, the reader
	 * must not be called again.
	 */
	read.close = async function close(): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			fs.close(fd, (err) => (err ? reject(err) : resolve()));
		});
	};

	return read;
}
