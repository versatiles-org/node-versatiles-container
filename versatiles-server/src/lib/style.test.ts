/* eslint-disable @typescript-eslint/naming-convention */
import { resolveUrl, isShortbread, SHORTBREAD_LAYERS } from './style.js';


describe('Styles Module', () => {
	describe('resolveUrl', () => {
		it('should resolve URLs correctly', () => {
			const base = 'http://localhost:3000/';
			const path = '/tiles/{z}/{x}/{y}';
			const resolved = resolveUrl(base, path);
			expect(resolved).toBe('http://localhost:3000/tiles/{z}/{x}/{y}');
		});
	});

	describe('isShortbread', () => {
		const shortbreadSource = { vector_layers: SHORTBREAD_LAYERS.map(id => ({ id })) };

		it('should return false for null metadata', () => {
			expect(isShortbread(null)).toBeFalsy();
		});

		it('should return true for valid shortbread metadata as object', () => {
			expect(isShortbread(shortbreadSource)).toBeTruthy();
		});

		it('should return false for invalid metadata', () => {
			const meta = { vector_layers: [{ id: 'invalid_layer' }] };
			expect(isShortbread(meta)).toBeFalsy();
		});
	});
});
