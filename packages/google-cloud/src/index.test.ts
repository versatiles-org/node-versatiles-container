import { startServer } from './lib/server.js';
import { jest } from '@jest/globals';

jest.mock('./lib/server.js', () => ({
	startServer: jest.fn(),
}));

describe('index.ts', () => {
	test('starts server with default options', async () => {
		await import('./index.js'); // This will execute the file and the command parsing
		expect(startServer).toHaveBeenCalledWith({
			baseUrl: 'http://localhost:8080/',
			bucket: 'test-bucket',
			bucketPrefix: '',
			fastRecompression: false,
			port: 8080,
			verbose: false,
		});
	});

	// Additional tests for different command line options
});
