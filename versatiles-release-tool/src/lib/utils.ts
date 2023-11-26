
export function getErrorMessage(error: unknown): string {
	if (error == null) return 'unknown';
	if (typeof error === 'object') {
		if ('message' in error) return String(error.message);
	}
	return 'unknown';
}
