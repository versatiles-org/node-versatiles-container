/* eslint-disable @typescript-eslint/naming-convention */
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import { ENCODINGS, type EncodingType } from './encoding.js';
import type { Response } from 'express';
import { recompress } from './recompress.js';

export interface ResponderInterface {
	del: (key: string) => void;
	error: (code: number, message: string) => void;
	fastRecompression: boolean;
	requestNo: number;
	requestHeaders: IncomingHttpHeaders;
	respond: (content: Buffer | string, contentMIME: string, contentEncoding: EncodingType) => Promise<void>;
	response: Response;
	responseHeaders: OutgoingHttpHeaders;
	set: (key: string, value: string) => ResponderInterface;
	verbose: boolean;
}

export function Responder(options: {
	fastRecompression: boolean;
	requestHeaders: IncomingHttpHeaders;
	response: Response;
	requestNo: number;
	verbose: boolean;
}): ResponderInterface {
	const { fastRecompression, response, requestHeaders, requestNo, verbose } = options;

	const responseHeaders: OutgoingHttpHeaders = {
		'cache-control': 'max-age=86400', // default: 1 day
	};

	const responder: ResponderInterface = {
		error,
		del,
		get fastRecompression(): boolean {
			return fastRecompression;
		},
		get requestHeaders(): IncomingHttpHeaders {
			return requestHeaders;
		},
		get requestNo(): number {
			return requestNo;
		},
		respond,
		get response(): Response {
			return response;
		},
		get responseHeaders(): OutgoingHttpHeaders {
			return responseHeaders;
		},
		set,
		get verbose(): boolean {
			return verbose;
		},
	};

	return responder;

	async function respond(body: Buffer | string, contentType: string, encoding: EncodingType): Promise<void> {
		set('content-type', contentType);
		ENCODINGS[encoding].setEncodingHeader(responseHeaders);
		if (typeof body === 'string') body = Buffer.from(body);
		if (verbose) console.log(`  #${requestNo} respond`);
		await recompress(responder, body);
	}

	function error(code: number, message: string): void {
		if (verbose) console.log(`  #${requestNo} error ${code}: ${message}`);
		response
			.status(code)
			.type('text')
			.send(message);
	}

	function set(key: string, value: string): ResponderInterface {
		responseHeaders[key] = value;
		return responder;
	}

	function del(key: string): void {
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete responseHeaders[key];
	}
}
