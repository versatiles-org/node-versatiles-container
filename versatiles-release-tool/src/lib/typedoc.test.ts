import { resolve } from 'path';
import { generateTsMarkdownDoc } from './typedoc.js';

const DIRNAME = new URL('.', import.meta.url).pathname;

describe('generateTsMarkdownDoc', () => {
	it('generates markdown documentation from TypeScript file', async () => {
		let markdownDoc = await generateTsMarkdownDoc(
			[resolve(DIRNAME, 'typedoc.test.ts')],
			resolve(DIRNAME, '../../tsconfig.test.json'),
		);

		markdownDoc = markdownDoc.replace(/ href=".*?"/g, ' href=""');

		const result = [
			'# Class: `C`<a id="class_c"></a>', ,
			'<sup><a href="">[src]</a></sup>', ,
			'## Constructor: `new C()`', , ,
			'<sup><a href="">[src]</a></sup>', , ,
			'**Returns:** <code>[C](#class_c)</code>',
			'  - <code>d: number</code>',
			'# Interface: `I`<a id="interface_i"></a>', ,
			'<sup><a href="">[src]</a></sup>', ,
			'  - <code>t: boolean</code>',
			'# Type: `T`<a id="type_t"></a>', ,
			'<sup><a href="">[src]</a></sup>', , ,
			'**Type:** <code>boolean</code>',
			'# Variable: `v`<a id="variable_v"></a>', ,
			'<sup><a href="">[src]</a></sup>', , ,
			'**Type:** <code>number</code>',
			'# Function: `b`<a id="function_b"></a>', ,
			'<sup><a href="">[src]</a></sup>', ,
		].join('\n');

		expect(markdownDoc).toBe(result);
	});
});

export type T = boolean;
export interface I {
	t: T;
}

export const v = 12;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function b(n: number, s: string): boolean {
	return true;
}

export class C {
	public d = 1;

	// eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function
	public constructor() { }
}
