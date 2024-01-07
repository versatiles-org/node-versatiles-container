#!/usr/bin/env node
'use strict'

import { Container } from '../dist/index.js';

const filename = process.argv[2];

const container = new Container(filename);

console.log('\nHEADER:');
console.log(await container.getHeader());

console.log('\nMETADATA:');
console.log(await container.getMetadata());
