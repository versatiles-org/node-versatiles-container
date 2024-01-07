#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from './lib/server.js';

/**
 * This script is the entry point for the VersaTiles Google Cloud command-line application.
 * It sets up a server to serve files from a specified Google Cloud Storage bucket through a Google
 * Load Balancer and Content Delivery Network (CDN). It handles HTTP headers, optimizes content
 * compression, and provides a RESTful API interface to serve tiles from VersaTiles containers.
 * 
 * For more details, visit:
 * https://github.com/versatiles-org/node-versatiles/blob/main/versatiles-google-cloud/README.md
 */
export const program = new Command();

program
	.showHelpAfterError()
	.name('versatiles-google-cloud')
	.description(
		'Initialises a server to serve files from a specified Google Bucket to a Google Load Balancer with CDN, '
		+ 'handles HTTP headers and compression, and provides a RESTful API for VersaTiles containers.\n'
		+ 'For more details, visit: https://github.com/versatiles-org/node-versatiles/blob/main/packages/google-cloud/README.md',
	)
	.argument('<bucket-name>', 'Name of the Google Cloud Storage bucket.')
	.option('-b, --base-url <url>', 'Set the public base URL. Defaults to "http://localhost:<port>/".')
	.option('-d, --directory <prefix>', 'Set the bucket directory (prefix), e.g., "/public/".')
	.option('-f, --fast-recompression', 'Enable faster server responses by avoiding recompression.')
	.option('-l, --local-directory <path>', 'Ignore bucket and use a local directory instead. (Useful e.g. for local development.)')
	.option('-p, --port <port>', 'Set the server port. (default: 8080)')
	.option('-v, --verbose', 'Enable verbose mode for detailed operational logs.')
	.action((bucketName: string, cmdOptions: Record<string, unknown>) => {

		const port = Number(cmdOptions.port ?? 8080);
		const baseUrl = String(cmdOptions.baseUrl ?? `http://localhost:${port}/`);
		const bucketPrefix = String(cmdOptions.directory ?? '');
		const fastRecompression = Boolean(cmdOptions.fastRecompression ?? false);
		const localDirectory: string | undefined = Boolean(cmdOptions.localDirectory) ? String(cmdOptions.localDirectory) : undefined;
		const verbose = Boolean(cmdOptions.verbose ?? false);

		if (verbose) {
			console.table({
				baseUrl,
				bucketPrefix,
				fastRecompression,
				localDirectory,
				port,
				verbose,
			});
		}

		try {
			void startServer({
				baseUrl,
				bucket: bucketName,
				bucketPrefix,
				fastRecompression,
				localDirectory,
				port,
				verbose,
			});
		} catch (error: unknown) {
			const errorMessage = String((typeof error == 'object' && error != null && 'message' in error) ? error.message : error);
			console.error(`Error starting the server: ${errorMessage}`);
			process.exit(1);
		}
	});

if (process.env.NODE_ENV !== 'test') {
	program.parse();
}
