
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildDoc } from './builder.js';
import { injectMarkdown, updateTOC } from './markdown.js';


const filename = 'versatiles/src/index.ts';
const section = '# API';

const fullname = resolve((new URL('../../', import.meta.url)).pathname, filename);
const filenameTSConfig = getTSConfig(fullname)
const filenameReadme = resolve(dirname(filenameTSConfig), 'README.md');
if (!existsSync(filenameReadme)) throw Error('README.md is missing: ' + filenameReadme)

console.log(' - build documentation');
const docMD = await buildDoc([fullname], filenameTSConfig);

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
