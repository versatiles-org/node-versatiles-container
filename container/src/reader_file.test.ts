import getFileReader from './reader_file.js';

const TEST_FILENAME = 'temp_test_file.txt';
const TEST_BUFFER = Buffer.from('This is a test file containing some sample text for reading.');

// Mock the fs module methods used by getFileReader
jest.mock('fs', () => {
	return {
		openSync: jest.fn((filename) => {
			if (filename === TEST_FILENAME) return 42;
			throw Error('file does not exist');
		}),
		read: jest.fn((
			fd: number,
			options: { buffer: Buffer; position: number; length: number },
			callback: (a: null, b: null, c: Buffer) => void,
		) => {
			if (fd !== 42) throw Error('can not read: file does not exist');
			const { buffer, position, length } = options;
			if ((position < 0) || (length < 0) || (position + length > TEST_BUFFER.length)) throw Error('range outside file');
			if (buffer.length !== length) throw Error('buffer length error');
			TEST_BUFFER.copy(buffer, 0, position, position + length);
			callback(null, null, buffer);
		}),
	};
});


describe('getFileReader', () => {
	afterAll(() => {
		jest.restoreAllMocks();
	});

	it('reads a chunk of data from a file', async () => {
		const read = getFileReader(TEST_FILENAME);
		const startPosition = 10;
		const length = 9;
		const expectedContent = 'test file';
		const buffer = await read(startPosition, length);

		expect(buffer.toString()).toEqual(expectedContent);
	});

	it('reads to the end of the file when length exceeds file size', async () => {
		const read = getFileReader(TEST_FILENAME);
		const startPosition = TEST_BUFFER.length - 10;
		const length = 11; // Intentionally large to go beyond the file's end

		await expect(async () => {
			await read(startPosition, length);
		}).rejects.toThrow('range outside file');
	});

	it('rejects the promise when attempting to read a non-existing file', () => {
		expect(() => {
			getFileReader('non_existing_file.txt');
		}).toThrow('file does not exist');
	});
});
