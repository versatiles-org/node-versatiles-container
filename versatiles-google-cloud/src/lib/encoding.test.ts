import type { EncodingTools } from './encoding.js';
import { ENCODINGS } from './encoding.js';

describe('Encoding Tools', () => {
	// Test each encoding tool
	Object.values(ENCODINGS).forEach((encodingTool: EncodingTools) => {
		describe(`${encodingTool.name} encoding`, () => {
			test('should compress and decompress a buffer', async () => {
				const buffer = Buffer.from('test data');
				const compressed = await encodingTool.compressBuffer(buffer, false);
				const decompressed = await encodingTool.decompressBuffer(compressed);

				expect(decompressed).toEqual(buffer);
			});

			// Additional tests for stream methods, error handling, etc.
		});
	});
});
