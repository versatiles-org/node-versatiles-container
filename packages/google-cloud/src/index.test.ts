/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { Command } from 'commander';
import type { startServer } from './lib/server.js';
import { jest } from '@jest/globals';

const mockedStartServer = jest.fn<typeof startServer>().mockResolvedValue(null);
jest.unstable_mockModule('./lib/server.js', () => ({ startServer: mockedStartServer }));

jest.mock('node:process');
jest.spyOn(process, 'exit').mockImplementation(jest.fn<typeof process.exit>());

jest.spyOn(console, 'log').mockReturnValue();
jest.spyOn(console, 'table').mockReturnValue();

describe('index.ts', () => {
	const defaultResults = {
		baseUrl: 'http://localhost:8080/',
		bucket: 'test-bucket',
		bucketPrefix: '',
		fastRecompression: false,
		port: 8080,
		verbose: false,
		localDirectory: undefined,
	};

	beforeEach(() => {
		mockedStartServer.mockReset();
	});

	test('starts server with default options', async () => {
		await run('test-bucket');
		expect(mockedStartServer).toHaveBeenCalledTimes(1);
		expect(mockedStartServer).toHaveBeenCalledWith({ ...defaultResults });
	});

	test('starts server in local directory mode', async () => {
		await run('test-bucket', '-l', '.');
		expect(mockedStartServer).toHaveBeenCalledTimes(1);
		expect(mockedStartServer).toHaveBeenCalledWith({ ...defaultResults, localDirectory: '.' });
	});

	test('starts server with base URL', async () => {
		await run('test-bucket', '-b', 'https://example.org');
		expect(mockedStartServer).toHaveBeenCalledTimes(1);
		expect(mockedStartServer).toHaveBeenCalledWith({ ...defaultResults, baseUrl: 'https://example.org' });
	});

	test('starts server with bucket prefix', async () => {
		await run('test-bucket', '-d', '/public/');
		expect(mockedStartServer).toHaveBeenCalledTimes(1);
		expect(mockedStartServer).toHaveBeenCalledWith({ ...defaultResults, bucketPrefix: '/public/' });
	});

	test('starts server with fast recompression', async () => {
		await run('test-bucket', '-f');
		expect(mockedStartServer).toHaveBeenCalledTimes(1);
		expect(mockedStartServer).toHaveBeenCalledWith({ ...defaultResults, fastRecompression: true });
	});

	test('starts server with different port', async () => {
		await run('test-bucket', '-p', '3000');
		expect(mockedStartServer).toHaveBeenCalledTimes(1);
		expect(mockedStartServer).toHaveBeenCalledWith({ ...defaultResults, baseUrl: 'http://localhost:3000/', port: 3000 });
	});

	test('starts server with different port', async () => {
		await run('test-bucket', '-b', 'https://example.org', '-p', '3000');
		expect(mockedStartServer).toHaveBeenCalledTimes(1);
		expect(mockedStartServer).toHaveBeenCalledWith({ ...defaultResults, baseUrl: 'https://example.org', port: 3000 });
	});

	test('starts server in verbose mode', async () => {
		await run('test-bucket', '-v');
		expect(mockedStartServer).toHaveBeenCalledTimes(1);
		expect(mockedStartServer).toHaveBeenCalledWith({ ...defaultResults, verbose: true });
	});

	async function run(...args: string[]): Promise<void> {
		const moduleUrl = './index.js?t=' + Math.random();
		const module = await import(moduleUrl);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const program = (module.program) as Command;
		program.parse(['./node', './index.ts', ...args]);
	}
});
