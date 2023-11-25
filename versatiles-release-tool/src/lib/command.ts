import { spawnSync } from 'node:child_process';
import { getErrorMessage } from './utils.js';

export function generateCommandDocumentation(command: string): string {
	const result = getCommandResults(command);
	let { markdown } = result;
	const { subcommands } = result;

	for (const subcommand of subcommands) {
		const fullCommand = `${command} ${subcommand}`;
		try {
			const subResult = getCommandResults(fullCommand);
			markdown += `\n# Subcommand: \`${fullCommand}\`\n\n${subResult.markdown}`;
		} catch (error) {
			throw new Error(`Error generating documentation for subcommand '${fullCommand}': ${getErrorMessage(error)}`);
		}
	}
	return markdown;
}

function getCommandResults(command: string): { markdown: string; subcommands: string[] } {
	const cp = spawnSync('npx', [...command.split(' '), '--help']);

	if (cp.error) throw new Error(cp.error.toString());
	if (cp.status !== 0) throw new Error(`Command failed with exit code ${cp.status}`);

	const result = cp.stdout.toString().trim();
	console.log(`Command executed successfully: ${command}`);

	return {
		markdown: formatResultAsMarkdown(command, result),
		subcommands: extractSubcommands(result),
	};
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

function formatResultAsMarkdown(command: string, result: string): string {
	return `\`\`\`console\n$ ${command}\n${result}\`\`\`\n`;
}
