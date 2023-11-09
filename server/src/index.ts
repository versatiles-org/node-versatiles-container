#!/usr/bin/env node
'use strict';

import { Command } from 'commander';
import { Server } from './lib/server.js';
import type { Options } from './lib/server.js';
import open from 'open';

/**
 * Entry script for the VersaTiles server command-line application.
 * Utilizes the commander.js library to parse command-line arguments and options,
 * sets up the server based on these options, and optionally opens the server URL in a web browser.
 */
const program = new Command();

program
	.showHelpAfterError()
	.name('versatiles-server')
	.description('Simple VersaTiles server')
	.option('-b, --base-url <http://baseurl/>', 'default is: "http://localhost:<port>/"')
	.option('-c, --compress', 'compress data if needed. Slower, but reduces traffic.', true)
	.option('-i, --host <hostname|ip>', 'hostname or ip', '0.0.0.0')
	.option('-o, --open', 'open map in web browser', false)
	.option('-p, --port <port>', 'port', '8080')
	.option('-t, --tms', 'use TMS tile order (flip y axis)', false)
	.argument('<source>', 'VersaTiles container, can be an url or filename of a "*.versatiles" file');

program.parse();

const commandOptions = program.opts();

const serverOptions: Options = {
	baseUrl: commandOptions.baseUrl as string | undefined,
	compress: commandOptions.compress as boolean | undefined,
	host: commandOptions.host as string | undefined,
	port: commandOptions.port as number | undefined,
	tms: commandOptions.tms as boolean | undefined,
};

const server = new Server(program.args[0], serverOptions);

await server.start();

if (Boolean(commandOptions.open)) {
	await open(server.getUrl());
}
