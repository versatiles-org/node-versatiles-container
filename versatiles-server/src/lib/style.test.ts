import { resolveUrl } from './style.js';


describe('Styles Module', () => {
	describe('resolveUrl', () => {
		it('should resolve URLs correctly', () => {
			const base = 'http://localhost:3000/';
			const path = '/tiles/{z}/{x}/{y}';
			const resolved = resolveUrl(base, path);
			expect(resolved).toBe('http://localhost:3000/tiles/{z}/{x}/{y}');
		});
	});
});
