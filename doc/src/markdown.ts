
import { Root, RootContent } from 'mdast';
import { remark } from 'remark';


export function injectMarkdown(main: string, segment: string, heading: string): string {
	let mainAst = remark().parse(main);
	let segmentAst = remark().parse(segment);
	let headingAst = remark().parse(heading);

	let startIndex = findSegmentStart(mainAst, headingAst);
	let depth = getHeadingDepth(mainAst, startIndex);
	let endIndex = findNextHeading(mainAst, startIndex + 1, depth);
	indentChapter(segmentAst, depth);
	spliceAst(mainAst, segmentAst, startIndex + 1, endIndex);

	return remark().stringify(mainAst);
}

export function updateTOC(main: string, heading: string): string {
	let mainAst = remark().parse(main);
	let toc = mainAst.children
		.flatMap(c => {
			if (c.type !== 'heading') return [];
			const indention = '  '.repeat((c.depth - 1) * 2);
			const text = getMDText(c);
			const anchor = text.toLowerCase().replace(/\s/g, '_');
			return `${indention}- [${text}](#${anchor})\n`
		})
		.join('');
	return injectMarkdown(main, toc, heading);
}

function findSegmentStart(mainAst: Root, sectionAst: Root): number {
	if (sectionAst.children.length !== 1) throw Error();
	if (sectionAst.children[0].type !== 'heading') throw Error();
	let sectionDepth = sectionAst.children[0].depth;
	let sectionText = getMDText(sectionAst);

	let index = mainAst.children.findIndex(
		c => (c.type === 'heading') && (c.depth === sectionDepth) && (getMDText(c) === sectionText)
	)

	if (index < 0) throw Error('section not found');

	return index;
}

function findNextHeading(mainAst: Root, startIndex: number, depth: number): number {
	for (let i = startIndex; i < mainAst.children.length; i++) {
		let child = mainAst.children[i];
		if (child.type !== 'heading') continue;
		if (child.depth !== depth) continue;
		return i;
	}
	return mainAst.children.length;
}

function getHeadingDepth(mainAst: Root, index: number): number {
	let node = mainAst.children[index];
	if (!node) throw Error();
	if (node.type !== 'heading') throw Error();
	return node.depth;
}

function indentChapter(segmentAst: Root, depth: number) {
	segmentAst.children.forEach(node => {
		switch (node.type) {
			case 'text':
			case 'list':
			case 'listItem':
			case 'paragraph':
				return;
			case 'heading':
				return node.depth += depth;
			default:
				console.log(node);
				throw Error('unknown type: ' + node.type);
		}
	})
}

function spliceAst(mainAst: Root, segmentAst: Root, startIndex: number, endIndex: number) {
	mainAst.children.splice(startIndex, endIndex - startIndex, ...segmentAst.children);
}

function getMDText(node: RootContent | Root): string {
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


/*
const docAst = remark().parse(docMD);

const readmeMD = readFileSync(filenameReadme, 'utf8');
const readmeAst = remark().parse(readmeMD);

// find heading in readme
let index0 = readmeAst.children.findIndex(c => (c.type === 'heading') && (getText(c) === section))


//console.log({docAst});
console.log(readmeAst.children);

//await remark()
//	.use(plugin, { section, content: docAst })
//	.process(readmeContent);



function getText(node:remark):string {
	let result = remark().stringify(Root node);
	console.log(result);
	process.exit();

}
*/