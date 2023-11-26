import { injectMarkdown, updateTOC } from './markdown.js'; // Replace with the actual path of your module

describe('Markdown Injection', () => {
	describe('injectMarkdown', () => {
		it('injects a Markdown segment under a specified heading', () => {
			const result = injectMarkdown(
				'# H 1\n\nC 1\n\n# H 2\n\nC 2\n\n# H 3\n\nC 3\n',
				'Injected content',
				'# H 2',
			);

			expect(result).toBe('# H 1\n\nC 1\n\n# H 2\n\nInjected content\n\n# H 3\n\nC 3\n');
		});

		it('handles foldable segments', () => {
			const result = injectMarkdown(
				'# H 1\n\nC 1\n\n# H 2\n\nC 2\n\n# H 3\n\nC 3\n',
				'Foldable content',
				'# H 2',
				true,
			);

			expect(result).toBe('# H 1\n\nC 1\n\n# H 2\n\nFoldable content\n\n# H 3\n\nC 3\n');
		});
	});

	describe('updateTOC', () => {
		it('updates the Table of Contents of a Markdown document', () => {
			const result = updateTOC(
				'# H 1\n\nC 1\n\n# H 2\n\nC 2\n\n# H 3\n\nC 3\n',
				'# H 1',
			);

			expect(result).toBe('# H 1\n\n* [H 2](#h-2)\n* [H 3](#h-3)\n\n# H 2\n\nC 2\n\n# H 3\n\nC 3\n');
		});
	});
});
