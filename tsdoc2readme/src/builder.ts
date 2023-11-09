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

const NEW_LINE = '\n';

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

	return Array.from(renderProjectDocumentation(project)).join(NEW_LINE);
}

function* renderProjectDocumentation(project: ProjectReflection): Generator<string> {
	if (!project.groups) {
		throw new Error('No reflection groups found.');
	}

	for (const group of project.groups) {
		for (const declaration of group.children) {
			yield* renderDeclaration(declaration);
		}
	}
}

function* renderDeclaration(declaration: DeclarationReflection): Generator<string> {
	const typeName = resolveTypeName(declaration.kind);
	yield `# ${typeName}: \`${declaration.name}\`<a id="${generateAnchor(declaration)}"></a>`;
	yield* renderSummaryBlock(declaration);

	for (const group of declaration.groups ?? []) {
		const publicMembers = group.children.filter(member => !member.flags.isPrivate);
		if (publicMembers.length === 0) continue;

		// Sort by order in code
		publicMembers.sort((a, b) => a.id - b.id);

		switch (group.title) {
			case 'Constructors':
				if (publicMembers.length !== 1) throw Error();
				yield* renderMethod(publicMembers[0], true);
				continue;
			case 'Properties':
				yield '**Properties**';
				for (const member of publicMembers) yield formatParameter(member);
				continue;
			case 'Methods':
				yield '**Methods**';
				for (const member of publicMembers) yield* renderMethod(member);
				continue;
			default:
				console.log(group);
				throw Error('Unknown group title');
		}
	}

	if (declaration.type) {
		yield `${NEW_LINE}**Type:** ${resolveType(declaration.type)}`;
	}
}

// Helper Functions
function resolveTypeName(kind: ReflectionKind): string {
	switch (kind) {
		case ReflectionKind.Class: return 'Class';
		case ReflectionKind.Interface: return 'Interface';
		case ReflectionKind.TypeAlias: return 'Type';
		default: throw new Error(`Unknown reflection kind: ${kind}`);
	}
}

function* renderMethod(declaration: DeclarationReflection, isConstructor = false): Generator<string> {
	const signature = declaration.signatures?.[0];

	if (!signature) throw new Error('Method signature not found');

	let heading = '## ';
	if (isConstructor) heading += 'constructor: ';
	let functionName = signature.name;
	let returnType = signature.type;
	if ((returnType?.type === 'reference') && (returnType.name === 'Promise')) {
		// is an async function
		if (!returnType.typeArguments) throw Error();
		[returnType] = returnType.typeArguments;
		functionName = 'async ' + functionName;
	}
	heading += `\`${functionName}(${formatMethodParameters(signature.parameters ?? [])})\``;
	yield heading;

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
		yield `**Returns:** ${resolveType(returnType)}`;
	}
}

function formatMethodParameters(parameters: ParameterReflection[]): string {
	return parameters.map(param => param.name).join(', ');
}

function formatParameter(ref: DeclarationReflection | ParameterReflection): string {
	let line = `  - \`${ref.name}\`${resolveTypeDeclaration(ref.type)}`.replace(/``/g, '');
	if (ref.flags.isOptional) line += ' (optional)';
	const summary = extractSummary(ref.comment);
	if (summary ?? '') line += `  ${NEW_LINE}    ` + summary;
	return line;
}

function extractSummary(comment: Comment | undefined): string | undefined {
	if (!comment) return;
	return comment.summary.map(line => line.text).join('');
}

function* renderSummaryBlock(ref: DeclarationReflection | SignatureReflection): Generator<string> {
	yield '';

	let comment: Comment | undefined;
	if (ref.comment) {
		// eslint-disable-next-line @typescript-eslint/prefer-destructuring
		comment = ref.comment;
	} else {
		if (ref.type) {
			// @ts-expect-error I dont think I can handle this
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			comment = ref.type.declaration?.signatures?.[0]?.comment as Comment | undefined;
		}
	}

	if (!comment) {
		yield generateSourceLink(ref);
		return;
	}

	const summary = comment.summary.map(line => line.text).join('') + ' ' + generateSourceLink(ref);
	yield summary.replace(/\n/m, `  ${NEW_LINE}`);
}

function resolveTypeDeclaration(someType: SomeType | undefined): string {
	if (!someType) return '';
	return `\`: \`${resolveType(someType)}`.replace(/``/g, '');
}

function resolveType(someType: SomeType): string {
	return getTypeRec(someType).replace(/``/g, '');

	function getTypeRec(some: SomeType): string {
		switch (some.type) {
			case 'intrinsic':
				return `\`${some.name}\``;
			case 'literal':
				return `\`${JSON.stringify(some.value)}\``;
			case 'reference':
				let result = `\`${some.name}\``;
				if (some.reflection) result = `[${result}](#${generateAnchor(some.reflection)})`;
				if (some.typeArguments?.length ?? 0) result += '`<`'
					+ (some.typeArguments ?? [])
						.map(getTypeRec).join('\`,\`')
					+ '`>`';
				return result;
			case 'reflection':
				if (!some.declaration.signatures) throw Error();
				if (some.declaration.signatures.length !== 1) throw Error();
				const [signature] = some.declaration.signatures;
				const type = signature.type ? getTypeRec(signature.type) : 'void';
				const parameters = (signature.parameters ?? [])
					.map(p => {
						return `\`${p.name}\`${p.type ? '`: `' + getTypeRec(p.type) : ''}`;
					}).join('`, `');
				return `\`(\`${parameters}\`) => \`${type}`;
			case 'tuple':
				return `\`[\`${some.elements.map(getTypeRec).join('`, `')}\`]\``;
			case 'union':
				return some.types.map(getTypeRec).join('\` | \`');
			default:
				console.log(some);
				throw Error();
		}
	}
}

function generateSourceLink(ref: DeclarationReflection | SignatureReflection): string {
	if (!ref.sources || ref.sources.length < 1) return '';

	if (ref.sources.length > 1) throw Error();
	const [source] = ref.sources;
	return `<sup><a href="${source.url}">[src]</a></sup>`;
}

function generateAnchor(ref: DeclarationReflection | Reflection): string {
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
