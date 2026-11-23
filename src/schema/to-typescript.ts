/**
 * Generates TypeScript interfaces and type definitions from JSON values.
 */

export interface TypeScriptGenOptions {
  rootName?: string;
  exportTypes?: boolean;
  useTypeAlias?: boolean;
}

function toPascalCase(str: string): string {
  // Strip non-alphanumeric chars at start
  const cleaned = str.replace(/[^a-zA-Z0-9]/g, ' ');
  const words = cleaned.trim().split(/\s+/);
  if (words.length === 0 || words[0] === '') return 'Anonymous';
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function singularize(name: string): string {
  if (name.endsWith('ies')) {
    return name.slice(0, -3) + 'y';
  }
  if (name.endsWith('es') && (name.endsWith('shes') || name.endsWith('ches') || name.endsWith('sses') || name.endsWith('xes'))) {
    return name.slice(0, -2);
  }
  if (name.endsWith('s') && !name.endsWith('ss')) {
    return name.slice(0, -1);
  }
  return name;
}

function isValidIdentifier(key: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

function quoteKey(key: string): string {
  return isValidIdentifier(key) ? key : JSON.stringify(key);
}

export function jsonToTypeScript(
  value: unknown,
  options: TypeScriptGenOptions = {}
): string {
  const rootName = options.rootName ? toPascalCase(options.rootName) : 'Root';
  const isExport = options.exportTypes !== false;
  const useTypeAlias = Boolean(options.useTypeAlias);
  const prefix = isExport ? 'export ' : '';

  const definitions = new Map<string, string>();
  const nameCounts = new Map<string, number>();

  function getUniqueTypeName(baseName: string): string {
    const pascal = toPascalCase(baseName);
    const count = nameCounts.get(pascal) || 0;
    nameCounts.set(pascal, count + 1);
    return count === 0 ? pascal : `${pascal}${count + 1}`;
  }

  function inferType(val: unknown, typeHintName: string): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';

    const t = typeof val;
    if (t === 'string') return 'string';
    if (t === 'number') return 'number';
    if (t === 'boolean') return 'boolean';

    if (Array.isArray(val)) {
      if (val.length === 0) return 'unknown[]';

      const elementTypes = new Set<string>();
      const singularName = singularize(typeHintName);

      for (const item of val) {
        elementTypes.add(inferType(item, singularName));
      }

      const typesArray = Array.from(elementTypes);
      if (typesArray.length === 1) {
        const single = typesArray[0];
        return single.includes('|') ? `(${single})[]` : `${single}[]`;
      }
      return `(${typesArray.join(' | ')})[]`;
    }

    if (t === 'object') {
      const obj = val as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length === 0) return 'Record<string, unknown>';

      const typeName = getUniqueTypeName(typeHintName);
      const lines: string[] = [];

      for (const [k, v] of Object.entries(obj)) {
        const propType = inferType(v, k);
        const qKey = quoteKey(k);
        lines.push(`  ${qKey}: ${propType};`);
      }

      if (useTypeAlias) {
        const body = `{\n${lines.join('\n')}\n}`;
        definitions.set(typeName, `${prefix}type ${typeName} = ${body};`);
      } else {
        const body = `{\n${lines.join('\n')}\n}`;
        definitions.set(typeName, `${prefix}interface ${typeName} ${body}`);
      }

      return typeName;
    }

    return 'unknown';
  }

  const rootType = inferType(value, rootName);

  // If root was an object, it was registered in definitions under rootName
  // If root was an array of objects or primitive, create an alias for root
  if (!definitions.has(rootName)) {
    const decl = useTypeAlias
      ? `${prefix}type ${rootName} = ${rootType};`
      : `${prefix}type ${rootName} = ${rootType};`;
    definitions.set(rootName, decl);
  }

  // Put root at the top, then dependencies
  const output: string[] = [];
  const rootDef = definitions.get(rootName);
  if (rootDef) {
    output.push(rootDef);
  }

  for (const [name, def] of definitions) {
    if (name !== rootName) {
      output.push(def);
    }
  }

  return output.join('\n\n');
}
