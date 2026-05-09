/* oxlint-disable import/no-nodejs-modules, no-async-await, no-await-in-loop, no-optional-chaining, no-null, no-ternary, no-undefined, sort-keys, require-unicode-regexp, no-magic-numbers, jsdoc/require-param, jsdoc/require-returns, complexity, max-statements */

/**
 * Splits a string by a delimiter while keeping nested generic/tuple/map sections intact.
 */
export function splitTopLevel(input: string, delimiter: string): string[] {
  const parts: string[] = []
  let current = ''
  let depthAngle = 0
  let depthParen = 0
  let depthBrace = 0
  let depthBracket = 0
  let inString: 'single' | 'double' | null = null

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const prev = input[index - 1]

    if (inString) {
      current += char
      if (
        (inString === 'single' && char === "'" && prev !== '\\') ||
        (inString === 'double' && char === '"' && prev !== '\\')
      ) {
        inString = null
      }
      continue
    }

    if (char === "'") {
      inString = 'single'
      current += char
      continue
    }
    if (char === '"') {
      inString = 'double'
      current += char
      continue
    }

    if (char === '<') {
      depthAngle += 1
    } else if (char === '>') {
      depthAngle = Math.max(0, depthAngle - 1)
    } else if (char === '(') {
      depthParen += 1
    } else if (char === ')') {
      depthParen = Math.max(0, depthParen - 1)
    } else if (char === '{') {
      depthBrace += 1
    } else if (char === '}') {
      depthBrace = Math.max(0, depthBrace - 1)
    } else if (char === '[') {
      depthBracket += 1
    } else if (char === ']') {
      depthBracket = Math.max(0, depthBracket - 1)
    }

    if (
      char === delimiter &&
      depthAngle === 0 &&
      depthParen === 0 &&
      depthBrace === 0 &&
      depthBracket === 0
    ) {
      const part = current.trim()
      if (part) {
        parts.push(part)
      }
      current = ''
      continue
    }

    current += char
  }

  const rest = current.trim()
  if (rest) {
    parts.push(rest)
  }

  return parts
}

/** Unescapes a Rust string literal body into normal JS text. */
export function unescapeRustStringLiteral(input: string): string {
  return input
    .replaceAll(String.raw`\"`, '"')
    .replaceAll(String.raw`\\`, '\\')
    .replaceAll(String.raw`\n`, '\n')
    .replaceAll(String.raw`\r`, '\r')
    .replaceAll(String.raw`\t`, '\t')
}

/** Extracts a serde string-like attribute value, e.g. `rename = "foo"`. */
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

/** Reads `rename_all` from serde attributes. */
export function extractRenameAll(attrs: string): string | null {
  return extractSerdeStringAttr(attrs, 'rename_all')
}

/** Reads `rename` from serde attributes with a permissive fallback parser. */
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

/** Applies serde `rename_all` policy for known naming styles. */
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

/** Normalizes Rust type text for simpler matching. */
export function cleanupRustType(typeText: string): string {
  return typeText
    .replaceAll(/\s+/gu, ' ')
    .replaceAll(/\bpub\b\s*/gu, '')
    .replaceAll(/\s+>/gu, '>')
    .replaceAll(/<\s+/gu, '<')
    .trim()
}

/** Splits generic argument list from a generic Rust type expression. */
export function splitGenericArguments(typeText: string): string[] {
  const start = typeText.indexOf('<')
  const end = typeText.lastIndexOf('>')
  if (start === -1 || end <= start) {
    return []
  }
  const inner = typeText.slice(start + 1, end)
  return splitTopLevel(inner, ',')
}

/** Unwraps wrappers like `Option<T>` or `Vec<T>`, returning the inner type text. */
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

/** Removes Rust doc comments from multiline snippets. */
export function stripDocCommentLines(text: string): string {
  return text
    .split('\n')
    .filter(line => {
      const trimmed = line.trimStart()
      return !trimmed.startsWith('///') && !trimmed.startsWith('//!')
    })
    .join('\n')
}

/** Splits a member fragment into attributes and code body text. */
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
