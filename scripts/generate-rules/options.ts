import { FALLBACK_OPTION_TYPES } from './constants'
import {
  fetchFirstAvailableRuleSource,
  fetchOptionalSources,
  getRuleModuleSiblingUrls,
  runPool,
} from './fetch'
import { parseRuleOptionsTypeFromRust } from './rust-parse'
import type { ParsedRules } from './types'

/**
 * Applies post-parse fallback patches for unresolved or known malformed rules.
 * @param namespacedRuleName Fully-qualified rule name, e.g. plugin/rule.
 * @param optionType Parsed TypeScript option type string.
 * @returns Patched option type string used for generated output.
 */
export function applyOptionTypeFallback(
  namespacedRuleName: string,
  optionType: string,
): string {
  if (optionType === 'unknown') {
    const fallback = FALLBACK_OPTION_TYPES[namespacedRuleName]
    if (fallback) {
      return fallback
    }
  }

  return optionType.replaceAll(
    String.raw`"input[type=\\"?:`,
    '"input[type=\\\"image\\\"]"?:',
  )
}

/**
 * Builds a map of rule name to TypeScript option type by parsing Rust sources.
 * @param parsed Parsed rule metadata from oxlint JSON output.
 * @returns Map from rule aliases to generated TypeScript option type strings.
 */
export async function buildRuleOptionsByRuleName(
  parsed: ParsedRules,
): Promise<Record<string, string>> {
  const optionsByRuleName: Record<string, string> = {}
  let completed = 0

  await runPool(parsed.canonicalRules, async rule => {
    let optionType = 'unknown'

    const ruleSource = await fetchFirstAvailableRuleSource(rule)
    if (ruleSource) {
      optionType = parseRuleOptionsTypeFromRust(ruleSource.source)

      if (optionType === 'unknown') {
        const siblingUrls = getRuleModuleSiblingUrls(
          ruleSource.ruleFileUrl,
          ruleSource.source,
        )
        if (siblingUrls.length > 0) {
          const extraSources = await fetchOptionalSources(siblingUrls)
          if (extraSources.length > 0) {
            optionType = parseRuleOptionsTypeFromRust(
              ruleSource.source,
              extraSources,
            )
          }
        }
      }
    }

    for (const name of rule.ruleNames) {
      optionsByRuleName[name] = applyOptionTypeFallback(name, optionType)
    }

    completed += 1
    if (completed % 100 === 0 || completed === parsed.canonicalRules.length) {
      // eslint-disable-next-line no-console
      console.log(
        `Parsed Rust options: ${completed}/${parsed.canonicalRules.length}`,
      )
    }
  })

  return optionsByRuleName
}
