
import { } from 'node:fs';
import { resolve } from 'node:path';
import { TSDocParser } from '@microsoft/tsdoc';
import { readFile } from 'node:fs/promises';

const __dirname = (new URL('../', import.meta.url)).pathname;

const inputFilename = resolve(__dirname, 'src/index.ts');
const inputFile = await readFile(inputFilename, 'utf8');

const tsdocParser = new TSDocParser();
const parserContext = tsdocParser.parseString(inputFile);

if (parserContext.log.messages.length > 0) {
	parserContext.log.messages.forEach(m => {
		m = { ...m };
		delete m.textRange.buffer;
		console.log(m);
	})
	process.exit(1);
}
console.log(parserContext.log.messages);


console.log(parserContext);
console.log(parserContext.log.messages);

/*
let docs = await documentation.build(
	['dist/index.js', 'dist/interface.'],
	{
		github: true
	}
);
let markdown = Array.from(getDocument(docs)).join('\n');

function* getDocument(document) {
	for (let chapter of document) {
		yield* getChapter(chapter);
		yield ''
	}
}

function* getChapter(chapter) {
	switch (chapter.kind) {
		case 'class': yield* getClassBlock(chapter); break;
		default:
			throw new Error(`unknown kind: ${chapter.kind}`);
	}
}

function* getClassBlock(c) {
	yield `## class: \`${c.name}\``;
	console.log(c);
}
*/


/*
const md = [];
md.push(`## ${camelCase(c.kind)}: \`${c.name}\``);

if (c.augments.length > 0) throw Error();
if (c.errors.length > 0) throw Error();
if (c.examples.length > 0) throw Error();
if (c.implements.length > 0) throw Error();

if (c.implements.length > 0) {
	md.push(`**Parameters:**`);
	c.params.forEach(getParameter)
}

if (c.properties.length > 0) throw Error();
if (c.returns.length > 0) throw Error();
if (c.sees.length > 0) throw Error();
if (c.throws.length > 0) throw Error();
if (c.todos.length > 0) throw Error();
if (c.yields.length > 0) throw Error();
if (c.implements.length > 0) throw Error();
if (c.implements.length > 0) throw Error();
if (c.implements.length > 0) throw Error();
if (c.implements.length > 0) throw Error();
if (c.implements.length > 0) throw Error();

console.dir(c, { depth: 10 });
console.log({ paragraph: md });
*/



/*
--document - exported=true
--format=remark
--github=true
--markdown - toc=false
--quiet
--resolve=node
--section=API"
*/

//console.log({ markdown });

//documentation.formats.md(docs, {}, function (err, res) {
//	console.log(res);
//});


function camelCase(text) {
	return text
		.toString()
		.split(' ')
		.map(w => w.at(0).toUpperCase() + w.slice(1))
		.join(' ')
}

function getSource(context) {
	return `[\\[src\\]](${context.github.url})`
}

function getParameter(parameter) {
	throw Error()
	//console.log(parameter);
	//p => {
	//	md.push(`  - \`${p.name}\``
	//}
}