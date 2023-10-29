#!/usr/bin/env node
'use strict'

import { Command } from 'commander';
import { Server } from './lib/server.js';

const program = new Command();

program
	.showHelpAfterError()
	.name('versatiles-server')
	.description('Simple VersaTiles server')
	.option('-t, --tms', 'use TMS tile order (flip y axis)')
	.option('-c, --compress', 'compress data if needed. Slower, but reduces traffic.')
	.option('-p, --port <port>', 'port', )
	.option('-i, --host <hostname|ip>', 'hostname or ip')
	.option('-b, --base <http://baseurl/>', 'default is: "http://localhost:<port>/"')
	.argument('<source>', 'VersaTiles container, can be an url or filename of a "*.versatiles" file')

program.parse();

let server = new Server(program.args[0], program.opts());

server.start();
