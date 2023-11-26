import cp from 'child_process';
import { getErrorMessage } from './utils.js';

/**
 * Generates documentation for a CLI command and its subcommands.
 * @param command The base CLI command to document.
 * @returns A Promise resolving to a string containing the generated Markdown documentation.
 */
export async function generateCommandDocumentation(command: string): Promise<string> {
	// Get the base command's documentation and list of subcommands.
	let { markdown, subcommands } = await getCommandResults(command);

	// Iterate over each subcommand to generate its documentation.
	markdown += (await Promise.all(subcommands.map(async subcommand => {
		const fullCommand = `${command} ${subcommand}`;
		try {
			// Get documentation for each subcommand.
			const { markdown: subcommandMarkdown } = await getCommandResults(fullCommand);
			return `\n# Subcommand: \`${fullCommand}\`\n\n${subcommandMarkdown}`;
		} catch (error) {
			// Handle errors in generating subcommand documentation.
			throw new Error(`Error generating documentation for subcommand '${fullCommand}': ${getErrorMessage(error)}`);
		}
	}))).join('');

	return markdown;
}

/**
 * Executes a CLI command with the '--help' flag and parses the output.
 * @param command The CLI command to execute.
 * @returns A Promise resolving to an object containing the Markdown documentation and a list of subcommands.
 */
function getCommandResults(command: string): Promise<{ markdown: string; subcommands: string[] }> {
	return new Promise((resolve, reject) => {
		// Spawn a child process to run the command with the '--help' flag.
		const childProcess = cp.spawn('npx', [...command.split(' '), '--help']);
		let output = '';

		// Collect output data from the process.
		childProcess.stdout.on('data', data => output += data.toString());
		childProcess.stderr.on('data', data => console.error(`stderr: ${data}`));

		// Handle process errors.
		childProcess.on('error', error => reject(new Error(`Failed to start subprocess: ${error.message}`)));

		// Handle process exit.
		childProcess.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`Command failed with exit code ${code}`));
				return;
			}
			const result = output.trim();
			// Resolve with the formatted output and a list of subcommands.
			resolve({
				markdown: `\`\`\`console\n$ ${command}\n${result}\n\`\`\`\n`,
				subcommands: extractSubcommands(result),
			});
		});
	});
}

/**
 * Extracts a list of subcommands from the help output of a command.
 * @param result The string output from a command's help flag.
 * @returns An array of subcommand names.
 */
function extractSubcommands(result: string): string[] {
	return result
		.replace(/.*\nCommands:/msgi, '') // Remove everything before the "Commands:" section.
		.replace(/\n[a-z]+:.*/msi, '')    // Remove everything after the subcommands list.
		.split('\n')                      // Split by newline to process each line.
		.flatMap((line): string[] => {
			// Extract subcommand names from each line.
			const extract = /^  ([^ ]{2,})/.exec(line);
			if (!extract) return [];

			const [, subcommand] = extract;
			// Ignore the 'help' subcommand.
			if (subcommand === 'help') return [];
			return [subcommand];
		});
}
