import type { Compression, Reader } from '@versatiles/container';
import { VersaTiles } from '@versatiles/container';
import type { ContainerInfo, ContentResponse, ServerOptions } from './types.js';
import { getMimeByFormat } from './mime_types.js';


export class Layer {
	readonly #container: VersaTiles;

	#initialized = false;

	#mime?: string;

	#compression?: Compression;

	public constructor(source: Reader | string, options: ServerOptions) {
		this.#container = new VersaTiles(source, { tms: options.tms ?? false });
	}

	public async getTileFunction(): Promise<(z: number, x: number, y: number) => Promise<ContentResponse | null>> {
		if (!this.#initialized) {
			const header = await this.#container.getHeader();
			this.#mime = getMimeByFormat(header.tileFormat ?? '');
			this.#compression = header.tileCompression;
			this.#initialized = true;
		}
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
		return {
			header: await this.#container.getHeader(),
			metadata: await this.#container.getMetadata(),
		};
	}
}
