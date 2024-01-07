/* eslint-disable @typescript-eslint/require-await */

import type { Bucket, FileMetadata } from '@google-cloud/storage';
import { createReadStream, existsSync, statSync } from 'fs';
import { resolve } from 'path';
import type { Readable } from 'stream';


export function createLocalDirectoryBucket(basePath: string): Bucket {
	return {
		file: (relativePath: string): File => {
			const path = resolve(basePath, relativePath);
			return {
				exists: async (): Promise<[boolean]> => [existsSync(path)],
				getMetadata: async (): Promise<[FileMetadata]> => {
					const stat = statSync(path);
					return [{ size: stat.size }];
				},
				createReadStream: (opt?: { start: number; end: number }): Readable => createReadStream(path, opt),
			} as unknown as File;
		},
	} as unknown as Bucket;
}
