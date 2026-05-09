/* oxlint-disable no-null */

type StringMode = 'single' | 'double' | null

interface NestingState {
  depthAngle: number
  depthParen: number
  depthBrace: number
  depthBracket: number
  inString: StringMode
}

function createNestingState(): NestingState {
  return {
    depthAngle: 0,
    depthParen: 0,
    depthBrace: 0,
    depthBracket: 0,
    inString: null,
  }
}

function getStringStart(char: string): Exclude<StringMode, null> | null {
  if (char === "'") {
    return 'single'
  }
  if (char === '"') {
    return 'double'
  }
  return null
}

function updateStringState(
  state: NestingState,
  char: string,
  prev: string,
): boolean {
  if (!state.inString) {
    const start = getStringStart(char)
    if (!start) {
      return false
    }
    state.inString = start
    return true
  }

  if (
    (state.inString === 'single' && char === "'" && prev !== '\\') ||
    (state.inString === 'double' && char === '"' && prev !== '\\')
  ) {
    state.inString = null
  }

  return true
}

function adjustDepth(value: number, delta: number): number {
  return Math.max(0, value + delta)
}

function updateNestingDepth(state: NestingState, char: string): void {
  if (char === '<') {
    state.depthAngle += 1
    return
  }
  if (char === '>') {
    state.depthAngle = adjustDepth(state.depthAngle, -1)
    return
  }
  if (char === '(') {
    state.depthParen += 1
    return
  }
  if (char === ')') {
    state.depthParen = adjustDepth(state.depthParen, -1)
    return
  }
  if (char === '{') {
    state.depthBrace += 1
    return
  }
  if (char === '}') {
    state.depthBrace = adjustDepth(state.depthBrace, -1)
    return
  }
  if (char === '[') {
    state.depthBracket += 1
    return
  }
  if (char === ']') {
    state.depthBracket = adjustDepth(state.depthBracket, -1)
  }
}

function isTopLevel(state: NestingState): boolean {
  return (
    state.depthAngle === 0 &&
    state.depthParen === 0 &&
    state.depthBrace === 0 &&
    state.depthBracket === 0
  )
}

function pushPart(parts: string[], value: string): void {
  const trimmed = value.trim()
  if (trimmed) {
    parts.push(trimmed)
  }
}

/**
 * Splits a string by a delimiter while keeping nested generic/tuple/map sections intact.
 * @param input Source text to split.
 * @param delimiter Delimiter character at top-level nesting only.
 * @returns Trimmed parts split at top-level delimiter occurrences.
 */
export function splitTopLevel(input: string, delimiter: string): string[] {
  const parts: string[] = []
  const state = createNestingState()
  let current = ''

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? ''
    const prev = input[index - 1] ?? ''

    const touchedString = updateStringState(state, char, prev)
    current += char
    if (touchedString) {
      continue
    }

    updateNestingDepth(state, char)
    if (char !== delimiter || !isTopLevel(state)) {
      continue
    }

    pushPart(parts, current.slice(0, -1))
    current = ''
  }

  pushPart(parts, current)
  return parts
}

/**
 * Unescapes a Rust string literal body into normal JS text.
 * @param input Raw Rust string-literal body.
 * @returns Unescaped JavaScript string.
 */
export function unescapeRustStringLiteral(input: string): string {
  return input
    .replaceAll(String.raw`\"`, '"')
    .replaceAll(String.raw`\\`, '\\')
    .replaceAll(String.raw`\n`, '\n')
    .replaceAll(String.raw`\r`, '\r')
    .replaceAll(String.raw`\t`, '\t')
}

/**
 * Extracts a serde string-like attribute value, e.g. `rename = "foo"`.
 * @param attrs Attribute snippet text.
 * @param name Attribute key to extract.
 * @returns Decoded attribute value or null when not found.
 */
export function extractSerdeStringAttr(
  attrs: string,
  name: string,
): string | null {
  let searchFrom = 0

  while (searchFrom < attrs.length) {
    const nameIndex = attrs.indexOf(name, searchFrom)
    if (nameIndex === -1) {
      return null
    }

    const equalIndex = attrs.indexOf('=', nameIndex + name.length)
    if (equalIndex === -1) {
      return null
    }

    let quoteIndex = equalIndex + 1
    while (quoteIndex < attrs.length && /\s/u.test(attrs[quoteIndex] ?? '')) {
      quoteIndex += 1
    }

    if (attrs[quoteIndex] !== '"') {
      searchFrom = nameIndex + name.length
      continue
    }

    let value = ''
    let escaped = false
    for (let index = quoteIndex + 1; index < attrs.length; index += 1) {
      const char = attrs[index]
      if (escaped) {
        value += `\\${char}`
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') {
        return unescapeRustStringLiteral(value)
      }
      value += char
    }

    return null
  }

  return null
}

/**
 * Reads `rename_all` from serde attributes.
 * @param attrs Attribute snippet text.
 * @returns rename_all strategy name or null.
 */
export function extractRenameAll(attrs: string): string | null {
  return extractSerdeStringAttr(attrs, 'rename_all')
}

/**
 * Reads `rename` from serde attributes with a permissive fallback parser.
 * @param attrs Attribute snippet text.
 * @returns Explicit rename value or null when missing.
 */
export function extractRename(attrs: string): string | null {
  const direct = extractSerdeStringAttr(attrs, 'rename')
  if (direct && !direct.endsWith('\\')) {
    return direct
  }

  const fallback = attrs.match(/rename\s*=\s*"([\s\S]*)"/u)
  if (fallback?.[1]) {
    return unescapeRustStringLiteral(fallback[1])
  }

  return direct
}

/**
 * Applies serde `rename_all` policy for known naming styles.
 * @param input Original field or variant name.
 * @param rule rename_all rule name.
 * @returns Serialized name after rule normalization.
 */
export function applyRenameAll(input: string, rule: string | null): string {
  if (!rule) {
    return input
  }

  if (rule === 'kebab-case') {
    return input
      .replaceAll(/([a-z0-9])([A-Z])/gu, '$1-$2')
      .replaceAll('_', '-')
      .toLowerCase()
  }

  if (rule === 'snake_case') {
    return input
      .replaceAll(/([a-z0-9])([A-Z])/gu, '$1_$2')
      .replaceAll('-', '_')
      .toLowerCase()
  }

  if (rule === 'camelCase') {
    const lowerSnake = input
      .replaceAll(/([a-z0-9])([A-Z])/gu, '$1_$2')
      .replaceAll('-', '_')
      .toLowerCase()
    const parts = lowerSnake.split('_')
    return parts
      .map((part, index) => {
        if (index === 0) {
          return part
        }
        return `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`
      })
      .join('')
  }

  return input
}

/**
 * Normalizes Rust type text for simpler matching.
 * @param typeText Raw Rust type text.
 * @returns Type text normalized for parser matching.
 */
export function cleanupRustType(typeText: string): string {
  return typeText
    .replaceAll(/\s+/gu, ' ')
    .replaceAll(/\bpub\b\s*/gu, '')
    .replaceAll(/\s+>/gu, '>')
    .replaceAll(/<\s+/gu, '<')
    .trim()
}

/**
 * Splits generic argument list from a generic Rust type expression.
 * @param typeText Generic Rust type expression.
 * @returns Top-level generic argument list.
 */
export function splitGenericArguments(typeText: string): string[] {
  const start = typeText.indexOf('<')
  const end = typeText.lastIndexOf('>')
  if (start === -1 || end <= start) {
    return []
  }
  const inner = typeText.slice(start + 1, end)
  return splitTopLevel(inner, ',')
}

/**
 * Unwraps wrappers like `Option<T>` or `Vec<T>`, returning the inner type text.
 * @param typeText Raw Rust type text.
 * @param wrapper Wrapper type name to match.
 * @returns Wrapped inner type text, or null when wrapper does not match.
 */
export function unwrapTypeWrapper(
  typeText: string,
  wrapper: string,
): string | null {
  const normalized = cleanupRustType(typeText)
  const match = normalized.match(
    new RegExp(`^${wrapper}\\s*<([\\s\\S]+)>$`, 'u'),
  )
  if (!match?.[1]) {
    return null
  }
  return match[1].trim()
}

/**
 * Removes Rust doc comments from multiline snippets.
 * @param text Multiline Rust snippet.
 * @returns Text with line doc comments removed.
 */
export function stripDocCommentLines(text: string): string {
  return text
    .split('\n')
    .filter(line => {
      const trimmed = line.trimStart()
      return !trimmed.startsWith('///') && !trimmed.startsWith('//!')
    })
    .join('\n')
}

/**
 * Splits a member fragment into attributes and code body text.
 * @param segment One struct/enum member snippet.
 * @returns Attributes text and normalized body fragment.
 */
export function stripAttrsAndDoc(segment: string): {
  attrs: string
  rest: string
} {
  const lines = segment
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const attrs: string[] = []
  const body: string[] = []

  for (const line of lines) {
    if (line.startsWith('///') || line.startsWith('//')) {
      continue
    }
    if (line.startsWith('#[')) {
      attrs.push(line)
      continue
    }
    body.push(line)
  }

  return {
    attrs: attrs.join(' '),
    rest: body.join(' '),
  }
}
