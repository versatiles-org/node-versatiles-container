#!/usr/bin/env node

import { Command } from 'commander';
import type { ServerOptions } from './lib/types.js';
import open from 'open';
import { Server } from './lib/server.js';

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
	.option('-b, --base-url <url>', 'Base URL for the server (default: "http://localhost:<port>/")')
	.option('-c, --compress', 'Compress data if needed. Slower, but reduces traffic.', true)
	.option('-i, --host <hostname|ip>', 'Hostname or IP to bind the server to', '0.0.0.0')
	.option('-o, --open', 'Open map in web browser', false)
	.option('-p, --port <port>', 'Port to bind the server to', parseInt, 8080)
	.option('-t, --tms', 'Use TMS tile order (flip y axis)', false)
	.argument('<source>', 'VersaTiles container, can be a URL or filename of a "*.versatiles" file')
	.action(async (source: string, cmdOptions: Record<string, unknown>) => {
		const srvOptions: ServerOptions = {
			baseUrl: cmdOptions.baseUrl as string | undefined,
			compress: cmdOptions.compress as boolean | undefined,
			host: cmdOptions.host as string | undefined,
			port: cmdOptions.port as number | undefined,
			tms: cmdOptions.tms as boolean | undefined,
		};

		try {
			const server = new Server(program.args[0], srvOptions);
			await server.start();

			if (Boolean(cmdOptions.open)) {
				await open(server.getUrl());
			}
		} catch (error: unknown) {
			const errorMessage = String((typeof error == 'object' && error != null && 'message' in error) ? error.message : error);
			console.error(`Error starting the server: ${errorMessage}`);
			process.exit(1);
		}
	});

program.parse();
