
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildDoc } from './builder.js';
import { remark } from 'remark';



const filename = 'versatiles/src/index.ts';

const fullname = resolve((new URL('../', import.meta.url)).pathname, filename);
const filenameTSConfig = getTSConfig(fullname)

const markdown = buildDoc([fullname], filenameTSConfig);

remark.


function getTSConfig(startFilename: string): string {
	const folder = dirname(startFilename);
	let filenameTSConfig: string = '';
	for (let i = 0; i <= 2; i++) {
		filenameTSConfig = resolve(folder, 'tsconfig.json');
		if (existsSync(filenameTSConfig)) break;
	}
	if (!existsSync(filenameTSConfig)) throw Error('tsconfig file is missing: ' + filenameTSConfig)
	return filenameTSConfig
}