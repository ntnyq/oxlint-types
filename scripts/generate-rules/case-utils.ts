import { PLUGIN_SOURCE_TO_ID } from './constants'

/**
 * Maps internal plugin source id to public plugin id.
 * @param source Internal plugin id from oxlint source metadata.
 * @returns Public plugin id used in generated typings.
 */
export function normalizePlugin(source: string): string {
  return PLUGIN_SOURCE_TO_ID[source] ?? source
}

/**
 * Removes invalid characters from rule names from CLI output.
 * @param rawRuleName Raw rule name from oxlint JSON output.
 * @returns Sanitized rule name containing only supported characters.
 */
export function cleanRuleName(rawRuleName: string): string {
  return rawRuleName.trim().replaceAll(/[^a-zA-Z0-9_-]/gu, '')
}

/**
 * Converts kebab-case rule names to snake_case for Rust file names.
 * @param input Rule name in kebab-case.
 * @returns Rule name converted to snake_case.
 */
export function toSnakeCase(input: string): string {
  return input.replaceAll('-', '_')
}

/**
 * Converts ids into PascalCase for generated type names.
 * @param input Identifier text.
 * @returns Identifier converted to PascalCase.
 */
export function toPascalCase(input: string): string {
  return input
    .split(/[^a-zA-Z0-9]+/u)
    .filter(Boolean)
    .map(part => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('')
}

/**
 * Converts ids into UPPER_SNAKE_CASE for generated const names.
 * @param input Identifier text.
 * @returns Identifier converted to UPPER_SNAKE_CASE.
 */
export function toUpperSnakeCase(input: string): string {
  return input
    .replaceAll(/[^a-zA-Z0-9]+/gu, '_')
    .replaceAll(/_+/gu, '_')
    .replaceAll(/^_|_$/gu, '')
    .toUpperCase()
}
