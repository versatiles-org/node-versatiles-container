
import type { EncodingTools } from './encoding.js';
import type { ResponderInterface } from './responder.js';
import { ENCODINGS, acceptEncoding, findBestEncoding, parseContentEncoding } from './encoding.js';
import { Writable, Readable } from 'node:stream';

const maxBufferSize = 10 * 1024 * 1024;

export class BufferStream extends Writable {
	readonly #handleBuffer: (buffer: Buffer) => void;

	readonly #handleStream: () => Writable;

	readonly #logPrefix: string | undefined;

	readonly #buffers: Buffer[] = [];

	#size = 0;

	#bufferMode = true;

	#outputStream = new Writable();

	/*
	 * Class constructor will receive the injections as parameters.
	 */
	public constructor(
		handleBuffer: (buffer: Buffer) => void,
		handleStream: () => Writable,
		logPrefix?: string,
	) {
		super();

		this.#handleBuffer = handleBuffer;
		this.#handleStream = handleStream;
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
				this.#outputStream = this.#handleStream();

				const buffer = Buffer.concat(this.#buffers);
				this.#buffers.length = 0;

				this.#outputStream.write(buffer, encoding, () => {
					callback();
				});
			} else {
				callback();
			}
		} else {
			this.#outputStream.write(chunk, encoding, () => {
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

			this.#handleBuffer(buffer);
			callback();
		} else {
			this.#outputStream.end((): void => {
				callback();
			});
		}
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

	let stream: Readable = Readable.from(body);

	if (encodingIn !== encodingOut) {
		if (logPrefix != null) {
			console.log(logPrefix, 'recompress:', encodingIn.name, encodingOut.name);
		}
		stream = stream.pipe(encodingIn.decompressStream()).pipe(encodingOut.compressStream(responder.fastRecompression));
		responder.del('content-length');
	}

	const bufferStream = new BufferStream(handleBuffer, handleStream, (logPrefix != null) ? logPrefix + ' bufferStream' : undefined);
	stream.pipe(bufferStream);

	await new Promise(resolve => {
		bufferStream.on('finish', () => {
			resolve(null);
		});
	});

	return;

	function handleBuffer(buffer: Buffer): void {
		responder.del('transfer-encoding');

		responder.responseHeaders['content-length'] ??= '' + buffer.length;

		if (logPrefix != null) {
			console.log(logPrefix, 'response header for buffer:', responder.responseHeaders);
			console.log(logPrefix, 'response buffer length:', buffer.length);
		}

		responder.response
			.status(200)
			.set(responder.responseHeaders)
			.end(buffer);
	}

	function handleStream(): Writable {
		responder.set('transfer-encoding', 'chunked');
		responder.del('content-length');

		if (logPrefix != null) {
			console.log(logPrefix, 'response header for stream:', responder.responseHeaders);
		}

		responder.response
			.status(200)
			.set(responder.responseHeaders);

		return responder.response;
	}
}
