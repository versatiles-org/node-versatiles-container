
const MIMETYPES = new Map([
	['avif', 'image/avif'],
	['bin', 'application/octet-stream'],
	['css', 'text/css'],
	['geojson', 'application/geo+json'],
	['htm', 'text/html'],
	['html', 'text/html'],
	['jpeg', 'image/jpeg'],
	['jpg', 'image/jpeg'],
	['js', 'text/javascript'],
	['json', 'application/json'],
	['pbf', 'application/x-protobuf'],
	['png', 'image/png'],
	['svg', 'image/svg+xml'],
	['topojson', 'application/topo+json'],
	['webp', 'image/webp'],
]);

export function getMimeByFilename(filename: string, warn?: boolean): string {
	const format = filename.replace(/.*\./, '').toLowerCase();

	if ((warn ?? false) && !MIMETYPES.has(format)) {
		console.warn('can not guess MIME for file: ' + filename);
	}

	return getMimeByFormat(format);
}

export function getMimeByFormat(format: string): string {
	return MIMETYPES.get(format) ?? 'application/octet-stream';
}

