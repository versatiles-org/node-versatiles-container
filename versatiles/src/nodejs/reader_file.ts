import fs from 'fs';

export default function getFileReader(filename: string): (position: number, length: number) => Promise<Buffer> {
	const fd = fs.openSync(filename, 'r');

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
