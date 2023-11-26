import { resolve } from 'path';
import { generateTsMarkdownDoc } from './typedoc.js';

const DIRNAME = new URL('.', import.meta.url).pathname;

describe('generateTsMarkdownDoc', () => {
	it('generates markdown documentation from TypeScript files', async () => {
		// Test the generateTsMarkdownDoc function
		const markdownDoc = await generateTsMarkdownDoc(
			[resolve(DIRNAME, 'typedoc.test.ts')],
			resolve(DIRNAME, '../../tsconfig.build.json')
		);

		// Assertions to validate the generated markdown
		expect(markdownDoc).toBeDefined();
		expect(typeof markdownDoc).toBe('string');
		console.log(markdownDoc);
	});
});

export function b(n: number, s: string): boolean {
	return true;
}

export class C {
	d: number = 1
	constructor() { }
}
