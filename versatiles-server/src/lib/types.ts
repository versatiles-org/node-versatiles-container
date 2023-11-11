import type { Compression } from '@versatiles/container';

export interface ContentResponse {
	buffer: Buffer | string;
	mime?: string;
	compression?: Compression;
}

export interface ResponseConfig {
	acceptGzip: boolean;
	acceptBr: boolean;
	recompress: boolean;
}
