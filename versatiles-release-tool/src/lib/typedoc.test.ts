/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-useless-constructor */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
			'## Method: `e(f)`', , ,
			'Do stuff <sup><a href="">[src]</a></sup>', , ,
			'**Parameters:**',
			'  - <code>f: string | number</code>  ',
			'    input', ,
			'**Returns:** <code>void</code>',
			'## Method: `h(i)`', , ,
			'<sup><a href="">[src]</a></sup>', , ,
			'**Parameters:**',
			'  - <code>i: [boolean, [I](#interface_i)]</code>', ,
			'**Returns:** <code>[K](#type_k)</code>',
			'# Interface: `I`<a id="interface_i"></a>', ,
			'<sup><a href="">[src]</a></sup>', ,
			'  - <code>t: boolean</code>',
			'# Type: `K`<a id="type_k"></a>', ,
			'<sup><a href="">[src]</a></sup>', , ,
			'**Type:** <code>(l: number) => string</code>',
			'# Type: `T`<a id="type_t"></a>', ,
			'<sup><a href="">[src]</a></sup>', , ,
			'**Type:** <code>boolean</code>',
			'# Variable: `v`<a id="variable_v"></a>', ,
			'<sup><a href="">[src]</a></sup>', , ,
			'**Type:** <code>12</code>',
			'# Function: `b`<a id="function_b"></a>', ,
			'<sup><a href="">[src]</a></sup>', ,
		].join('\n');

		expect(markdownDoc).toBe(result);
	});
});

export type T = boolean;
export type K = (l: number) => string;
export interface I {
	t: T;
}

export const v = 12;

export function b(n: number, s: string): boolean {
	return true;
}

export class C {
	public d = 1;

	public constructor() { }

	/**
	 * Do stuff
	 * @param f - input
	 * @returns output
	 */
	public e(f: number | string): void {
	}

	public h(i: [boolean, I]): K {
		return (l: number) => 'l';
	}
}
