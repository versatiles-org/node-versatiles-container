import { spawn } from 'node:child_process';
import { getErrorMessage } from './utils.js';

export async function generateCommandDocumentation(command: string): Promise<string> {
	let { markdown, subcommands } = await getCommandResults(command);

	markdown += (await Promise.all(subcommands.map(async subcommand => {
		const fullCommand = `${command} ${subcommand}`;
		try {
			const { markdown } = await getCommandResults(fullCommand);
			return `\n# Subcommand: \`${fullCommand}\`\n\n${markdown}`;
		} catch (error) {
			throw new Error(`Error generating documentation for subcommand '${fullCommand}': ${getErrorMessage(error)}`);
		}
	}))).join('');

	return markdown;
}

function getCommandResults(command: string): Promise<{ markdown: string; subcommands: string[] }> {
	return new Promise((resolve, reject) => {
		const childProcess = spawn('npx', [...command.split(' '), '--help']);
		let output = '';

		childProcess.stdout.on('data', data => output += data.toString());
		childProcess.stderr.on('data', data => console.error(`stderr: ${data}`));

		childProcess.on('error', error => reject(new Error(`Failed to start subprocess: ${error.message}`)));

		childProcess.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`Command failed with exit code ${code}`));
				return;
			}
			console.log(`Command executed successfully: ${command}`);
			const result = output.trim();
			resolve({
				markdown: `\`\`\`console\n$ ${command}\n${result}\`\`\`\n`,
				subcommands: extractSubcommands(result),
			});
		});
	});
}

function extractSubcommands(result: string): string[] {
	return result
		.replace(/.*\nCommands:/msgi, '')
		.replace(/\n[a-z]+:.*/msi, '')
		.split('\n')
		.flatMap((line): string[] => {
			const extract = /^  ([^ ]{2,})/.exec(line);
			if (!extract) return [];

			const [, subcommand] = extract;
			if (subcommand === 'help') return [];
			return [subcommand];
		});
}
