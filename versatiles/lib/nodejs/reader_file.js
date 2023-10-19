
import fs from 'fs';

export default async function FileReader(filename) {
	let fd = await new Promise((resolve, reject) => {
		fs.open(filename, 'r', (err, fd) => {
			if (err) return reject(err);
			resolve(fd);
		});
	});

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
