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
		yield '\n# ' + group.title;
		for (const declaration of group.children) {
			switch (declaration.kind) {
				case ReflectionKind.Class: yield* documentClass(declaration); break;
				case ReflectionKind.Function: yield* documentMethod(declaration, 2); break;
				case ReflectionKind.Interface: yield* documentInterface(declaration); break;
				case ReflectionKind.TypeAlias: yield* documentType(declaration); break;
				case ReflectionKind.Variable: yield* documentVariable(declaration); break;
				default:
					throw new Error('implement ' + declaration.kind);
			}
		}
	}
}

function* documentInterface(declaration: DeclarationReflection): Generator<string> {
	yield `\n## Interface: \`${declaration.name}\`<a id="${createAnchorId(declaration)}"></a>`;

	yield '\n```typescript';
	yield 'interface {';
	for (const child of declaration.children ?? []) {
		if (child.kind !== ReflectionKind.Property) throw Error('should be a property inside an interface');
		if (child.type == null) throw Error('should have a type');
		const name = child.name + (child.flags.isOptional ? '?' : '');
		yield `  ${name}: ${formatTypeDeclaration(child.type)};`;
	}
	yield '}';
	yield '```';
}


function* documentType(declaration: DeclarationReflection): Generator<string> {
	yield `\n## Type: \`${declaration.name}\`<a id="${createAnchorId(declaration)}"></a>`;
	if (declaration.type) {
		yield `\n**Type:** <code>${formatTypeDeclaration(declaration.type)}</code>`;
	}
}

function* documentClass(declaration: DeclarationReflection): Generator<string> {
	yield `\n## Class: \`${declaration.name}\`<a id="${createAnchorId(declaration)}"></a>`;
	yield* documentSummaryBlock(declaration);

	for (const group of declaration.groups ?? []) {
		const publicMembers = group.children.filter(member => !member.flags.isPrivate && !member.flags.isProtected);
		if (publicMembers.length === 0) continue;

		// Sort by order in code
		publicMembers.sort((a, b) => a.id - b.id);

		switch (group.title) {
			case 'Constructors':
				if (publicMembers.length !== 1) throw Error('publicMembers.length !== 1');
				yield* documentMethod(publicMembers[0], 3, true);
				continue;
			case 'Accessors':
				yield '\n### Accessors';
				for (const member of publicMembers) yield documentAccessor(member);
				continue;
			case 'Properties':
				yield '\n### Properties';
				for (const member of publicMembers) yield documentProperty(member);
				continue;
			case 'Methods':
				for (const member of publicMembers) yield* documentMethod(member, 3);
				continue;
			default:
				console.log(group);
				throw Error('Unknown group title');
		}
	}
}

function* documentMethod(method: DeclarationReflection, depth: number, isConstructor = false): Generator<string> {
	if (method.signatures?.length !== 1) throw Error('should be 1');

	const [signature] = method.signatures;

	const methodName = signature.name;
	const parameters = formatMethodParameters(signature.parameters ?? []);
	const returnType = signature.type;
	const methodType = isConstructor ? 'Constructor' : 'Method';

	yield `\n${'#'.repeat(depth)} ${methodType}: \`${methodName}(${parameters})\``;

	yield* documentSummaryBlock(signature);

	if (signature.parameters && signature.parameters.length > 0) {
		yield '';
		yield '**Parameters:**';
		for (const parameter of signature.parameters) {
			yield documentProperty(parameter);
		}
	}

	if (returnType && !isConstructor) {
		yield `\n**Returns:** <code>${formatTypeDeclaration(returnType)}</code>`;
	}
}

function formatMethodParameters(parameters: ParameterReflection[]): string {
	return parameters.map(param => param.name).join(', ');
}

// Helper Functions
function getDeclarationKindName(kind: ReflectionKind): string {
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
	if (summary != null) line += '  \n    ' + summary;
	return line;
}

function* documentVariable(ref: DeclarationReflection): Generator<string> {
	const prefix = ref.flags.isConst ? 'const' : 'let';
	yield `\n## \`${prefix} ${ref.name}\``;
	const summary = extractSummary(ref.comment);
	if (summary != null) yield summary;
}

function documentAccessor(ref: DeclarationReflection | ParameterReflection): string {
	let line = `  - <code>${ref.name}${resolveTypeDeclaration(ref.type)}</code>`;
	const summary = extractSummary(ref.comment);
	if (summary != null) line += '  \n    ' + summary;
	return line;
}

function extractSummary(comment: Comment | undefined): string | null {
	if (!comment) return null;
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

	const sourceLink = createSourceLink(ref);
	if (sourceLink != null) yield sourceLink;

	return;

	function formatComment(comment: Comment): string {
		let summary = extractSummary(comment) ?? '';
		const link = createSourceLink(ref);
		if (link != null) summary += ' ' + link;
		return summary.replace(/\n/m, '  \n') + '\n';
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
				switch (some.declaration.kind) {
					case ReflectionKind.TypeLiteral: return decodeReflectionTypeLiteral(some.declaration);
					default:
						console.log('declarationKindName', getDeclarationKindName(some.declaration.kind));
						console.dir(some, { depth: 4 });
						throw Error();
				}

			case 'tuple':
				return `[${some.elements.map(getTypeRec).join(', ')}]`;

			case 'union':
				return some.types.map(getTypeRec).join(' | ');

			case 'array':
				return getTypeRec(some.elementType) + '[]';

			default:
				console.log(some);
				throw Error(some.type);
		}

		function decodeReflectionTypeLiteral(ref: DeclarationReflection): string {
			try {
				if (ref.variant !== 'declaration') throw Error();

				if (ref.groups && !ref.signatures) {
					if (!Array.isArray(ref.groups)) throw Error();
					if (ref.groups.length !== 1) throw Error();
					const [group] = ref.groups;
					if (group.title !== 'Properties') throw Error();
					const properties = group.children.map(r => r.escapedName + ':?');
					return `{${properties.join(', ')}}`;
				}

				if (!ref.groups && ref.signatures) {
					if (ref.signatures.length !== 1) throw Error('ref.signatures.length !== 1');
					const [signature] = ref.signatures;
					const returnType = signature.type ? getTypeRec(signature.type) : 'void';
					const parameters = (signature.parameters ?? [])
						.map(p => {
							return p.name + (p.type ? ': ' + getTypeRec(p.type) : '');
						}).join(', ');
					return `(${parameters}) => ${returnType}`;
				}

				throw Error();
			} catch (error) {
				console.dir(ref, { depth: 3 });
				throw error;
			}
		}
	}

}

function createSourceLink(reference: DeclarationReflection | SignatureReflection): string | null {
	if (!reference.sources || reference.sources.length < 1) return null;

	if (reference.sources.length > 1) throw Error('ref.sources.length > 1');
	const [source] = reference.sources;
	return `<sup><a href="${source.url}">[src]</a></sup>`;
}

function createAnchorId(reference: Reflection): string {
	return `${getDeclarationKindName(reference.kind)}_${reference.name}`.toLowerCase();
}
