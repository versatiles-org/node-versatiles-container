// Import statements for the module you are testing and any other dependencies
import { generateStyle } from './style.js'; // Adjust the path as necessary
import { guessStyle } from '@versatiles/style';
import { ContainerInfo } from './types.js';

// Mocking the external dependency '@versatiles/style'
jest.mock('@versatiles/style', () => ({
	guessStyle: jest.fn().mockReturnValue({ some: 'style' }),
}));

// Describing the test suite
describe('generateStyle', () => {
	// A successful case
	it('generates a style string successfully', async () => {
		const containerInfo: ContainerInfo = {
			header: {
				tileFormat: 'png',
				bbox: [0, 0, 10, 10],
			},
			metadata: JSON.stringify({ vector_layers: ['layer1', 'layer2'] }),
		};
		const options = {
			port: 3000,
			baseUrl: 'http://localhost:3000/',
			tilesUrl: 'http://example.com/tiles/{z}/{x}/{y}',
		};

		const result = generateStyle(containerInfo, options);

		// Check if the result is as expected
		expect(result).toBeDefined();
		expect(typeof result).toBe('string');

		// Verify that guessStyle was called with the correct arguments
		expect(guessStyle).toHaveBeenCalledWith({
			format: 'png',
			tiles: ['http://example.com/tiles/{z}/{x}/{y}'],
			vectorLayers: ['layer1', 'layer2'],
			baseUrl: 'http://localhost:3000/',
			bounds: [0, 0, 10, 10],
		});
	});

	// Handling error for unsupported tile format
	it('throws an error for unsupported tile formats', () => {
		const containerInfo: ContainerInfo = {
			header: {
				tileFormat: 'unsupported_format',
				bbox: [0, 0, 10, 10],
			},
			metadata: '{}',
		};
		const options = { port: 3000 };

		expect(() => generateStyle(containerInfo, options)).toThrow('unknown tile format unsupported_format');
	});
});
