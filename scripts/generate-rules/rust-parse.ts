/* oxlint-disable no-null, complexity, max-statements */

import {
  applyRenameAll,
  cleanupRustType,
  extractRename,
  extractRenameAll,
  splitGenericArguments,
  splitTopLevel,
  stripAttrsAndDoc,
  stripDocCommentLines,
  unwrapTypeWrapper,
} from './rust-utils'
import type { RustDefinition, RustTypeContext } from './types'

type RustTypeToTsFn = (typeText: string, ctx: RustTypeContext) => string

let rustTypeToTsImpl: RustTypeToTsFn = () => 'unknown'

/**
 * Parses top-level Rust struct/enum definitions from source text.
 * @param source Rust source text.
 * @returns Map of definition name to parsed Rust declaration metadata.
 */
export function parseRustDefinitions(
  source: string,
): Map<string, RustDefinition> {
  const definitions = new Map<string, RustDefinition>()
  const defRegex =
    /(?<attrs>(?:\s*#\[[^\]]+\]\s*)*)(?:(?:pub(?:\([^)]*\))?)\s+)?(?<kind>struct|enum)\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)[^;{(]*?(?<open>[{(;])/gmu

  for (const match of source.matchAll(defRegex)) {
    const groups = match.groups
    const kind = groups?.['kind'] as 'enum' | 'struct' | undefined
    const name = groups?.['name']
    const open = groups?.['open']
    const attrs = (groups?.['attrs'] ?? '').trim()
    const start = match.index ?? 0
    const matchText = match[0] ?? ''
    const openOffset = open ? matchText.lastIndexOf(open) : -1
    const openIndex = openOffset >= 0 ? start + openOffset : -1

    if (!kind || !name || !open || openIndex < 0) {
      continue
    }

    if (open === ';') {
      definitions.set(name, {
        attrs,
        body: '',
        kind,
        shape: 'unit',
      })
      continue
    }

    const closeChar = open === '{' ? '}' : ')'
    let depth = 0
    let end = -1
    for (let index = openIndex; index < source.length; index += 1) {
      const char = source[index]
      if (char === open) {
        depth += 1
      } else if (char === closeChar) {
        depth -= 1
        if (depth === 0) {
          end = index
          break
        }
      }
    }

    if (end < 0) {
      continue
    }

    definitions.set(name, {
      attrs,
      body: source.slice(openIndex + 1, end),
      kind,
      shape: open === '{' ? 'braced' : 'tuple',
    })
  }

  return definitions
}

/**
 * Parses Rust `type Foo = Bar` aliases for later type resolution.
 * @param source Rust source text.
 * @returns Map of alias name to aliased Rust type text.
 */
export function parseRustTypeAliases(source: string): Map<string, string> {
  const aliases = new Map<string, string>()
  const aliasRegex =
    /(?:(?:pub(?:\([^)]*\))?)\s+)?type\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*<[^>]+>)?\s*=\s*([^;]+);/gmu

  for (const match of source.matchAll(aliasRegex)) {
    const full = match[0] ?? ''
    const aliasName = match[1]?.trim()
    const aliasValue = match[2]?.trim()
    if (!aliasName || !aliasValue) {
      continue
    }
    if (/type\s+[A-Za-z_][A-Za-z0-9_]*\s*</u.test(full)) {
      continue
    }
    aliases.set(aliasName, aliasValue)
  }

  return aliases
}

function parseEnumUnitVariants(definition: RustDefinition): {
  renameAll: string | null
  values: string[]
} {
  const renameAll = extractRenameAll(definition.attrs)
  if (definition.shape !== 'braced') {
    return { renameAll, values: [] }
  }

  const segments = splitTopLevel(stripDocCommentLines(definition.body), ',')
  const values: string[] = []

  for (const segment of segments) {
    const { attrs, rest } = stripAttrsAndDoc(segment)
    const variantMatch = rest.match(/^(?:pub\s+)?([A-Za-z_][A-Za-z0-9_]*)$/u)
    if (!variantMatch?.[1]) {
      continue
    }

    const variantName = variantMatch[1]
    const renamed = extractRename(attrs)
    values.push(renamed ?? applyRenameAll(variantName, renameAll))
  }

  return { renameAll, values }
}

function convertStructToTs(
  definition: RustDefinition,
  ctx: RustTypeContext,
): string {
  if (definition.shape === 'tuple') {
    const parts = splitTopLevel(definition.body, ',')
      .map(segment => stripAttrsAndDoc(segment).rest)
      .filter(Boolean)
    if (parts.length === 0) {
      return 'never'
    }
    if (parts.length === 1 && parts[0]) {
      return rustTypeToTsImpl(parts[0], ctx)
    }
    const tuple = parts.map(part => rustTypeToTsImpl(part, ctx)).join(', ')
    return `readonly [${tuple}]`
  }

  if (definition.shape !== 'braced') {
    return 'unknown'
  }

  const renameAll = extractRenameAll(definition.attrs)
  const segments = splitTopLevel(stripDocCommentLines(definition.body), ',')
  const props: string[] = []

  for (const segment of segments) {
    const { attrs, rest } = stripAttrsAndDoc(segment)
    if (!rest) {
      continue
    }
    const fieldMatch = rest.match(
      /^(?:(?:pub(?:\([^)]*\))?)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([\s\S]+)$/u,
    )
    if (!fieldMatch?.[1] || !fieldMatch[2]) {
      continue
    }

    const fieldName = fieldMatch[1]
    const fieldTypeText = cleanupRustType(fieldMatch[2])
    const optionInner = unwrapTypeWrapper(fieldTypeText, 'Option')
    const tsType = rustTypeToTsImpl(optionInner ?? fieldTypeText, ctx)
    const serializedName =
      extractRename(attrs) ?? applyRenameAll(fieldName, renameAll)

    props.push(`  ${JSON.stringify(serializedName)}?: ${tsType}`)
  }

  if (props.length === 0) {
    return 'never'
  }

  return `{
${props.join('\n')}
}`
}

function convertEnumToTs(definition: RustDefinition): string {
  const variants = parseEnumUnitVariants(definition)
  if (variants.values.length === 0) {
    return 'unknown'
  }
  return variants.values.map(value => JSON.stringify(value)).join(' | ')
}

function convertDefinitionToTs(
  definition: RustDefinition,
  ctx: RustTypeContext,
): string {
  if (definition.kind === 'enum') {
    return convertEnumToTs(definition)
  }
  if (definition.kind === 'struct') {
    return convertStructToTs(definition, ctx)
  }
  return 'unknown'
}

function resolveNamedType(
  typeName: string,
  ctx: RustTypeContext,
): string | null {
  const cached = ctx.cache.get(typeName)
  if (cached) {
    return cached
  }

  if (ctx.visiting.has(typeName)) {
    return 'unknown'
  }

  const definition = ctx.definitions.get(typeName)
  if (!definition) {
    const alias = ctx.typeAliases.get(typeName)
    if (alias) {
      const resolvedAlias = rustTypeToTsImpl(alias, ctx)
      ctx.cache.set(typeName, resolvedAlias)
      return resolvedAlias
    }
    return null
  }

  ctx.visiting.add(typeName)
  const resolved = convertDefinitionToTs(definition, ctx)
  ctx.visiting.delete(typeName)
  ctx.cache.set(typeName, resolved)
  return resolved
}

/**
 * Converts a Rust type expression into a TypeScript type expression.
 * @param typeText Rust type expression.
 * @param ctx Shared conversion context with parsed definitions and cache.
 * @returns Converted TypeScript type expression.
 */
export function rustTypeToTs(typeText: string, ctx: RustTypeContext): string {
  const normalized = cleanupRustType(typeText)
    .replaceAll(/\bself::/gu, '')
    .replaceAll(/\bcrate::[A-Za-z0-9_:]+::/gu, '')

  if (!normalized) {
    return 'unknown'
  }

  if (normalized === 'bool') {
    return 'boolean'
  }
  if (normalized === 'String' || normalized === '&str') {
    return 'string'
  }
  if (normalized === 'Regex') {
    return 'string'
  }
  if (
    /^(u|i)(8|16|32|64|128|size)$/u.test(normalized) ||
    /^(f32|f64)$/u.test(normalized)
  ) {
    return 'number'
  }
  if (normalized.includes('serde_json::Value')) {
    return 'unknown'
  }

  const optionInner = unwrapTypeWrapper(normalized, 'Option')
  if (optionInner) {
    return rustTypeToTsImpl(optionInner, ctx)
  }

  const boxInner = unwrapTypeWrapper(normalized, 'Box')
  if (boxInner) {
    return rustTypeToTsImpl(boxInner, ctx)
  }

  const vecInner = unwrapTypeWrapper(normalized, 'Vec')
  if (vecInner) {
    return `readonly (${rustTypeToTsImpl(vecInner, ctx)})[]`
  }

  if (/^(HashMap|BTreeMap)\s*</u.test(normalized)) {
    const args = splitGenericArguments(normalized)
    const valueType = args[1] ? rustTypeToTsImpl(args[1], ctx) : 'unknown'
    return `Record<string, ${valueType}>`
  }

  if (
    /^(Cow|CompactStr)\s*</u.test(normalized) ||
    normalized === 'CompactStr'
  ) {
    return 'string'
  }

  if (normalized.startsWith('(') && normalized.endsWith(')')) {
    const inner = normalized.slice(1, -1).trim()
    if (!inner) {
      return 'never'
    }
    const parts = splitTopLevel(inner, ',').map(part =>
      rustTypeToTsImpl(part, ctx),
    )
    return `readonly [${parts.join(', ')}]`
  }

  const arrayMatch = normalized.match(/^\[([\s\S]+);\s*\d+\]$/u)
  if (arrayMatch?.[1]) {
    return `readonly (${rustTypeToTsImpl(arrayMatch[1], ctx)})[]`
  }

  const simpleName = normalized
    .replaceAll(/\s+/gu, '')
    .split('::')
    .at(-1)
    ?.replace(/<.*$/u, '')

  if (simpleName === 'str') {
    return 'string'
  }

  const resolved = simpleName ? resolveNamedType(simpleName, ctx) : null
  return resolved ?? 'unknown'
}

rustTypeToTsImpl = rustTypeToTs

/**
 * Extracts the config type name from a `declare_oxc_lint!` macro call.
 * @param source Rust source text.
 * @returns Config type name, or null when not declared.
 */
export function extractConfigTypeName(source: string): string | null {
  const match = source.match(
    /declare_oxc_lint!\([\s\S]*?config\s*=\s*([A-Za-z_][A-Za-z0-9_:]*)/u,
  )
  const configPath = match?.[1]
  if (!configPath) {
    return null
  }
  return configPath.split('::').at(-1) ?? null
}

/**
 * Parses TypeScript option type from one or more Rust source chunks.
 * @param mainSource Main rule Rust source text.
 * @param extraSources Additional sibling Rust source texts.
 * @returns Parsed TypeScript option type, or `never` when unavailable.
 */
export function parseRuleOptionsTypeFromRust(
  mainSource: string,
  extraSources: string[] = [],
): string {
  const configTypeName = extractConfigTypeName(mainSource)
  if (!configTypeName) {
    return 'never'
  }

  const sources = [mainSource, ...extraSources]
  const definitions = new Map<string, RustDefinition>()
  const typeAliases = new Map<string, string>()

  for (const source of sources) {
    for (const [name, definition] of parseRustDefinitions(source)) {
      definitions.set(name, definition)
    }
    for (const [name, alias] of parseRustTypeAliases(source)) {
      typeAliases.set(name, alias)
    }
  }

  const ctx: RustTypeContext = {
    cache: new Map<string, string>(),
    definitions,
    typeAliases,
    visiting: new Set<string>(),
  }

  const resolved = resolveNamedType(configTypeName, ctx)
  return resolved ?? 'unknown'
}
