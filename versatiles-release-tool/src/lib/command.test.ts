import cp, { ChildProcessWithoutNullStreams, ChildProcessByStdio, SpawnOptions } from 'child_process';
import { EventEmitter } from 'node:events';
import { Readable, Writable } from 'node:stream';
import { generateCommandDocumentation } from './command.js';
import { jest } from '@jest/globals';

describe('generateCommandDocumentation using mocked spawn', () => {
	// Mock implementation of spawn

	const spawnSpy = jest.spyOn(cp, 'spawn');
	spawnSpy.mockImplementation((
		command: string,
		args: readonly string[],
		options: SpawnOptions)
		: ChildProcessWithoutNullStreams => {
		const mockChildProcess = new EventEmitter() as ChildProcessByStdio<Writable, Readable, Readable>;
		mockChildProcess.stdout = getReader('Example command output for ' + [command, ...args].join(' '));
		mockChildProcess.stderr = getReader('');

		process.nextTick(() => mockChildProcess.emit('close', 0));

		return mockChildProcess;

		function getReader(text: string): Readable {
			const r = new Readable();
			r._read = () => { };
			r.push(text);
			r.push(null);
			return r;
		}
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('generates documentation for a CLI command', async () => {
		const documentation = await generateCommandDocumentation('example-command');
		expect(documentation).toBe('```console\n$ example-command\nExample command output for npx example-command --help\n```\n');
		expect(spawnSpy).toHaveBeenCalled();
		expect(spawnSpy).toHaveBeenCalledWith('npx', ['example-command', '--help']);
	});
});

describe('generateCommandDocumentation', () => {
	it('generates documentation for vrt', async () => {
		const documentation = await generateCommandDocumentation('vrt');
		const lines: string[] = documentation.split('\n');

		find('```console');
		find('$ vrt');
		find('Usage: vrt');
		find('Commands:');
		find('```');

		['ts2md', 'cmd2md', 'insertmd', 'inserttoc'].forEach(subcommand => {
			find('# Subcommand: `vrt ' + subcommand);
			find('```console');
			find('$ vrt ' + subcommand);
			find('Usage: vrt ' + subcommand);
			find('Arguments:');
			find('Options:');
			find('```');
		})

		function find(text: string) {
			while (true) {
				let line = lines.shift();
				if (line == null) throw new Error(`line not found: "${text}"`);
				if (line.startsWith(text)) return;
			}
		}
	});
});
