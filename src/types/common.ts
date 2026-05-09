import type { AllowWarnDeny } from 'oxlint'

export type RuleSeverity = AllowWarnDeny

export type RuleEntry<Options = unknown> =
  | RuleSeverity
  | readonly [RuleSeverity]
  | readonly [RuleSeverity, Options]
  | readonly [RuleSeverity, Options, ...unknown[]]
