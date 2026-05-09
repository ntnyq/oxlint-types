import type {
  OxlintConfig as UpstreamOxlintConfig,
  OxlintOverride as UpstreamOxlintOverride,
} from 'oxlint'
import type { BuiltinRuleName, BuiltinRuleOptionsByName } from './plugins'
import type { RuleOptionsPatch } from './rules/patch'
import type { RuleEntry } from './types/common'

type BuiltinRuleOptionFor<Name extends string> =
  Name extends keyof BuiltinRuleOptionsByName
    ? BuiltinRuleOptionsByName[Name]
    : never

type RuleOptionFor<Name extends string> = Name extends keyof RuleOptionsPatch
  ? RuleOptionsPatch[Name]
  : BuiltinRuleOptionFor<Name>

export type RuleName = BuiltinRuleName | Extract<keyof RuleOptionsPatch, string>

export type RuleMap = {
  [Name in RuleName]?: RuleEntry<RuleOptionFor<Name>>
}

type OxlintConfigBase = Omit<
  UpstreamOxlintConfig,
  'extends' | 'overrides' | 'rules'
>
type OxlintOverrideBase = Omit<UpstreamOxlintOverride, 'rules'>

export interface OxlintOverride extends OxlintOverrideBase {
  rules?: RuleMap
}

export interface OxlintConfig extends OxlintConfigBase {
  extends?: OxlintConfig[]
  overrides?: OxlintOverride[]
  rules?: RuleMap
}
