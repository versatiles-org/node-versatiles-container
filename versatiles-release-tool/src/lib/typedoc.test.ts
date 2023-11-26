import { resolve } from 'path';
import { generateTsMarkdownDoc } from './typedoc.js';
import { readFileSync } from 'fs';

const DIRNAME = new URL('.', import.meta.url).pathname;

describe('generateTsMarkdownDoc', () => {
	it('generates markdown documentation from TypeScript files', async () => {
		// Test the generateTsMarkdownDoc function
		console.log(readFileSync(resolve(DIRNAME, 'typedoc.test.ts'), 'utf8'))
		
		const markdownDoc = await generateTsMarkdownDoc(
			[resolve(DIRNAME, 'typedoc.test.ts')],
			resolve(DIRNAME, '../../tsconfig.test.json')
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
