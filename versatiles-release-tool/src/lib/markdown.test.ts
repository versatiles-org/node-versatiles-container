import type { PhrasingContent, PhrasingContentMap } from 'mdast';
import { injectMarkdown, nodeToHtml, parseMarkdown, updateTOC } from './markdown.js'; // Replace with the actual path of your module

const document = getDoc('C 2');

describe('inject markdown', () => {
	it('injects a Markdown segment under a specified heading', () => {
		const result = injectMarkdown(document, 'Injected content', '# H 2');
		expect(result).toBe(getDoc('Injected content'));
	});

	it('handles foldable segments', () => {
		const result = injectMarkdown(document, 'Foldable content', '# H 2', true);
		expect(result).toBe(getDoc('Foldable content'));
	});

	it('handles foldable segments', () => {
		const result = injectMarkdown(document, '# Foldable heading\n\nFoldable content', '# H 2', true);
		expect(result).toBe(getDoc('<details>\n\n<summary><h2>Foldable heading</h2></summary>\n\nFoldable content\n\n</details>'));
	});
});

describe('update TOC', () => {
	it('updates the Table of Contents of a Markdown document', () => {
		const result = updateTOC(document, '# H 2');
		expect(result).toBe(getDoc('* [H 1](#h-1)\n* [H 3](#h-3)'));
	});
});

describe('markdown to html', () => {
	it('should convert html', () => {
		testMdToHtml('<span />', 'html', '<span />');
	});

	it('should convert text', () => {
		testMdToHtml('text', 'text', 'text');
	});

	it('should convert inlineCode', () => {
		testMdToHtml('`text`', 'inlineCode', '<code>text</code>');
	});

	it('should convert break', () => {
		testMdToHtml('a  \nb', 'break', '<br />');
	});

	it('should convert delete', () => {
		testMdToHtml('a ~~text~~', 'delete', '<del>text</del>');
	});

	it('should convert emphasis', () => {
		testMdToHtml('*text*', 'emphasis', '<em>text</em>');
		testMdToHtml('_text_', 'emphasis', '<em>text</em>');
	});

	it('should convert strong', () => {
		testMdToHtml('**text**', 'strong', '<strong>text</strong>');
		testMdToHtml('__text__', 'strong', '<strong>text</strong>');
	});

	it('should convert link', () => {
		testMdToHtml('[text](url)', 'link', '<a href="url">text</a>');
		testMdToHtml('[text](url "title")', 'link', '<a href="url" title="title">text</a>');
	});

	it('should convert image', () => {
		testMdToHtml('![](url)', 'image', '<img src="url" />');
		testMdToHtml('![alt](url)', 'image', '<img src="url" alt="alt" />');
		testMdToHtml('![](url "title")', 'image', '<img src="url" title="title" />');
		testMdToHtml('![alt](url "title")', 'image', '<img src="url" alt="alt" title="title" />');
	});


	function testMdToHtml(markdown: string, type: keyof PhrasingContentMap, result: string): void {
		const ast = parseMarkdown(markdown);
		expect(ast.children.length).toBe(1);

		const [paragraph] = ast.children;

		let content;
		if (paragraph.type === type) {
			content = paragraph as PhrasingContent;
		} else {
			if (!('children' in paragraph)) throw Error();
			content = paragraph.children.find(c => c.type === type);
		}

		if (content == null) {
			throw new Error(JSON.stringify(paragraph, null, '  '));
		}


		expect(content.type).toBe(type);
		if (content.type !== type) throw Error();
		expect(nodeToHtml(content)).toBe(result);
	}
});

function getDoc(content: string): string {
	return `# H 1\n\nC 1\n\n# H 2\n\n${content}\n\n# H 3\n\nC 3\n`;
}
