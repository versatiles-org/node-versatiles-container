#!/usr/bin/env node

import { Command } from 'commander';
import type { ServerOptions } from './lib/server.js';
import { startServer } from './lib/server.js';

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
	.option('-d, --directory <directory>', 'bucket directory/prefix, e.g. "/public/")')
	.option('-c, --fast-recompress', 'Don\'t force Brotli compression, so the server respond faster')
	.option('-p, --port <port>', 'Port to bind the server to', parseInt, 8080)
	.argument('<bucket name>', 'Name of the Google bucket')
	.action((bucketName: string, cmdOptions: Record<string, unknown>) => {

		const srvOptions: ServerOptions = {
			bucketName,
			port: Number(cmdOptions.port ?? 8080),
			fastRecompression: Boolean(cmdOptions.fastRecompression ?? false),
		};

		try {
			startServer(srvOptions);
		} catch (error: unknown) {
			const errorMessage = String((typeof error == 'object' && error != null && 'message' in error) ? error.message : error);
			console.error(`Error starting the server: ${errorMessage}`);
			process.exit(1);
		}
	});

program.parse();
