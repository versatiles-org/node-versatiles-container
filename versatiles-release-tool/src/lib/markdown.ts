
import type { Heading, Root, RootContent } from 'mdast';
import { remark } from 'remark';


// eslint-disable-next-line @typescript-eslint/max-params
export function injectMarkdown(document: string, segment: string, heading: string, foldable?: boolean): string {
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
	if (foldable ?? false) makeFoldable(segmentAst);

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

function makeFoldable(ast: Root): void {
	console.dir(ast, { depth: 3 });

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

function lineToHtml(child: Heading): string {
	const html = child.children.map(c => {
		switch (c.type) {
			case 'html': return c.value;
			case 'text': return c.value;
			case 'inlineCode': return `<code>${textToHtml(c.value)}</code>`;
			//case "break": { throw new Error('Not implemented yet: "break" case') }
			//case "delete": { throw new Error('Not implemented yet: "delete" case') }
			//case "emphasis": { throw new Error('Not implemented yet: "emphasis" case') }
			//case "footnoteReference": { throw new Error('Not implemented yet: "footnoteReference" case') }
			//case "image": { throw new Error('Not implemented yet: "image" case') }
			//case "imageReference": { throw new Error('Not implemented yet: "imageReference" case') }
			//case "inlineCode": { throw new Error('Not implemented yet: "inlineCode" case') }
			//case "link": { throw new Error('Not implemented yet: "link" case') }
			//case "linkReference": { throw new Error('Not implemented yet: "linkReference" case') }
			//case "strong": { throw new Error('Not implemented yet: "strong" case') }
			//case "text": { throw new Error('Not implemented yet: "text" case') }
			default:
				console.log(c);
				throw Error(`unknown type "${c.type}"`);
		}
	});
	return `<h${child.depth}>${html.join('')}</h${child.depth}>`;
}

function textToHtml(text: string): string {
	return text.replace(/[^a-z0-9 ,.-:_?@äöüß]/gi, c => `&#${c.charCodeAt(0)};`);
}
