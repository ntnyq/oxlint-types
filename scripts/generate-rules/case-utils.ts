/* oxlint-disable import/no-nodejs-modules, no-async-await, no-await-in-loop, no-optional-chaining, no-null, no-ternary, no-undefined, sort-keys, require-unicode-regexp, no-magic-numbers, jsdoc/require-param, jsdoc/require-returns */

import { PLUGIN_SOURCE_TO_ID } from './constants'

/** Maps internal plugin source id to public plugin id. */
export function normalizePlugin(source: string): string {
  return PLUGIN_SOURCE_TO_ID[source] ?? source
}

/** Removes invalid characters from rule names from CLI output. */
export function cleanRuleName(rawRuleName: string): string {
  return rawRuleName.trim().replaceAll(/[^a-zA-Z0-9_-]/gu, '')
}

/** Converts kebab-case rule names to snake_case for Rust file names. */
export function toSnakeCase(input: string): string {
  return input.replaceAll('-', '_')
}

/** Converts ids into PascalCase for generated type names. */
export function toPascalCase(input: string): string {
  return input
    .split(/[^a-zA-Z0-9]+/u)
    .filter(Boolean)
    .map(part => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('')
}

/** Converts ids into UPPER_SNAKE_CASE for generated const names. */
export function toUpperSnakeCase(input: string): string {
  return input
    .replaceAll(/[^a-zA-Z0-9]+/gu, '_')
    .replaceAll(/_+/gu, '_')
    .replaceAll(/^_|_$/gu, '')
    .toUpperCase()
}
