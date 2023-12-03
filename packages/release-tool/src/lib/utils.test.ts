import { getErrorMessage } from './utils.js';

describe('getErrorMessage', () => {
	it('returns "unknown" for null', () => {
		expect(getErrorMessage(null)).toBe('unknown');
	});

	it('returns the message for error objects with a message property', () => {
		const error = { message: 'Test error message' };
		expect(getErrorMessage(error)).toBe('Test error message');
	});

	it('returns "unknown" for error objects without a message property', () => {
		const error = { noMessage: 'No message here' };
		expect(getErrorMessage(error)).toBe('unknown');
	});

	it('returns "unknown" for non-object errors', () => {
		expect(getErrorMessage(42)).toBe('unknown');
		expect(getErrorMessage('Error string')).toBe('unknown');
		expect(getErrorMessage(undefined)).toBe('unknown');
	});

	it('handles custom error objects with a message property', () => {
		class CustomError {
			public message: string;

			public constructor(message: string) {
				this.message = message;
			}
		}
		const error = new CustomError('Custom error message');
		expect(getErrorMessage(error)).toBe('Custom error message');
	});
});
