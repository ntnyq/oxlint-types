import { defineConfig } from '../src'
import type { BuiltinRuleOptionsByName, RuleMap } from '../src'

declare module '../src' {
  interface RuleOptionsPatch {
    'custom/my-rule': {
      enabled: boolean
    }
  }
}

defineConfig({
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'custom/my-rule': ['error', { enabled: true }],
    eqeqeq: 'warn',
    'import/no-cycle': 'error',
  },
})

defineConfig({
  rules: {
    'react/self-closing-comp': ['error', { html: false }],
  },
})

defineConfig({
  rules: {
    'eslint/prefer-const': ['error', { destructuring: 'all' }],
  },
})

defineConfig({
  rules: {
    // @ts-expect-error eslint/constructor-super does not accept options
    'eslint/constructor-super': ['error', { any: true }],
  },
})

defineConfig({
  rules: {
    // @ts-expect-error unknown option key should be rejected for react/self-closing-comp
    'react/self-closing-comp': ['error', { invalid: true }],
  },
})

defineConfig({
  rules: {
    // @ts-expect-error invalid option value should be rejected for eslint/prefer-const
    'eslint/prefer-const': ['error', { destructuring: 'none' }],
  },
})

export const invalidConstructorSuperRule: RuleMap['eslint/constructor-super'] =
  [
    'error',
    // @ts-expect-error eslint/constructor-super has no options
    {
      any: true,
    },
  ]

export const invalidSelfClosingCompRule: RuleMap['react/self-closing-comp'] = [
  'error',
  // @ts-expect-error self-closing-comp does not accept "invalid"
  { invalid: true },
]

// @ts-expect-error constructor-super options map should be never
export const invalidConstructorSuperOptions: BuiltinRuleOptionsByName['eslint/constructor-super'] =
  { any: true }

export const invalidSelfClosingCompOptions: BuiltinRuleOptionsByName['react/self-closing-comp'] =
  // @ts-expect-error invalid key should be rejected
  { invalid: true }

defineConfig({
  rules: {
    // @ts-expect-error unknown bare rule name should be rejected
    unknownRuleName: 'error',
  },
})

defineConfig({
  rules: {
    // @ts-expect-error unknown namespaced rule should be rejected unless patched
    'custom/unknown-rule': 'warn',
  },
})
