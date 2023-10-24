
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { generateMarkdownDocumentation } from './builder.js';
import { injectMarkdown, updateTOC } from './markdown.js';

const filename = process.argv[2];
const section = process.argv[3];

if (!filename) throw Error ('first argument must be a TypeScript file');
if (!section) throw Error ('second argument must be a Markdown heading inside the README');

const fullname = resolve((new URL('../../', import.meta.url)).pathname, filename);
if (!existsSync(fullname)) throw Error('file does not exist: ' + fullname);

const filenameTSConfig = getTSConfig(fullname)
const filenameReadme = resolve(dirname(filenameTSConfig), 'README.md');
if (!existsSync(filenameReadme)) throw Error('README.md is missing: ' + filenameReadme);

console.log(' - build documentation');
const docMD = await generateMarkdownDocumentation([fullname], filenameTSConfig);

let readmeMD = readFileSync(filenameReadme, 'utf8');

console.log(' - inject documentation');
readmeMD = injectMarkdown(readmeMD, docMD, section);

console.log(' - inject toc');
readmeMD = updateTOC(readmeMD, '# Table of Content');

writeFileSync(filenameReadme, readmeMD);

function getTSConfig(startFilename: string): string {
	let folder = dirname(startFilename);
	let filenameTSConfig: string = '';
	for (let i = 0; i <= 2; i++) {
		filenameTSConfig = resolve(folder, 'tsconfig.json');
		if (existsSync(filenameTSConfig)) break;
		folder = dirname(folder);
	}
	if (!existsSync(filenameTSConfig)) throw Error('tsconfig file is missing: ' + filenameTSConfig)
	return filenameTSConfig
}
