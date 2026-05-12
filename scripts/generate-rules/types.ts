/** A raw rule entry returned by `oxlint --rules -f json`. */
export interface RuleItem {
  scope: string
  value: string
  docs_url: string
}

/** A normalized rule with all supported alias names. */
export interface CanonicalRule {
  pluginSource: string
  pluginId: string
  ruleName: string
  namespacedRuleName: string
  ruleNames: string[]
}

/** Parsed rule list and grouped metadata used by the generator. */
export interface ParsedRules {
  pluginNames: string[]
  sortedRuleNames: string[]
  sortedRulesByPlugin: Record<string, string[]>
  canonicalRules: CanonicalRule[]
}

/** Parsed Rust `struct` or `enum` declaration information. */
export interface RustDefinition {
  kind: 'enum' | 'struct'
  shape: 'braced' | 'tuple' | 'unit'
  attrs: string
  body: string
}

/** Shared context while converting Rust types to TypeScript. */
export interface RustTypeContext {
  definitions: Map<string, RustDefinition>
  typeAliases: Map<string, string>
  cache: Map<string, string>
  visiting: Set<string>
}

/** Downloaded Rust source for one rule file. */
export interface RuleSource {
  ruleFileUrl: string
  source: string
}

/** Per-rule option parsing report entry. */
export interface RuleOptionResolution {
  finalType: string
  namespacedRuleName: string
  parseError?: string
  parsedType: string
  preservedPreviousType?: string
  sourceFound: boolean
}

/** Aggregate option parsing report for one generator run. */
export interface RuleOptionsBuildReport {
  errorRules: string[]
  parsedRules: string[]
  preservedUnknownDowngradeRules: string[]
}
