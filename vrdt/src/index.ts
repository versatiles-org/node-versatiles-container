#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { generateMarkdownDocumentation } from './lib/typedoc.js';
import { injectMarkdown, updateTOC } from './lib/markdown.js';
import { Command, InvalidArgumentError } from 'commander';
import { cwd } from 'node:process';


const program = new Command();

program
	.name('vrdt')
	.description('versatiles release and documentaion tool');

program.command('ts2md')
	.description('convert TypeScript to Markdown')
	.argument('<index.ts>', 'TypeScript file', checkFilename)
	.argument('<tsconfig.json>', 'tsconfig file', checkFilename)
	.action(async (tsFile: string, tsConfig: string) => {
		const mdDocumentation = await generateMarkdownDocumentation([tsFile], tsConfig);
		process.stdout.write(mdDocumentation);
	});


program.command('insertmd')
	.description('takes Markdown from stdin and insert it into a Markdown file')
	.argument('<string>', 'Markdown file, like a readme.md', checkFilename)
	.argument('<string>', 'Heading in the Markdown file, e.g. "# API"');


program.parse();


/*
// ### Argument 1
// eslint-disable-next-line @typescript-eslint/prefer-destructuring
const filenameTypeScript = process.argv[2];
if (!filenameTypeScript) throw Error('first argument must be a TypeScript file');
const fullname = resolve(new URL('../', import.meta.url).pathname, filenameTypeScript);
if (!existsSync(fullname)) throw Error('file does not exist: ' + fullname);

// ### Argument 2
// eslint-disable-next-line @typescript-eslint/prefer-destructuring
const heading = process.argv[3];
if (!heading) throw Error('second argument must be a Markdown heading inside the README');


const filenameTSConfig = getTSConfig(fullname);
const filenameReadme = resolve(dirname(filenameTSConfig), 'README.md');






if (!existsSync(filenameReadme)) throw Error('README.md is missing: ' + filenameReadme);

console.log(' - build documentation');
const docMD = await generateMarkdownDocumentation([fullname], filenameTSConfig);

let readmeMD = readFileSync(filenameReadme, 'utf8');

console.log(readmeMD);

console.log(' - inject documentation');
readmeMD = injectMarkdown(readmeMD, docMD, heading);

console.log(' - inject toc');
readmeMD = updateTOC(readmeMD, '# Table of Content');

writeFileSync(filenameReadme, readmeMD);

function getTSConfig(startFilename: string): string {
	let folder = dirname(startFilename);
	let filename = '';
	for (let i = 0; i <= 2; i++) {
		filename = resolve(folder, 'tsconfig.json');
		if (existsSync(filename)) break;
		folder = dirname(folder);
	}
	if (!existsSync(filename)) throw Error('tsconfig file is missing: ' + filename);
	return filename;
}
*/


function checkFilename(filename: string): string {
	const fullname = resolve(cwd(), filename);
	if (existsSync(fullname)) {
		throw new InvalidArgumentError('file not found');
	}
	return fullname;
}

