
import fs from 'fs';

export default function getFileReader(filename) {
	let fd = fs.openSync(filename, 'r');

	return async function read(position, length) {
		return await new Promise((resolve, reject) => {
			fs.read(fd, {
				buffer: Buffer.alloc(Number(length)),
				position: position,
				offset: 0,
				length: Number(length),
			}, (err, r, buf) => {
				if (err) return reject(err);
				resolve(buf);
			})
		})
	}
}
