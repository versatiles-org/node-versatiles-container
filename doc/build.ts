
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Application, Comment, DeclarationReflection, ParameterReflection, ProjectReflection, Reflection, ReflectionGroup, ReflectionKind, SignatureReflection, SomeType } from 'typedoc';

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



function* generateDocument(ref: ProjectReflection): Generator<string> {
	if (!ref.groups) throw Error();
	for (let group of ref.groups) yield* generate1Group(group);
}

function* generate1Group(group: ReflectionGroup): Generator<string> {
	for (let declaration of group.children) yield* generate2Declaration(declaration);
}

function* generate2Declaration(ref: DeclarationReflection): Generator<string> {
	yield '';

	let typeName;
	switch (ref.kind) {
		case ReflectionKind.Class: typeName = 'Class'; break;
		case ReflectionKind.Interface: typeName = 'Interface'; break;
		case ReflectionKind.TypeAlias: typeName = 'Type'; break;
		default: throw Error();
	}

	yield `# ${typeName}: \`${ref.name}\`<a id="${getAnchor(ref)}"></a>`
	yield* generateSummaryBlock(ref);

	for (let group of ref.groups || []) {
		const children = group.children.filter(c => !c.flags.isPrivate);
		if (children.length === 0) continue;

		switch (group.title) {
			case 'Constructors':
				if (children.length !== 1) throw Error()
				yield* generateMethod(children[0], true);
				continue;
			case 'Properties':
				yield '## Properties'
				for (let child of children) yield getParameter(child);
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

	if (ref.type) {
		yield ''
		yield '**Type:** ' + getType(ref.type)
	}
}

function* generateMethod(ref: DeclarationReflection, isConstructor: boolean = false): Generator<string> {
	if (!ref.signatures) throw Error();
	if (ref.signatures.length !== 1) throw Error();
	const sig = ref.signatures[0];

	console.log('declaration', ref);
	console.log('signature', sig);

	yield `### ${isConstructor ? 'constructor: ' : ''}\`${getFunction(sig)}\``
	yield ''
	yield* generateSummaryBlock(sig);

	if (sig.parameters && sig.parameters.length > 0) {
		yield '';
		yield `**Parameters:**`;
		for (let parameter of sig.parameters) {
			yield getParameter(parameter);
		}
	}

	if (sig.type) {
		yield '';
		yield `**Returns:** ${getType(sig.type)} `;
	}
}

function getParameter(ref: DeclarationReflection | ParameterReflection) {
	let line = `  - \`${ref.name}\`${getTypeDeclaration(ref.type)}`.replace(/``/g, '');
	let summary = getSummary(ref.comment);
	if (summary) line += '  \n    ' + summary;
	return line;
}

function getSummary(comment: Comment | undefined): string | undefined {
	if (!comment) return;
	let lines = comment.summary;
	return lines.map(line => line.text).join(' ');
}

function* generateSummaryBlock(ref: DeclarationReflection | SignatureReflection): Generator<string> {
	yield ''
	if (!ref.comment) {
		yield getSourceLink(ref)
		return;
	}
	let lines = ref.comment.summary;
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		let text = line.text;
		if (i === lines.length - 1) text += ' ' + getSourceLink(ref)
		yield text;
	}
}

function getFunction(ref: SignatureReflection): string {
	return `${ref.name}(${getParameters(ref.parameters || [])})`;
}

function getParameters(refs: ParameterReflection[]): string {
	return refs.map(p => p.name).join(', ');
}

function getTypeDeclaration(someType: SomeType | undefined): string {
	if (!someType) return '';
	return ('`: `' + getType(someType)).replace(/``/g, '');
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
				if (someType.reflection) result = `[${result}](#${getAnchor(someType.reflection)})`;
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

function getSourceLink(ref: DeclarationReflection | SignatureReflection): string {
	if (!ref.sources) return '';
	if (ref.sources.length < 1) return '';
	if (ref.sources.length > 1) throw Error();
	const source = ref.sources[0];
	return `<sup><a href="${source.url}">[src]</a></sup>`;
}

function getAnchor(ref: DeclarationReflection | Reflection): string {
	let typeName;
	switch (ref.kind) {
		case ReflectionKind.Class: typeName = 'class'; break;
		case ReflectionKind.Interface: typeName = 'interface'; break;
		case ReflectionKind.TypeAlias: typeName = 'type'; break;
		default:
			console.log(ref);
			throw Error('unknown kind');
	}
	return `${typeName}_${ref.name}`;
}
