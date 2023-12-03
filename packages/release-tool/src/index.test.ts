/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { jest } from '@jest/globals';
import type { Command } from 'commander';

jest.unstable_mockModule('./lib/typedoc.js', () => ({
	generateTsMarkdownDoc: jest.fn<typeof generateTsMarkdownDoc>().mockResolvedValue('generateTsMarkdownDoc'),
}));
const { generateTsMarkdownDoc } = await import('./lib/typedoc.js');

jest.unstable_mockModule('./lib/command.js', () => ({
	generateCommandDocumentation: jest.fn<typeof generateCommandDocumentation>().mockResolvedValue('generateCommandDocumentation'),
}));
const { generateCommandDocumentation } = await import('./lib/command.js');

jest.unstable_mockModule('./lib/markdown.js', () => ({
	injectMarkdown: jest.fn<typeof injectMarkdown>().mockReturnValue('injectMarkdown'),
	updateTOC: jest.fn<typeof updateTOC>().mockReturnValue('updateTOC'),
}));
const { injectMarkdown, updateTOC } = await import('./lib/markdown.js');

jest.unstable_mockModule('node:fs', () => ({
	existsSync: jest.fn<typeof existsSync>().mockReturnValue(true),
	readFileSync: jest.fn<typeof readFileSync>().mockReturnValue('readFileSync'),
	writeFileSync: jest.fn<typeof writeFileSync>().mockReturnValue(),
}));
const { existsSync, readFileSync, writeFileSync } = await import('node:fs');

const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

const rootDir = new URL('../', import.meta.url).pathname;

describe('release-tool CLI', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	describe('ts2md command', () => {
		test('should generate markdown documentation from a TypeScript file', async () => {
			const tsFilename = rootDir + 'src/index.ts';
			const tsConfig = rootDir + 'tsconfig.build.json';

			await run('ts2md', tsFilename, tsConfig);

			expect(existsSync).toHaveBeenNthCalledWith(1, tsFilename);
			expect(existsSync).toHaveBeenNthCalledWith(2, tsConfig);
			expect(generateTsMarkdownDoc).toHaveBeenCalledWith([tsFilename], tsConfig);
			expect(mockStdout).toHaveBeenCalledWith('generateTsMarkdownDoc');
		});
	});

	describe('cmd2md command', () => {
		test('should generate markdown documentation from an executable', async () => {
			const command = 'test';

			await run('cmd2md', command);

			expect(generateCommandDocumentation).toHaveBeenCalledWith(command);
			expect(mockStdout).toHaveBeenCalledWith('generateCommandDocumentation');
		});
	});

	describe('inserttoc command', () => {
		test('should insert inserttoc', async () => {
			const readme = rootDir + 'README.md';
			const heading = '## heading';

			await run('inserttoc', readme, heading);

			expect(existsSync).toHaveBeenCalledWith(readme);
			expect(readFileSync).toHaveBeenCalledWith(readme, 'utf8');
			expect(updateTOC).toHaveBeenCalledWith('readFileSync', heading);
			expect(writeFileSync).toHaveBeenCalledWith(readme, 'updateTOC');
		});
	});

	async function run(...args: string[]): Promise<void> {
		console.log({ args });
		const moduleUrl = './index.js?t=' + Math.random();
		const module = await import(moduleUrl);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const program = (module.program) as Command;
		await program.parseAsync(['node', 'vrt', ...args]);
	}
});
