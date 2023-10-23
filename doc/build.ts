
import { writeFileSync } from 'node:fs';
import { get } from 'node:http';
import { resolve } from 'node:path';
import { Application, Comment, DeclarationReflection, ParameterReflection, ProjectReflection, ReflectionGroup, ReflectionKind, SignatureReflection, SomeType, SourceReference } from 'typedoc';

const filename = 'versatiles/src/index.ts';
const __dirname = (new URL('../', import.meta.url)).pathname;

const app = await Application.bootstrap({
	entryPoints: [resolve(__dirname, filename)],
	tsconfig: resolve(__dirname, 'versatiles/tsconfig.json'),
});

const project = await app.convert();
if (!project) throw Error();

const markdown: string = Array.from(generateDocument(project)).join('\n');

writeFileSync(resolve(__dirname, 'versatiles/test.md'), markdown);



function* generateDocument(project: ProjectReflection): Generator<string> {
	if (!project.groups) throw Error();
	for (let group of project.groups) yield* generate1Group(group);
}

function* generate1Group(group: ReflectionGroup): Generator<string> {
	for (let declaration of group.children) yield* generate2Declaration(declaration);
}

function* generate2Declaration(declaration: DeclarationReflection): Generator<string> {
	yield ``;

	let typeName;
	switch (declaration.kind) {
		case ReflectionKind.Class: typeName = 'class'; break;
		case ReflectionKind.Interface: typeName = 'interface'; break;
		case ReflectionKind.TypeAlias: typeName = 'type'; break;
		default: throw Error();
	}

	yield `# ${typeName}: \`${declaration.name}\``
	yield* generateSummaryBlock(declaration);

	for (let group of declaration.groups || []) {
		const children = group.children.filter(c => !c.flags.isPrivate);
		if (children.length === 0) continue;

		switch (group.title) {
			case 'Constructors':
				if (children.length !== 1) throw Error()
				yield* generateConstructor(children[0]);
				continue;
			case 'Properties':
				yield '## Properties'
				for (let child of children) yield* generateProperty(child);
				continue;
			case 'Methods':
				yield '## Methods'
				for (let child of children) yield* generateMethod(child);
				continue;
			default:
				console.log(group);
				throw Error();
		}
	}

	if (declaration.type) {
		yield ''
		yield '**Type:** '+getType(declaration.type)
	}
}

function* generateConstructor(declaration: DeclarationReflection): Generator<string> {
	if (!declaration.signatures) throw Error();
	if (declaration.signatures.length !== 1) throw Error();
	const signature = declaration.signatures[0];

	yield `### constructor: \`${getFunction(signature)}\``
	yield ''
	yield* generateSummaryBlock(signature);
	yield* generateParameters(signature);
}

function* generateProperty(declaration: DeclarationReflection): Generator<string> {
	yield getParameter(declaration);
}

function* generateMethod(declaration: DeclarationReflection): Generator<string> {
	if (!declaration.signatures) throw Error();
	if (declaration.signatures.length !== 1) throw Error();
	const signature = declaration.signatures[0];

	yield `### \`${getFunction(signature)}\``
	yield ''
	yield* generateSummaryBlock(signature);
	yield* generateParameters(signature);
}

function* generateParameters(component: SignatureReflection): Generator<string> {
	if (component.parameters && component.parameters.length > 0) {
		yield ``;
		yield `**Parameters:**`;
		for (let parameter of component.parameters) {
			yield getParameter(parameter);
		}
	}
	if (component.type) {
		yield ``;
		yield `**Returns:** ${getType(component.type)} `;
	}
}

function getParameter(declaration: DeclarationReflection | ParameterReflection) {
	let line = `  - \`${declaration.name}\`${getTypeDeclaration(declaration.type)}`.replace(/``/g, '');
	let summary = getSummary(declaration.comment);
	if (summary) line += '  \n    ' + summary;
	return line;
}

function getSummary(comment: Comment | undefined): string | undefined {
	if (!comment) return;
	let lines = comment.summary;
	return lines.map(line => line.text).join(' ');
}

function* generateSummaryBlock(component: DeclarationReflection | SignatureReflection): Generator<string> {
	yield ``
	if (!component.comment) {
		yield getSourceLink(component)
		return;
	}
	let lines = component.comment.summary;
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		let text = line.text;
		if (i === lines.length - 1) text += ' ' + getSourceLink(component)
		yield text;
	}
}

function getFunction(signature: SignatureReflection): string {
	return `${signature.name}(${getParameters(signature.parameters || [])})`;
}

function getParameters(parameters: ParameterReflection[]): string {
	return parameters.map(p => p.name).join(', ');
}

function getTypeDeclaration(someType: SomeType | undefined): string {
	if (!someType) return '';
	return (': ' + getType(someType)).replace(/``/g, '');
}

function getType(someType: SomeType): string {
	return getTypeRec(someType).replace(/``/g, '');

	function getTypeRec(someType: SomeType): string {
		switch (someType.type) {
			case 'intrinsic':
				return `\`${someType.name}\``;
			case 'literal':
				return `\`${JSON.stringify(someType.value)}\``;
			case 'reference':
				let result = `\`${someType.name}\``;
				if (someType.reflection) result = `[${result}](#S${someType.reflection.id})`;
				if (someType.typeArguments?.length) result += '`<`'
					+ (someType.typeArguments || [])
						.map(getTypeRec).join('\`,\`')
					+ '`>`';
				return result;
			case 'reflection':
				if (!someType.declaration.signatures) throw Error();
				if (someType.declaration.signatures.length !== 1) throw Error();
				const signature = someType.declaration.signatures[0];
				const type = signature.type ? getTypeRec(signature.type) : 'void';
				let parameters = (signature.parameters || [])
					.map(p => {
						let type = p.type ? '`:`' + getType(p.type) : '';
						return `\`${p.name}\`${type}`
					}).join('`, `')
				return `\`(\`${parameters}\`) => \`${type}`;
			case 'union':
				return someType.types.map(getTypeRec).join('\` | \`');
			default:
				console.log(someType);
				throw Error()
		}
	}
}

function getSourceLink(component: DeclarationReflection | SignatureReflection): string {
	if (!component.sources) return '';
	if (component.sources.length < 1) return '';
	if (component.sources.length > 1) throw Error();
	const source = component.sources[0];
	return `<sup><a href="${source.url}">[src]</a></sup>`;
}
