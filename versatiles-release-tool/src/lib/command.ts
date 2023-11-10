import { spawnSync } from 'node:child_process';

export function generateCommandDocumentation(command: string): string {
	const result = getCommandResults(command);
	let { markdown } = result;
	const { subcommands } = result;

	for (const subcommand of subcommands) {
		const subResult = getCommandResults(command + ' ' + subcommand);
		markdown += `\n# Subcommand: \`${command} ${subcommand}\`\n\n${subResult.markdown}`;
	}
	return markdown;
}

function getCommandResults(command: string): { markdown: string; subcommands: string[] } {
	const cp = spawnSync(
		'npx',
		[...command.split(' '), '--help'],
	);

	if (cp.error) throw Error(cp.error.toString());
	const result = cp.stdout.toString().trim();

	const subcommands = result
		.replace(/.*\nCommands:/msgi, '')
		.replace(/\n[a-z]+:.*/msi, '')
		.split('\n')
		.flatMap((line): string[] => {
			const extract = /^  ([^ ]{2,})/.exec(line);
			if (!extract) return [];
			// eslint-disable-next-line @typescript-eslint/prefer-destructuring
			const subcommand = extract[1];
			if (subcommand === 'help') return [];
			return [subcommand];
		});

	return {
		markdown: [
			'```console',
			'$ ' + command,
			result,
			'```',
			'',
		].join('\n'),
		subcommands,
	};
}
