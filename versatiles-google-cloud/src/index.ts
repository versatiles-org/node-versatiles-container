#!/usr/bin/env node

import { Command } from 'commander';
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
	.option('-b, --base-url <url>', 'public base URL (default: "http://localhost:<port>/")')
	.option('-d, --directory <directory>', 'bucket directory/prefix, e.g. "/public/"')
	.option('-f, --fast-recompress', 'Don\'t force Brotli compression, so the server respond faster')
	.option('-p, --port <port>', 'Port to bind the server to', parseInt, 8080)
	.option('-v, --verbose', 'Tell me what you\'re doing')
	.argument('<bucket name>', 'Name of the Google bucket')
	.action((bucketName: string, cmdOptions: Record<string, unknown>) => {

		const port = Number(cmdOptions.port ?? 8080);
		const fastRecompression = Boolean(cmdOptions.fastRecompression ?? false);
		const baseUrl = String(cmdOptions.baseUrl ?? `http://localhost:${port}/`);
		const bucketPrefix = String(cmdOptions.directory ?? '');
		const verbose = Boolean(cmdOptions.verbose ?? false);

		try {
			void startServer({
				baseUrl,
				bucket: bucketName,
				bucketPrefix,
				fastRecompression,
				port,
				verbose,
			});
		} catch (error: unknown) {
			const errorMessage = String((typeof error == 'object' && error != null && 'message' in error) ? error.message : error);
			console.error(`Error starting the server: ${errorMessage}`);
			process.exit(1);
		}
	});

program.parse();
