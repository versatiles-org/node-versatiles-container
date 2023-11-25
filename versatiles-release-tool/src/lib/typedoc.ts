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
 * @param entryPoints - Array of absolute TypeScript file paths.
 * @param tsconfig - Absolute file path of tsconfig.json.
 */
export async function generateMarkdownDocumentation(entryPoints: string[], tsconfig: string): Promise<string> {
	const app = await Application.bootstrap({ entryPoints, tsconfig });
	const project = await app.convert();

	if (!project) {
		throw new Error('Failed to convert project.');
	}

	return Array.from(renderProjectDocumentation(project)).join('\n');
}

function* renderProjectDocumentation(project: ProjectReflection): Generator<string> {
	if (!project.groups) {
		throw new Error('No code to document found! Is this a lib?');
	}

	for (const group of project.groups) {
		for (const declaration of group.children) {
			yield* renderDeclaration(declaration);
		}
	}
}

function* renderDeclaration(declaration: DeclarationReflection): Generator<string> {
	const typeName = formatTypeName(declaration.kind);
	yield `# ${typeName}: \`${declaration.name}\`<a id="${generateAnchor(declaration)}"></a>`;
	yield* renderSummaryBlock(declaration);

	for (const group of declaration.groups ?? []) {
		const publicMembers = group.children.filter(member => !member.flags.isPrivate && !member.flags.isProtected);
		if (publicMembers.length === 0) continue;

		// Sort by order in code
		publicMembers.sort((a, b) => a.id - b.id);

		switch (group.title) {
			case 'Constructors':
				if (publicMembers.length !== 1) throw Error('publicMembers.length !== 1');
				yield* renderMethod(publicMembers[0], true);
				continue;
			case 'Properties':
				//yield '';
				//yield '**Properties**';
				for (const member of publicMembers) yield formatParameter(member);
				continue;
			case 'Methods':
				//yield '';
				//yield '**Methods**';
				for (const member of publicMembers) yield* renderMethod(member);
				continue;
			default:
				console.log(group);
				throw Error('Unknown group title');
		}
	}

	if (declaration.type) {
		yield `\n**Type:** <code>${formatType(declaration.type)}</code>`;
	}
}

function* renderMethod(declaration: DeclarationReflection, isConstructor = false): Generator<string> {
	if (declaration.signatures?.length !== 1) throw Error('should be 1');

	const [signature] = declaration.signatures;

	const functionName = signature.name;
	const parameters = formatMethodParameters(signature.parameters ?? []);
	const returnType = signature.type;

	const prefix = isConstructor ? 'Constructor' : 'Method';

	yield `## ${prefix}: \`${functionName}(${parameters})\``;

	yield '';
	yield* renderSummaryBlock(signature);

	if (signature.parameters && signature.parameters.length > 0) {
		yield '';
		yield '**Parameters:**';
		for (const parameter of signature.parameters) {
			yield formatParameter(parameter);
		}
	}

	if (returnType) {
		yield '';
		yield `**Returns:** <code>${formatType(returnType)}</code>`;
	}
}

function formatMethodParameters(parameters: ParameterReflection[]): string {
	return parameters.map(param => param.name).join(', ');
}

// Helper Functions
function formatTypeName(kind: ReflectionKind): string {
	switch (kind) {
		case ReflectionKind.Class: return 'Class';
		case ReflectionKind.Interface: return 'Interface';
		case ReflectionKind.TypeAlias: return 'Type';
		default: throw new Error(`Unknown reflection kind: ${kind}`);
	}
}

function formatParameter(ref: DeclarationReflection | ParameterReflection): string {
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

function* renderSummaryBlock(ref: DeclarationReflection | SignatureReflection): Generator<string> {
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

	yield generateSourceLink(ref) + '\n';
	return;

	function formatComment(comment: Comment): string {
		return (extractSummary(comment) + ' ' + generateSourceLink(ref)).replace(/\n/m, '  \n') + '\n';
	}
}

function resolveTypeDeclaration(someType: SomeType | undefined): string {
	if (!someType) return '';
	return `: ${formatType(someType)}`;
}

function formatType(someType: SomeType): string {
	return getTypeRec(someType);

	function getTypeRec(some: SomeType): string {
		switch (some.type) {
			case 'intrinsic':
				return some.name;

			case 'literal':
				return JSON.stringify(some.value);

			case 'reference':
				let result = some.name;
				if (some.reflection) result = `[${result}](#${generateAnchor(some.reflection)})`;
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

function generateSourceLink(ref: DeclarationReflection | SignatureReflection): string {
	if (!ref.sources || ref.sources.length < 1) return '';

	if (ref.sources.length > 1) throw Error('ref.sources.length > 1');
	const [source] = ref.sources;
	return `<sup><a href="${source.url}">[src]</a></sup>`;
}

function generateAnchor(ref: Reflection): string {
	let typeName;
	switch (ref.kind) {
		case ReflectionKind.Class: typeName = 'class'; break;
		case ReflectionKind.Interface: typeName = 'interface'; break;
		case ReflectionKind.TypeAlias: typeName = 'type'; break;
		default:
			console.log(ref);
			throw new Error('Unknown reflection kind');
	}
	return `${typeName}_${ref.name}`.toLowerCase();
}
