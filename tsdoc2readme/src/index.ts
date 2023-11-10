
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { generateMarkdownDocumentation } from './builder.js';
import { injectMarkdown, updateTOC } from './markdown.js';

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
