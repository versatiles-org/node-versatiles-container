import type {
	Comment,
	DeclarationReflection,
	ParameterReflection,
	ProjectReflection,
	Reflection,
	SignatureReflection,
	SomeType,
} from 'typedoc';
import {
	Application,
	ReflectionKind,
} from 'typedoc';

/**
 * Generate markdown documentation from TypeScript files.
 * @param sourceFilePaths - Array of absolute TypeScript file paths.
 * @param tsConfigPath - Absolute file path of tsconfig.json.
 */
export async function generateTsMarkdownDoc(sourceFilePaths: string[], tsConfigPath: string): Promise<string> {
	const app = await Application.bootstrap({ entryPoints: sourceFilePaths, tsconfig: tsConfigPath });
	const project = await app.convert();

	if (!project) {
		throw new Error('Failed to convert TypeScript project.');
	}

	return Array.from(documentProject(project)).join('\n');
}

function* documentProject(project: ProjectReflection): Generator<string> {
	if (!project.groups) {
		throw new Error('No TypeScript code to document found! Is this a lib?');
	}

	for (const group of project.groups) {
		for (const item of group.children) {
			yield* documentDeclaration(item);
		}
	}
}

function* documentDeclaration(declaration: DeclarationReflection): Generator<string> {
	const declarationType = getDeclarationTypeName(declaration.kind);
	yield `# ${declarationType}: \`${declaration.name}\`<a id="${createAnchorId(declaration)}"></a>`;
	yield* documentSummaryBlock(declaration);

	for (const group of declaration.groups ?? []) {
		const publicMembers = group.children.filter(member => !member.flags.isPrivate && !member.flags.isProtected);
		if (publicMembers.length === 0) continue;

		// Sort by order in code
		publicMembers.sort((a, b) => a.id - b.id);

		switch (group.title) {
			case 'Constructors':
				if (publicMembers.length !== 1) throw Error('publicMembers.length !== 1');
				yield* documentMethod(publicMembers[0], true);
				continue;
			case 'Properties':
				//yield '';
				//yield '**Properties**';
				for (const member of publicMembers) yield documentProperty(member);
				continue;
			case 'Methods':
				//yield '';
				//yield '**Methods**';
				for (const member of publicMembers) yield* documentMethod(member);
				continue;
			default:
				console.log(group);
				throw Error('Unknown group title');
		}
	}

	if (declaration.type) {
		yield `\n**Type:** <code>${formatTypeDeclaration(declaration.type)}</code>`;
	}
}

function* documentMethod(method: DeclarationReflection, isConstructor = false): Generator<string> {
	if (method.signatures?.length !== 1) throw Error('should be 1');

	const [signature] = method.signatures;

	const methodName = signature.name;
	const parameters = formatMethodParameters(signature.parameters ?? []);
	const returnType = signature.type;
	const methodType = isConstructor ? 'Constructor' : 'Method';

	yield `## ${methodType}: \`${methodName}(${parameters})\``;

	yield '';
	yield* documentSummaryBlock(signature);

	if (signature.parameters && signature.parameters.length > 0) {
		yield '';
		yield '**Parameters:**';
		for (const parameter of signature.parameters) {
			yield documentProperty(parameter);
		}
	}

	if (returnType) {
		yield '';
		yield `**Returns:** <code>${formatTypeDeclaration(returnType)}</code>`;
	}
}

function formatMethodParameters(parameters: ParameterReflection[]): string {
	return parameters.map(param => param.name).join(', ');
}

// Helper Functions
function getDeclarationTypeName(kind: ReflectionKind): string {
	switch (kind) {
		case ReflectionKind.Class: return 'Class';
		case ReflectionKind.Function: return 'Function';
		case ReflectionKind.Interface: return 'Interface';
		case ReflectionKind.TypeAlias: return 'Type';
		case ReflectionKind.Variable: return 'Variable';
		default: throw new Error(`Unknown reflection kind: ${kind}`);
	}
}

function documentProperty(ref: DeclarationReflection | ParameterReflection): string {
	let line = `  - <code>${ref.name}${resolveTypeDeclaration(ref.type)}</code>`;
	if (ref.flags.isOptional) line += ' (optional)';
	const summary = extractSummary(ref.comment);
	if (summary) line += '  \n    ' + summary;
	return line;
}

function extractSummary(comment: Comment | undefined): string {
	if (!comment) return '';
	return comment.summary.map(line => line.text).join('');
}

function* documentSummaryBlock(ref: DeclarationReflection | SignatureReflection): Generator<string> {
	yield '';

	if (ref.comment) {
		yield formatComment(ref.comment);
		return;
	}

	const { type } = ref;
	if (type?.type === 'reflection') {
		if (type.declaration.signatures?.length !== 1) throw Error('type.declaration.signatures?.length !== 1');
		const [signature] = type.declaration.signatures;
		if (signature.comment) {
			yield formatComment(signature.comment);
			return;
		}
	}

	yield createSourceLink(ref) + '\n';
	return;

	function formatComment(comment: Comment): string {
		return (extractSummary(comment) + ' ' + createSourceLink(ref)).replace(/\n/m, '  \n') + '\n';
	}
}

function resolveTypeDeclaration(someType: SomeType | undefined): string {
	if (!someType) return '';
	return `: ${formatTypeDeclaration(someType)}`;
}

function formatTypeDeclaration(someType: SomeType): string {
	return getTypeRec(someType);

	function getTypeRec(some: SomeType): string {
		switch (some.type) {
			case 'intrinsic':
				return some.name;

			case 'literal':
				return JSON.stringify(some.value);

			case 'reference':
				let result = some.name;
				if (some.reflection) result = `[${result}](#${createAnchorId(some.reflection)})`;
				if (some.typeArguments?.length ?? 0) result += '<'
					+ (some.typeArguments ?? [])
						.map(getTypeRec).join(',')
					+ '>';
				return result;

			case 'reflection':
				if (!some.declaration.signatures) throw Error('!some.declaration.signatures');
				if (some.declaration.signatures.length !== 1) throw Error('some.declaration.signatures.length !== 1');
				const [signature] = some.declaration.signatures;
				const type = signature.type ? getTypeRec(signature.type) : 'void';
				const parameters = (signature.parameters ?? [])
					.map(p => {
						return p.name + (p.type ? ': ' + getTypeRec(p.type) : '');
					}).join(', ');
				return `(${parameters}) => ${type}`;

			case 'tuple':
				return `[${some.elements.map(getTypeRec).join(', ')}]`;

			case 'union':
				return some.types.map(getTypeRec).join(' | ');

			default:
				console.log(some);
				throw Error(some.type);
		}
	}
}

function createSourceLink(reference: DeclarationReflection | SignatureReflection): string {
	if (!reference.sources || reference.sources.length < 1) return '';

	if (reference.sources.length > 1) throw Error('ref.sources.length > 1');
	const [source] = reference.sources;
	return `<sup><a href="${source.url}">[src]</a></sup>`;
}

function createAnchorId(reference: Reflection): string {
	return `${getDeclarationTypeName(reference.kind)}_${reference.name}`.toLowerCase();
}
