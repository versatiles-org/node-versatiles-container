/* eslint-disable @typescript-eslint/naming-convention */

import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import type { ResponderInterface } from './responder.js';
import type { Response } from 'express';
import { Writable } from 'stream';
import { Responder } from './responder.js';
import { jest } from '@jest/globals';

export type EnhancedResponse = Response & { getBuffer: () => Buffer };
export type EnhancedResponder = ResponderInterface & { response: EnhancedResponse };

export function getResponseSink(): EnhancedResponse {
	class ResponseSink extends Writable {
		readonly #buffers = Array<Buffer>();

		public _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
			this.#buffers.push(chunk);
			callback();
		}

		public getBuffer(): Buffer {
			if (this.#buffers.length === 1) {
				return this.#buffers[0];
			}
			return Buffer.concat(this.#buffers);
		}
	}

	const response = new ResponseSink() as unknown as EnhancedResponse;

	jest.spyOn(response, 'end');
	response.set = jest.fn<EnhancedResponse['set']>().mockReturnThis();
	response.send = jest.fn<EnhancedResponse['send']>().mockReturnThis();
	response.status = jest.fn<EnhancedResponse['status']>().mockReturnThis();
	response.type = jest.fn<EnhancedResponse['type']>().mockReturnThis();

	return response;
}

export function getMockedResponder(
	options?: {
		fastRecompression?: boolean;
		requestHeaders?: IncomingHttpHeaders;
		responseHeaders?: OutgoingHttpHeaders;
		requestNo?: number;
		verbose?: boolean;
	},
): EnhancedResponder {
	options ??= {};

	const responder = Responder({
		fastRecompression: options.fastRecompression ?? false,
		requestHeaders: options.requestHeaders ?? { 'accept-encoding': 'gzip, br' },
		requestNo: options.requestNo ?? 5,
		response: getResponseSink(),
		verbose: options.verbose ?? false,
	}) as EnhancedResponder;

	const responseHeaders = options.responseHeaders ?? { 'content-type': 'text/plain' };
	for (const key in responseHeaders) responder.set(key, responseHeaders[key] as string);

	return responder;
}
