import { FALLBACK_OPTION_TYPES } from './constants'
import {
  fetchFirstAvailableRuleSource,
  fetchOptionalSources,
  getRuleModuleSiblingUrls,
  runPool,
} from './fetch'
import { parseRuleOptionsTypeFromRust } from './rust-parse'
import type {
  CanonicalRule,
  ParsedRules,
  RuleOptionsBuildReport,
} from './types'

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

async function parseOptionTypeForRule(rule: CanonicalRule): Promise<{
  optionType: string
  parseError: string
  sourceFound: boolean
}> {
  let optionType = 'unknown'
  let parseError = ''
  let sourceFound = false

  try {
    const ruleSource = await fetchFirstAvailableRuleSource(rule)
    sourceFound = ruleSource !== null
    if (!ruleSource) {
      return { optionType, parseError, sourceFound }
    }

    optionType = parseRuleOptionsTypeFromRust(ruleSource.source)
    if (optionType !== 'unknown') {
      return { optionType, parseError, sourceFound }
    }

    const siblingUrls = getRuleModuleSiblingUrls(
      ruleSource.ruleFileUrl,
      ruleSource.source,
    )
    if (siblingUrls.length === 0) {
      return { optionType, parseError, sourceFound }
    }

    const extraSources = await fetchOptionalSources(siblingUrls)
    if (extraSources.length === 0) {
      return { optionType, parseError, sourceFound }
    }

    optionType = parseRuleOptionsTypeFromRust(ruleSource.source, extraSources)
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error)
    optionType = 'unknown'
  }

  return { optionType, parseError, sourceFound }
}

function resolveFinalOptionType(input: {
  optionType: string
  previousOptionsByRuleName: Record<string, string>
  report: RuleOptionsBuildReport
  rule: CanonicalRule
}): string {
  const { optionType, previousOptionsByRuleName, report, rule } = input
  const patched = applyOptionTypeFallback(rule.namespacedRuleName, optionType)
  if (patched !== 'unknown') {
    return patched
  }

  const previousType = previousOptionsByRuleName[rule.namespacedRuleName]
  if (previousType && previousType !== 'unknown') {
    report.preservedUnknownDowngradeRules.push(rule.namespacedRuleName)
    return previousType
  }

  return patched
}

function pickAliasOptionType(input: {
  aliasName: string
  finalOptionType: string
  previousOptionsByRuleName: Record<string, string>
  rule: CanonicalRule
}): string {
  const { aliasName, finalOptionType, previousOptionsByRuleName, rule } = input
  const preservedAliasType =
    finalOptionType === 'unknown' &&
    aliasName !== rule.namespacedRuleName &&
    previousOptionsByRuleName[aliasName] &&
    previousOptionsByRuleName[aliasName] !== 'unknown'
      ? previousOptionsByRuleName[aliasName]
      : undefined

  if (preservedAliasType) {
    return preservedAliasType
  }

  return applyOptionTypeFallback(aliasName, finalOptionType)
}

function getParseStatusText(
  parseError: string,
  finalOptionType: string,
): string {
  if (parseError) {
    return `error (${parseError})`
  }

  if (finalOptionType === 'unknown') {
    return 'unknown'
  }

  return 'ok'
}

/**
 * Builds a map of rule name to TypeScript option type by parsing Rust sources.
 * @param parsed Parsed rule metadata from oxlint JSON output.
 * @param previousOptionsByRuleName Existing generated option map from previous run.
 * @returns Map from rule aliases to generated TypeScript option type strings.
 */
export async function buildRuleOptionsByRuleName(
  parsed: ParsedRules,
  previousOptionsByRuleName: Record<string, string> = {},
): Promise<{
  optionsByRuleName: Record<string, string>
  report: RuleOptionsBuildReport
}> {
  const optionsByRuleName: Record<string, string> = {}
  const report: RuleOptionsBuildReport = {
    errorRules: [],
    parsedRules: [],
    preservedUnknownDowngradeRules: [],
  }
  let completed = 0
  let started = 0

  await runPool(parsed.canonicalRules, async rule => {
    const total = parsed.canonicalRules.length
    const displayName = rule.namespacedRuleName
    started += 1
    // eslint-disable-next-line no-console
    console.log(`Parsing [${started}/${total}] ${displayName} ...`)

    const { optionType, parseError, sourceFound } =
      await parseOptionTypeForRule(rule)
    const finalOptionType = resolveFinalOptionType({
      optionType,
      previousOptionsByRuleName,
      report,
      rule,
    })

    for (const name of rule.ruleNames) {
      optionsByRuleName[name] = pickAliasOptionType({
        aliasName: name,
        finalOptionType,
        previousOptionsByRuleName,
        rule,
      })
    }

    if (parseError) {
      report.errorRules.push(`${rule.namespacedRuleName}: ${parseError}`)
    } else if (sourceFound && finalOptionType !== 'unknown') {
      report.parsedRules.push(rule.namespacedRuleName)
    }

    completed += 1
    const status = getParseStatusText(parseError, finalOptionType)
    const preserved = report.preservedUnknownDowngradeRules.includes(
      rule.namespacedRuleName,
    )
      ? ' [preserved previous non-unknown]'
      : ''
    // eslint-disable-next-line no-console
    console.log(
      `Parsed [${completed}/${total}] ${rule.namespacedRuleName}: ${status}${preserved}`,
    )
  })

  return { optionsByRuleName, report }
}
