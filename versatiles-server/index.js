#!/usr/bin/env node
'use strict'

import { Command } from 'commander';
import { Server } from './lib/server.js';

const program = new Command();

program
	.showHelpAfterError()
	.name('versatiles-server')
	.description('Simple versatiles server')
	.option('--tms', 'use TMS tile order (flip y axis)')
	.option('-r, --recompress', 'recompress tiles if needed. slower but reduces traffic.')
	.option('-p, --port <port>', 'port', )
	.option('-i, --host <hostname|ip>', 'hostname or ip')
	.option('--base <http://baseurl/>')
	.argument('<source>', 'versatile source, can be an url or filename of a "*.versatiles" file')

program.parse();

let server = new Server(program.args[0], program.opts());

server.start();
