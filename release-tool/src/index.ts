#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateMarkdownDocumentation } from './lib/typedoc.js';
import { injectMarkdown, updateTOC } from './lib/markdown.js';
import { Command, InvalidArgumentError } from 'commander';
import { cwd } from 'node:process';


const program = new Command();

program
	.name('vrt')
	.description('versatiles release and documentaion tool');

program.command('ts2md')
	.description('documents a TypeScript file and outputs it to stdout')
	.argument('<index.ts>', 'TypeScript file', checkFilename)
	.argument('<tsconfig.json>', 'tsconfig file', checkFilename)
	.action(async (tsFilename: string, tsConfig: string) => {
		const mdDocumentation = await generateMarkdownDocumentation([tsFilename], tsConfig);
		process.stdout.write(mdDocumentation);
	});

program.command('insertmd')
	.description('takes Markdown from stdin and insert it into a Markdown file')
	.argument('<string>', 'Markdown file, like a readme.md', checkFilename)
	.argument('[string]', 'Heading in the Markdown file', '# API')
	.action(async (mdFilename: string, heading: string) => {
		const buffers = [];
		for await (const data of process.stdin) buffers.push(data);
		const mdContent = Buffer.concat(buffers).toString();

		let mdFile = readFileSync(mdFilename, 'utf8');
		mdFile = injectMarkdown(mdFile, mdContent, heading);
		writeFileSync(mdFilename, mdFile);
	});

program.command('inserttoc')
	.description('updates the TOC in a Markdown file')
	.argument('<string>', 'Markdown file, like a readme.md', checkFilename)
	.argument('[string]', 'Heading in the Markdown file', '# Table of Content')
	.action((mdFilename: string, heading: string) => {
		let mdFile = readFileSync(mdFilename, 'utf8');
		mdFile = updateTOC(mdFile, heading);
		writeFileSync(mdFilename, mdFile);
	});

program.parse();

function checkFilename(filename: string): string {
	const fullname = resolve(cwd(), filename);
	if (existsSync(fullname)) {
		throw new InvalidArgumentError('file not found');
	}
	return fullname;
}

