import {
	Application,
	Comment,
	DeclarationReflection,
	ParameterReflection,
	ProjectReflection,
	Reflection,
	ReflectionKind,
	SignatureReflection,
	SomeType
} from 'typedoc';



const NEW_LINE = '\n';


/**
 * build a markdown documentation from typescript files
 * @param entryPoints - array of absolute typescript filenames
 * @param tsconfig - absolute filename of the tsconfig.json
 */
export async function buildDoc(entryPoints: string[], tsconfig: string): Promise<string> {
	const app = await Application.bootstrap({ entryPoints, tsconfig });
	const project = await app.convert();
 
	if (!project) {
	  throw new Error('Failed to convert project.');
	}
 
	return Array.from(generateDocument(project)).join(NEW_LINE);
 }
 
 // Generate Markdown documentation for a project
 function* generateDocument(project: ProjectReflection): Generator<string> {
	if (!project.groups) {
	  throw new Error('No reflection groups found.');
	}
 
	for (const group of project.groups) {
	  for (const declaration of group.children) {
		 yield* generateDeclaration(declaration);
	  }
	}
 }

function* generateDeclaration(ref: DeclarationReflection): Generator<string> {
	const typeName = getTypeName(ref.kind);
	yield `# ${typeName}: \`${ref.name}\`<a id="${getAnchor(ref)}"></a>`;
	yield* generateSummaryBlock(ref);

	for (let group of ref.groups || []) {
		const nonPrivateChildren = group.children.filter(c => !c.flags.isPrivate);
		if (nonPrivateChildren.length === 0) continue;

		// sort by order in code
		nonPrivateChildren.sort((a, b) => a.id - b.id);

		switch (group.title) {
			case 'Constructors':
				if (nonPrivateChildren.length !== 1) throw Error()
				yield* generateMethod(nonPrivateChildren[0], true);
				continue;
			case 'Properties':
				yield '**Properties**'
				for (let child of nonPrivateChildren) yield getParameter(child);
				continue;
			case 'Methods':
				yield '**Methods**'
				for (let child of nonPrivateChildren) yield* generateMethod(child);
				continue;
			default:
				console.log(group);
				throw Error();
		}
	}

	if (ref.type) {
		yield `${NEW_LINE}**Type:** ${getType(ref.type)}`;
	}
}

function getTypeName(kind: ReflectionKind): string {
	switch (kind) {
		case ReflectionKind.Class: return 'Class';
		case ReflectionKind.Interface: return 'Interface';
		case ReflectionKind.TypeAlias: return 'Type';
		default: throw new Error(`Unknown reflection kind: ${kind}`);
	}
}

function* generateMethod(ref: DeclarationReflection, isConstructor: boolean = false): Generator<string> {
	if (!ref.signatures) throw Error();
	if (ref.signatures.length !== 1) throw Error();
	const sig = ref.signatures[0];

	// make heading
	let heading = '## ';
	if (isConstructor) heading += 'constructor: ';
	let name = sig.name;
	let returnType = sig.type;
	if ((returnType?.type === 'reference') && (returnType?.name === 'Promise')) {
		// is an async function
		if (!returnType.typeArguments) throw Error();
		returnType = returnType.typeArguments[0];
		name = 'async ' + name;
	}
	heading += `\`${name}(${getParameters(sig.parameters || [])})\``;
	yield heading;

	yield ''
	yield* generateSummaryBlock(sig);

	if (sig.parameters && sig.parameters.length > 0) {
		yield '';
		yield `**Parameters:**`;
		for (let parameter of sig.parameters) {
			yield getParameter(parameter);
		}
	}

	if (returnType) {
		yield '';
		yield `**Returns:** ${getType(returnType)} `;
	}
}

function getParameter(ref: DeclarationReflection | ParameterReflection) {
	let line = `  - \`${ref.name}\`${getTypeDeclaration(ref.type)}`.replace(/``/g, '');
	if (ref.flags.isOptional) line += ' (optional)';
	let summary = getSummary(ref.comment);
	if (summary) line += `  ${NEW_LINE}    ` + summary;
	return line;
}

function getSummary(comment: Comment | undefined): string | undefined {
	if (!comment) return;
	let lines = comment.summary;
	return lines.map(l => l.text).join('');
}

function* generateSummaryBlock(ref: DeclarationReflection | SignatureReflection): Generator<string> {
	yield ''
	let comment = ref.comment;
	if (!comment) {
		let temp: any = ref.type;
		comment = temp?.declaration?.signatures[0].comment
	}
	if (!comment) {
		yield getSourceLink(ref)
		return;
	}
	const lines = comment.summary;
	const line = lines.map(l => l.text).join('') + ' ' + getSourceLink(ref);
	yield line.replace(/\n/m, `  ${NEW_LINE}`);
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
						let type = p.type ? '`: `' + getType(p.type) : '';
						return `\`${p.name}\`${type}`
					}).join('`, `')
				return `\`(\`${parameters}\`) => \`${type}`;
			case 'tuple':
				return `\`[\`${someType.elements.map(getTypeRec).join('`, `')}\`]\``;
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
	return `${typeName}_${ref.name}`.toLowerCase();
}
