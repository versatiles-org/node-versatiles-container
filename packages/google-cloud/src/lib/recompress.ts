
import type { EncodingTools } from './encoding.js';
import type { ResponderInterface } from './responder.js';
import { ENCODINGS, acceptEncoding, findBestEncoding, parseContentEncoding } from './encoding.js';
import { Writable, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const maxBufferSize = 10 * 1024 * 1024;

export class BufferStream extends Writable {
	readonly #responder: ResponderInterface;

	readonly #logPrefix: string | undefined;

	readonly #buffers: Buffer[] = [];

	#size = 0;

	#bufferMode = true;

	/*
	 * Class constructor will receive the injections as parameters.
	 */
	public constructor(
		responder: ResponderInterface,
		logPrefix?: string,
	) {
		super();
		this.#responder = responder;
		this.#logPrefix = logPrefix;
	}

	public _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
		//public _write(chunk: any, encoding: any, callback: () => void) {
		if (this.#logPrefix != null) {
			console.log(this.#logPrefix, 'new chunk:', chunk.length);
		}

		if (this.#bufferMode) {
			this.#buffers.push(chunk);
			this.#size += chunk.length;

			if (this.#size >= maxBufferSize) {
				if (this.#logPrefix != null) {
					console.log(this.#logPrefix, 'stop bufferMode:', this.#buffers.length);
				}

				this.#bufferMode = false;
				this.#prepareStreamMode();

				const buffer = Buffer.concat(this.#buffers);
				this.#buffers.length = 0;

				this.#responder.response.write(buffer, encoding, () => {
					callback();
				});
			} else {
				callback();
			}
		} else {
			this.#responder.response.write(chunk, encoding, () => {
				callback();
			});
		}
	}

	public _final(callback: (error?: Error | null | undefined) => void): void {

		if (this.#logPrefix != null) {
			console.log(this.#logPrefix, 'finish stream');
		}

		if (this.#bufferMode) {
			const buffer = Buffer.concat(this.#buffers);

			if (this.#logPrefix != null) {
				console.log(this.#logPrefix, 'flush to handleBuffer:', buffer.length);
			}

			this.#prepareBufferMode(buffer.length);
			this.#responder.response.end(buffer, (): void => {
				callback();
			});
		} else {
			this.#responder.response.end((): void => {
				callback();
			});
		}
	}

	#prepareBufferMode(bufferLength: number): void {
		this.#responder.del('transfer-encoding');

		this.#responder.responseHeaders['content-length'] ??= '' + bufferLength;

		if (this.#logPrefix != null) {
			console.log(this.#logPrefix, 'response header for buffer:', this.#responder.responseHeaders);
			console.log(this.#logPrefix, 'response buffer length:', bufferLength);
		}

		this.#responder.response
			.status(200)
			.set(this.#responder.responseHeaders);
	}

	#prepareStreamMode(): void {
		this.#responder.set('transfer-encoding', 'chunked');
		this.#responder.del('content-length');

		if (this.#logPrefix != null) {
			console.log(this.#logPrefix, 'response header for stream:', this.#responder.responseHeaders);
		}

		this.#responder.response
			.status(200)
			.set(this.#responder.responseHeaders);
	}
}

export async function recompress(
	responder: ResponderInterface,
	body: Buffer | Readable,
	logPrefix?: string,
): Promise<void> {

	// detect encoding:
	const encodingIn: EncodingTools | null = parseContentEncoding(responder.responseHeaders);
	let encodingOut: EncodingTools | null = encodingIn;

	const mediaType = String(responder.responseHeaders['content-type']).replace(/\/.*/, '').toLowerCase();

	// do not recompress images, videos, ...
	switch (mediaType) {
		case 'audio':
		case 'image':
		case 'video':
			if (!acceptEncoding(responder.requestHeaders, encodingOut)) {
				// decompress it
				encodingOut = ENCODINGS.raw;
			}
			break;
		default:
			if (responder.fastRecompression) {
				if (!acceptEncoding(responder.requestHeaders, encodingOut)) {
					// decompress it
					encodingOut = ENCODINGS.raw;
				}
			} else {
				// find best accepted encoding
				encodingOut = findBestEncoding(responder.requestHeaders);
			}
	}

	responder.set('vary', 'accept-encoding');

	encodingOut.setEncodingHeader(responder.responseHeaders);

	const streams: (Readable | Writable)[] = [];
	if (Buffer.isBuffer(body)) {
		streams.push(Readable.from(body));
	} else if (Readable.isReadable(body)) {
		streams.push(body);
	} else {
		throw Error('neither Readable nor Buffer');
	}

	if (encodingIn !== encodingOut) {
		if (logPrefix != null) {
			console.log(logPrefix, 'recompress:', encodingIn.name, encodingOut.name);
		}

		//stream = new Wrapper(stream);

		if (encodingIn.decompressStream) {
			streams.push(encodingIn.decompressStream());
		}

		if (encodingOut.compressStream) {
			streams.push(encodingOut.compressStream(responder.fastRecompression));
		}

		responder.del('content-length');
	}

	streams.push(new BufferStream(responder, (logPrefix != null) ? logPrefix + ' bufferStream' : undefined));

	await pipeline(streams);

	return;
}