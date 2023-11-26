import type { Heading, Root, RootContent, FootnoteReference, ImageReference, LinkReference, PhrasingContent } from 'mdast';
import { remark } from 'remark';
import { getErrorMessage } from './utils.js';

/**
 * Injects a Markdown segment under a specified heading in a Markdown document.
 * Optionally, the injected segment can be made foldable for better readability.
 * @param document The original Markdown document.
 * @param segment The Markdown segment to be injected.
 * @param heading The heading under which the segment is to be injected.
 * @param foldable If true, makes the segment foldable.
 * @returns The modified Markdown document.
 */
// eslint-disable-next-line @typescript-eslint/max-params
export function injectMarkdown(document: string, segment: string, heading: string, foldable?: boolean): string {
	// Parse the input strings into Abstract Syntax Trees (ASTs).
	const documentAst = remark().parse(document);
	const segmentAst = remark().parse(segment);
	const headingAst = remark().parse(heading);

	// Initialize the start index of the injection.
	let startIndex;
	try {
		// Find the start index where the new segment should be injected.
		startIndex = findSegmentStartIndex(documentAst, headingAst);
	} catch (error) {
		// Handle errors during the search for the start index.
		console.error(`Error while searching for segment "${heading}": ${getErrorMessage(error)}`);
		throw error;
	}

	// Get the depth of the specified heading to maintain the structure.
	const depth = getHeadingDepth(documentAst, startIndex);
	// Find the index of the next heading of the same depth to define the end of the segment.
	const endIndex = findNextHeadingIndex(documentAst, startIndex + 1, depth);
	// Adjust the indentation of the segment to align with the specified depth.
	indentSegmentToDepth(segmentAst, depth);
	// Convert the segment to a foldable section if required.
	if (foldable === true) convertToFoldable(segmentAst);

	// Merge the original document AST with the new segment AST.
	mergeSegments(documentAst, segmentAst, startIndex + 1, endIndex);

	// Convert the modified AST back to a Markdown string and return.
	return remark().stringify(documentAst);
}

/**
 * Updates the Table of Contents (TOC) of a Markdown document.
 * The TOC is rebuilt based on the headings present in the document.
 * @param main The main Markdown document.
 * @param heading The heading under which the TOC is to be updated.
 * @returns The Markdown document with an updated TOC.
 */
export function updateTOC(main: string, heading: string): string {
	// Parse the main document and the heading for the TOC.
	const mainAst = remark().parse(main);
	const headingText = extractTextFromMDAsHTML(remark().parse(heading));

	// Build the TOC by iterating over each heading in the document.
	const toc = mainAst.children
		.flatMap(c => {
			// Skip non-heading nodes and the specified heading.
			if (c.type !== 'heading' || extractTextFromMDAsHTML(c) === headingText) return [];
			// Format each heading as a TOC entry.
			const indention = '  '.repeat((c.depth - 1) * 2);
			const anchor = getMDAnchor(c);
			return `${indention}* [${extractTextFromMDAsHTML(c)}](#${anchor})\n`;
		})
		.join('');

	// Inject the newly generated TOC under the specified heading in the document.
	return injectMarkdown(main, toc, heading);
}

// Below are the helper functions used in the above main functions. Each helper function
// is designed for a specific operation and is provided with detailed comments for clarity.

/**
 * Finds the start index of the segment under a specific heading in the AST.
 * @param mainAst The AST of the main document.
 * @param headingAst The AST of the heading under which the segment is to be inserted.
 * @returns The start index of the segment in the main document AST.
 * @throws Error if headingAst does not have exactly one child or the child is not a heading.
 */
function findSegmentStartIndex(mainAst: Root, headingAst: Root): number {
	// Verify the structure of the headingAst.
	if (headingAst.children.length !== 1) throw Error('headingAst.children.length !== 1');
	if (headingAst.children[0].type !== 'heading') throw Error('headingAst.children[0].type !== \'heading\'');
	const sectionDepth = headingAst.children[0].depth;
	const sectionText = extractTextFromMDAsHTML(headingAst);

	// Search for the index of the heading in the main document AST.
	const indexes: number[] = mainAst.children.flatMap((c, index) => {
		if ((c.type === 'heading') && (c.depth === sectionDepth) && extractTextFromMDAsHTML(c).startsWith(sectionText)) {
			return [index];
		}
		return [];
	});

	// Handle the cases of no match or multiple matches.
	if (indexes.length < 1) throw Error('section not found');
	if (indexes.length > 1) throw Error('too many sections found');

	return indexes[0];
}

/**
 * Finds the index of the next heading at the same depth in the AST.
 * @param mainAst The AST of the main document.
 * @param startIndex The index to start searching from.
 * @param depth The depth of the headings to match.
 * @returns The index of the next heading of the same depth, or the length of the children array if none is found.
 */
function findNextHeadingIndex(mainAst: Root, startIndex: number, depth: number): number {
	// Iterate over the AST nodes starting from startIndex.
	for (let i = startIndex; i < mainAst.children.length; i++) {
		const child = mainAst.children[i];
		// Return the index of the next heading at the same depth.
		if (child.type === 'heading' && child.depth === depth) return i;
	}
	return mainAst.children.length;
}

/**
 * Gets the depth of the heading at a given index in the AST.
 * @param mainAst The AST of the main document.
 * @param index The index of the heading.
 * @returns The depth of the heading.
 * @throws Error if the node at the index is not a heading.
 */
function getHeadingDepth(mainAst: Root, index: number): number {
	const node = mainAst.children[index];
	if (node.type !== 'heading') throw Error('node.type !== \'heading\'');
	return node.depth;
}

/**
 * Indents each segment in the AST to match a specified depth, modifying headings accordingly.
 * @param segmentAst The AST of the segment to be indented.
 * @param depth The depth to which the segment should be indented.
 */
function indentSegmentToDepth(segmentAst: Root, depth: number): void {
	segmentAst.children.forEach(node => {
		switch (node.type) {
			case 'code':
			case 'html':
			case 'list':
			case 'listItem':
			case 'paragraph':
			case 'text':
				return;
			case 'heading':
				return node.depth += depth;
			default:
				console.log(node);
				throw Error('unknown type: ' + node.type);
		}
	});
}

/**
 * Merges a segment AST into the main document AST at specified start and end indexes.
 * @param mainAst The AST of the main document.
 * @param segmentAst The AST of the segment to be merged.
 * @param startIndex The start index in the main AST.
 * @param endIndex The end index in the main AST.
 */
// eslint-disable-next-line @typescript-eslint/max-params
function mergeSegments(mainAst: Root, segmentAst: Root, startIndex: number, endIndex: number): void {
	mainAst.children.splice(startIndex, endIndex - startIndex, ...segmentAst.children);
}

/**
 * Extracts the textual content from a node in the AST.
 * @param node The AST node.
 * @returns The extracted text content.
 * @throws Error if the node type is unknown.
 */
function extractTextFromMDAsHTML(node: Root | RootContent): string {
	switch (node.type) {
		case 'inlineCode':
		case 'text':
			return textToHtml(node.value);
		case 'heading':
		case 'root':
			return node.children.map(extractTextFromMDAsHTML).join('');
		case 'html':
			return '';
		default:
			console.log(node);
			throw Error('unknown type: ' + node.type);
	}
}

/**
 * Generates an anchor ID for a Markdown heading based on its text content.
 * @param node The heading node.
 * @returns The generated anchor ID.
 * @throws Error if the child node type is unknown.
 */
function getMDAnchor(node: Heading): string {
	let text = '';
	for (const c of node.children) {
		// Handle different types of child nodes to construct the anchor text.
		switch (c.type) {
			case 'html':
				const match = /<a\s.*id\s*=\s*['"]([^'"]+)/i.exec(c.value);
				if (match) return match[1];
				break;
			case 'text':
			case 'inlineCode':
				text += c.value; break;
			default:
				console.log(c);
				throw Error('unknown type: ' + c.type);
		}
	}

	// Format the text to create a suitable anchor ID.
	text = text.toLowerCase()
		.replace(/[()]+/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^\-+|\-+$/g, '');

	return text;
}

/**
 * Converts a segment of the AST into a foldable HTML element.
 * @param ast The AST of the segment to be converted.
 */
function convertToFoldable(ast: Root): void {
	const openDetails: number[] = [];
	const children: RootContent[] = [];

	ast.children.forEach((c: RootContent) => {
		switch (c.type) {
			case 'html':
			case 'list':
			case 'paragraph':
				children.push(c);
				break;
			case 'heading':
				closeDetails(c.depth);

				children.push({ type: 'html', value: '<details>' });
				children.push({ type: 'html', value: `<summary>${lineToHtml(c)}</summary>` });
				openDetails.unshift(c.depth);

				break;
			default:
				throw Error(`unknown type "${c.type}"`);
		}
	});

	closeDetails(0);

	ast.children = children;

	function closeDetails(depth: number): void {
		while ((openDetails.length > 0) && (openDetails[0] >= depth)) {
			children.push({ type: 'html', value: '</details>' });
			openDetails.shift();
		}
	}
}

function lineToHtml(heading: Heading): string {
	return `<h${heading.depth}>${nodesToHtml(heading.children)}</h${heading.depth}>`;
}

function nodeToHtml(node: PhrasingContent): string {
	switch (node.type) {
		case 'html':
			return node.value;
		case 'text':
			return textToHtml(node.value);
		case 'inlineCode':
			return `<code>${textToHtml(node.value)}</code>`;
		case 'break':
			return '<br />';
		case 'delete':
			return `<del>${nodesToHtml(node.children)}</del>`;
		case 'emphasis':
			return `<em>${nodesToHtml(node.children)}</em>`;
		case 'strong':
			return `<strong>${nodesToHtml(node.children)}</strong>`;
		case 'link':
			return `<a href="${node.url}" title="${node.title}">${nodesToHtml(node.children)}</a>`;
		case 'linkReference':
			return `<a href="${getLinkReferenceUrl(node)}">${nodesToHtml(node.children)}</a>`;
		case 'footnoteReference':
			return handleFootnoteReference(node);
		case 'image':
			return `<img src="${node.url}" alt="${node.alt}" />`;
		case 'imageReference':
			return `<img src="${getImageReferenceUrl(node)}" alt="${node.alt}" />`;
		default:
			console.log(node);
			throw Error('unknown type');
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function handleFootnoteReference(_node: FootnoteReference): string {
		throw new Error('Implement function: handleFootnoteReference.');
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function getImageReferenceUrl(_node: ImageReference): string {
		throw new Error('Implement function: getImageReferenceUrl.');
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function getLinkReferenceUrl(_node: LinkReference): string {
		throw new Error('Implement function: getLinkReferenceUrl.');
	}
}

function nodesToHtml(children: PhrasingContent[]): string {
	return children.map(nodeToHtml).join('');
}

function textToHtml(text: string): string {
	return text.replace(/[^a-z0-9 ,.-:_?@äöüß]/gi, c => `&#${c.charCodeAt(0)};`);
}
