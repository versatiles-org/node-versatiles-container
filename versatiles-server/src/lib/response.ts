import type { Compression } from '@versatiles/container';
import type { ServerResponse } from 'http';
import { brotli, gzip, unbrotli, ungzip } from './compressors.js';
import type { ResponseConfig, ContentResponse } from './types.js';

export async function respondWithContent(res: ServerResponse, content: ContentResponse, config: ResponseConfig): Promise<void> {
	const mime: string = content.mime ?? 'application/octet-stream';
	let compression: Compression = content.compression ?? null;

	const { acceptGzip, acceptBr, recompress } = config;

	let data: Buffer = (typeof content.buffer === 'string') ? Buffer.from(content.buffer) : content.buffer;

	switch (compression) {
		case 'br':
			if (acceptBr) break;
			if (recompress && acceptGzip) {
				data = await gzip(await unbrotli(data));
				compression = 'gzip';
				break;
			}
			data = await unbrotli(data);
			compression = null;
			break;
		case 'gzip':
			if (acceptGzip) break;
			data = await ungzip(data);
			compression = null;
			break;
		default:
			if (recompress && acceptBr) {
				data = await brotli(data);
				compression = 'br';
				break;
			}
			if (recompress && acceptGzip) {
				data = await gzip(data);
				compression = 'gzip';
				break;
			}
			compression = null;
			break;
	}

	if (compression) res.setHeader('content-encoding', compression);

	res.statusCode = 200;
	res.setHeader('content-type', mime);
	res.end(data);
}

export function respondWithError(res: ServerResponse, err: unknown, code = 500): void {
	console.error(err);
	res.statusCode = code;
	res.setHeader('content-type', 'text/plain');
	res.end(String(err));
}
