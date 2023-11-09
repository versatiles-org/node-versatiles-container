import { basename, resolve } from 'node:path';
import { StaticContent } from './static_content.js';
import { readdirSync, readFileSync } from 'node:fs';

describe('StaticContent', () => {
	let staticContent: StaticContent;

	beforeEach(() => {
		staticContent = new StaticContent();
	});

	describe('constructor', () => {
		it('should create an instance', () => {
			expect(staticContent).toBeInstanceOf(StaticContent);
		});
	});

	describe('add method', () => {
		it('should add a text content', () => {
			const path = '/text';
			const content = 'Hello World';
			const mime = 'text/plain';
			staticContent.add(path, content, mime);
			expect(staticContent.get(path)).toEqual([Buffer.from(content), mime, null]);
		});

		it('should throw an error if path already exists', () => {
			const path = '/duplicate';
			const content = 'Hello World';
			const mime = 'text/plain';
			staticContent.add(path, content, mime);
			expect(() => {
				staticContent.add(path, content, mime);
			}).toThrow();
		});
	});

	describe('addFolder method', () => {
		it('should add files from a folder', () => {
			const url = '/';
			const dir = new URL('../../static', import.meta.url).pathname;
			const files = (readdirSync(dir, { recursive: true }) as string[])
				.filter(filename => !basename(filename).startsWith('.'));

			const mimeTypes = new Map([
				['html', 'text/html'],
				['css', 'text/css'],
				['png', 'image/png'],
			]);

			staticContent.addFolder(url, dir);

			files.forEach((file: string) => {
				const expectedPath = url + file;
				expect(staticContent.get(expectedPath)).toEqual([
					readFileSync(resolve(dir, file)),
					mimeTypes.get(file.replace(/.*\./, '')),
					null,
				]);
			});
		});
	});
});
