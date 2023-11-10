
import type { Heading, Root, RootContent } from 'mdast';
import { remark } from 'remark';


export function injectMarkdown(document: string, segment: string, heading: string): string {
	const documentAst = remark().parse(document);
	const segmentAst = remark().parse(segment);
	const headingAst = remark().parse(heading);

	let startIndex;
	try {
		startIndex = findSegmentStart(documentAst, headingAst);
	} catch (error) {
		console.error(`While searching for segment "${heading}" …`);
		throw error;
	}

	const depth = getHeadingDepth(documentAst, startIndex);
	const endIndex = findNextHeading(documentAst, startIndex + 1, depth);
	indentChapter(segmentAst, depth);
	spliceAst(documentAst, segmentAst, startIndex + 1, endIndex);

	return remark().stringify(documentAst);
}

export function updateTOC(main: string, heading: string): string {
	const mainAst = remark().parse(main);
	const headingText = getMDText(remark().parse(heading));
	const toc = mainAst.children
		.flatMap(c => {
			if (c.type !== 'heading') return [];
			const text = getMDText(c);
			if (text === headingText) return [];
			const indention = '  '.repeat((c.depth - 1) * 2);
			const anchor = getMDAnchor(c);
			return `${indention}* [${text}](#${anchor})\n`;
		})
		.join('');
	return injectMarkdown(main, toc, heading);
}

function findSegmentStart(mainAst: Root, headingAst: Root): number {
	if (headingAst.children.length !== 1) throw Error();
	if (headingAst.children[0].type !== 'heading') throw Error();
	const sectionDepth = headingAst.children[0].depth;
	const sectionText = getMDText(headingAst);

	const indexes: number[] = mainAst.children.flatMap((c, index) => {
		if ((c.type === 'heading') && (c.depth === sectionDepth) && getMDText(c).startsWith(sectionText)) {
			return [index];
		}
		return [];
	});

	if (indexes.length < 1) throw Error('section not found');
	if (indexes.length > 1) throw Error('too many sections found');

	return indexes[0];
}

function findNextHeading(mainAst: Root, startIndex: number, depth: number): number {
	for (let i = startIndex; i < mainAst.children.length; i++) {
		const child = mainAst.children[i];
		if (child.type !== 'heading') continue;
		if (child.depth !== depth) continue;
		return i;
	}
	return mainAst.children.length;
}

function getHeadingDepth(mainAst: Root, index: number): number {
	const node = mainAst.children[index];
	if (node.type !== 'heading') throw Error();
	return node.depth;
}

function indentChapter(segmentAst: Root, depth: number): void {
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

// eslint-disable-next-line @typescript-eslint/max-params
function spliceAst(mainAst: Root, segmentAst: Root, startIndex: number, endIndex: number): void {
	mainAst.children.splice(startIndex, endIndex - startIndex, ...segmentAst.children);
}

function getMDText(node: Root | RootContent): string {
	switch (node.type) {
		case 'inlineCode':
		case 'text':
			return node.value;
		case 'heading':
		case 'root':
			return node.children.map(getMDText).join('');
		case 'html':
			return '';
		default:
			console.log(node);
			throw Error('unknown type: ' + node.type);
	}
}

function getMDAnchor(node: Heading): string {
	let text = '';
	for (const c of node.children) {
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

	text = text.toLowerCase()
		.replace(/[()]+/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^\-+|\-+$/g, '');

	return text;
}
