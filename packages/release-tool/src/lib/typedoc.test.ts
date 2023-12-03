/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-useless-constructor */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { resolve } from 'path';
import { generateTsMarkdownDoc } from './typedoc.js';

const DIRNAME = new URL('.', import.meta.url).pathname;
const result = `
# Classes

## Class: \`C\`<a id="class_c"></a>

Class representing a structure with methods and properties. <sup><a href="">[src]</a></sup>


### Constructor: \`new C()\`

Constructor for the class. <sup><a href="">[src]</a></sup>


### Properties
  - <code>d: number</code>  
    Represents a numeric value.

### Accessors
  - <code>j</code>

### Method: \`e(f)\`

Performs an operation based on the input. <sup><a href="">[src]</a></sup>


**Parameters:**
  - <code>f: string | number</code>  
    A number or string input.

**Returns:** <code>void</code>

### Method: \`h(i)\`

Returns a function of type K. <sup><a href="">[src]</a></sup>


**Parameters:**
  - <code>i: [boolean, [I](#interface_i)]</code>  
    A tuple containing a boolean and an object of type I.

**Returns:** <code>[K](#type_k)</code>

# Interfaces

## Interface: \`I\`<a id="interface_i"></a>

\`\`\`typescript
interface {
  t: boolean;
}
\`\`\`

# Type Aliases

## Type: \`K\`<a id="type_k"></a>

**Type:** <code>(l: number) => string</code>

## Type: \`T\`<a id="type_t"></a>

**Type:** <code>boolean</code>

# Variables

## \`const v\`
A constant value representing the number 12.

# Functions

## Method: \`b(n, s)\`

Function that always returns true. <sup><a href="">[src]</a></sup>


**Parameters:**
  - <code>n: number</code>  
    A number parameter.
  - <code>s: string</code>  
    A string parameter.

**Returns:** <code>boolean</code>`;

describe('generateTsMarkdownDoc', () => {
	it('generates markdown documentation from TypeScript file', async () => {
		let markdownDoc = await generateTsMarkdownDoc(
			[resolve(DIRNAME, 'typedoc.test.ts')],
			resolve(DIRNAME, '../../tsconfig.test.json'),
		);

		markdownDoc = markdownDoc.replace(/ href=".*?"/g, ' href=""');

		expect(markdownDoc).toBe(result);
	});
});

/**
 * Represents a boolean type.
 */
export type T = boolean;

/**
 * Represents a function type that takes a number and returns a string.
 * @param l - The number input.
 * @returns The string output.
 */
export type K = (l: number) => string;

/**
 * Interface representing a structure with a boolean type property.
 */
export interface I {
	t: T;
}

/**
 * A constant value representing the number 12.
 */
export const v = 12;

/**
 * Function that always returns true.
 * @param n - A number parameter.
 * @param s - A string parameter.
 * @returns Always returns true.
 */
export function b(n: number, s: string): boolean {
	return true;
}

/**
 * Class representing a structure with methods and properties.
 */
export class C {

	/**
	 * Represents a numeric value.
	 */
	public d = 1;

	/**
	 * Constructor for the class.
	 */
	public constructor() { }

	/**
	 * Getter for the 'd' property.
	 * @returns The value of 'd'.
	 */
	public get j(): number {
		return this.d;
	}

	/**
	 * Performs an operation based on the input.
	 * @param f - A number or string input.
	 */
	public e(f: number | string): void {
	}

	/**
	 * Returns a function of type K.
	 * @param i - A tuple containing a boolean and an object of type I.
	 * @returns A function of type K.
	 */
	public h(i: [boolean, I]): K {
		return (l: number) => 'l';
	}
}
