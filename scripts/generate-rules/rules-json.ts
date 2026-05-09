import { cleanRuleName, normalizePlugin } from './case-utils'
import type { CanonicalRule, ParsedRules, RuleItem } from './types'

/**
 * Parses `oxlint --rules -f json` output into normalized generator metadata.
 * @param input Raw JSON text from oxlint CLI output.
 * @returns Parsed and normalized metadata used by code generation.
 */
export function parseRulesJson(input: string): ParsedRules {
  const rules = JSON.parse(input) as RuleItem[]
  const canonicalByName = new Map<string, CanonicalRule>()
  const rulesByPlugin = new Map<string, Set<string>>()
  const allRuleNames = new Set<string>()

  for (const rule of rules) {
    const pluginSource = rule.scope
    const pluginId = normalizePlugin(pluginSource)
    const normalizedName = cleanRuleName(rule.value)
    if (!normalizedName) {
      continue
    }

    const namespacedRuleName = `${pluginId}/${normalizedName}`
    const pluginRules = rulesByPlugin.get(pluginId) ?? new Set<string>()
    pluginRules.add(normalizedName)
    rulesByPlugin.set(pluginId, pluginRules)

    const ruleNames = [namespacedRuleName]
    if (pluginId === 'eslint') {
      ruleNames.push(normalizedName)
    }
    if (pluginId === 'typescript') {
      ruleNames.push(`@typescript-eslint/${normalizedName}`)
    }

    for (const name of ruleNames) {
      allRuleNames.add(name)
    }

    canonicalByName.set(namespacedRuleName, {
      pluginSource,
      pluginId,
      ruleName: normalizedName,
      namespacedRuleName,
      ruleNames,
    })
  }

  const pluginNames = [...rulesByPlugin.keys()].toSorted()
  const sortedRuleNames = [...allRuleNames].toSorted()
  const sortedRulesByPlugin = Object.fromEntries(
    pluginNames.map(plugin => [
      plugin,
      [...(rulesByPlugin.get(plugin) ?? [])].toSorted(),
    ]),
  )

  return {
    canonicalRules: [...canonicalByName.values()].toSorted((a, b) =>
      a.namespacedRuleName.localeCompare(b.namespacedRuleName),
    ),
    pluginNames,
    sortedRuleNames,
    sortedRulesByPlugin,
  }
}
