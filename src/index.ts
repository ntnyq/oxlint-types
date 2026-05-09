import type { OxlintConfig } from './config'

export function defineConfig<const T extends OxlintConfig>(
  config: T & OxlintConfig,
): T {
  return config
}

export type { OxlintConfig, OxlintOverride, RuleMap, RuleName } from './config'
export type {
  BuiltinPluginName,
  BuiltinRuleName,
  BuiltinRuleOptionsByName,
} from './plugins'
export type { RuleOptionsPatch } from './rules/patch'
