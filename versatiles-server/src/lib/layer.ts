import type { Compression, Reader } from '@versatiles/container';
import { VersaTiles } from '@versatiles/container';
import type { ContainerInfo, ContentResponse, ServerOptions } from './types.js';
import { getMimeByFormat } from './mime_types.js';
import { generateStyle } from './style.js';


export class Layer {
	readonly #container: VersaTiles;

	#info?: ContainerInfo;

	#mime?: string;

	#compression?: Compression;

	public constructor(source: Reader | string, options: ServerOptions) {
		this.#container = new VersaTiles(source, { tms: options.tms ?? false });
	}

	public async init(): Promise<void> {
		if (this.#info) return;

		const header = await this.#container.getHeader();
		const metadata = await this.#container.getMetadata();
		this.#mime = getMimeByFormat(header.tileFormat ?? '');
		this.#compression = header.tileCompression;
		this.#info = { header, metadata };
	}

	public async getTileFunction(): Promise<(z: number, x: number, y: number) => Promise<ContentResponse | null>> {
		await this.init();

		const container = this.#container;
		const mime = this.#mime;
		const compression = this.#compression;

		return async (z: number, x: number, y: number): Promise<ContentResponse | null> => {
			const buffer = await container.getTile(z, x, y);
			if (!buffer) return null;
			return {
				buffer,
				mime: mime,
				compression: compression,
			};
		};
	}

	public async getInfo(): Promise<ContainerInfo> {
		await this.init();
		if (!this.#info) throw Error();
		return this.#info;
	}

	public async getStyle(options: ServerOptions): Promise<string> {
		await this.init();
		if (!this.#info) throw Error();
		return generateStyle(this.#info, options);
	}

	public async getMetadata(): Promise<object | null> {
		await this.init();
		if (!this.#info) throw Error();
		return this.#info.metadata;
	}
}
