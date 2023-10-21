#!/usr/bin/env node
'use strict'

import { createGunzip } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { extract } from 'tar-stream';
import { createWriteStream, existsSync, mkdirSync, rmSync } from 'node:fs';

process.on('unhandledRejection', (reason, promise) => {
	console.log('unhandledRejection', { reason, promise });
});
process.on('rejectionHandled', (promise) => {
	console.log('rejectionHandled', { promise });
});

const url = 'https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend.tar.gz';
const __dirname = (new URL('.', import.meta.url)).pathname;
const dirStatic = resolve(__dirname, 'static');
const dirAssets = resolve(dirStatic, 'assets');

if (existsSync(dirAssets)) rmSync(dirAssets, { recursive: true })

const createdDirs = new Set();
await pipeline(
	(await fetch(url)).body,
	createGunzip(),
	extract().on('entry',
		async (header, stream, next) => {
			let { name } = header;
			console.log({ name });
			if (/^\.\/assets\/(fonts|maplibre|sprites)\//.test(name)) {
				const filename = resolve(dirStatic, name);
				const directory = dirname(filename);
				console.log({ filename, directory });
				if (!createdDirs.has(directory)) {
					mkdirSync(directory, { recursive: true });
					createdDirs.add(directory)
				}
				await pipeline(stream, createWriteStream(filename));
			}
			console.log('next');
			return next()
		}
	)
)
