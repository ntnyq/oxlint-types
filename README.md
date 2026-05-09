# @oxlint-types/define-config

[![CI](https://github.com/ntnyq/oxlint-types/workflows/CI/badge.svg)](https://github.com/ntnyq/oxlint-types/actions)
[![NPM VERSION](https://img.shields.io/npm/v/@oxlint-types/define-config.svg)](https://www.npmjs.com/package/@oxlint-types/define-config)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/@oxlint-types/define-config.svg)](https://www.npmjs.com/package/@oxlint-types/define-config)
[![LICENSE](https://img.shields.io/github/license/ntnyq/oxlint-types.svg)](https://github.com/ntnyq/oxlint-types/blob/main/LICENSE)

:package: Strong typed `defineConfig` function support for [oxlint](https://oxc.rs/docs/guide/usage/linter).

> [!CAUTION]
> This package is work in progress.

## Install

```shell
npm install @oxlint-types/define-config
```

```shell
yarn add @oxlint-types/define-config
```

```shell
pnpm add @oxlint-types/define-config
```

## Usage

```ts
import { defineConfig } from '@oxlint-types/define-config'

export default defineConfig({
  plugins: ['react', 'typescript', 'import'],
  rules: {
    eqeqeq: 'warn',
    'import/no-cycle': 'error',
    'react/self-closing-comp': ['error', { html: false }],
    '@typescript-eslint/no-explicit-any': 'off',
  },
})
```

`rules` keys are generated from `oxlint --rules`, so built-in rules have autocompletion and typo checks.
Rule options are parsed from Oxc Rust rule sources (`declare_oxc_lint!(..., config = ...)`) and generated into `BuiltinRuleOptionsByName`, then merged with your `RuleOptionsPatch` overrides.

## Regenerate Rules

```shell
pnpm rules:generate
```

This command updates plugin-level generated files under [src/plugins](src/plugins):

- [src/plugins/index.generated.ts](src/plugins/index.generated.ts)
- [src/plugins/\*.generated.ts](src/plugins)

It also writes a compatibility re-export in [src/rules/generated.ts](src/rules/generated.ts).
The generator script is [scripts/generate-rules.ts](scripts/generate-rules.ts).

## Patch Rule Types (Persistent Across Updates)

To customize options for specific rules, augment `RuleOptionsPatch`:

```ts
declare module '@oxlint-types/define-config' {
  interface RuleOptionsPatch {
    'react/self-closing-comp': {
      html?: boolean
      component?: boolean
    }
    'custom/my-rule': {
      enabled: boolean
    }
  }
}
```

The patch type lives in [src/rules/patch.ts](src/rules/patch.ts), and is never auto-generated.
When you run `pnpm rules:generate` later, your patch interfaces still apply.

When both generated and patched option types exist for a rule key, patch type takes precedence.

## Credits

- [eslint-define-config](https://github.com/eslint-types/eslint-define-config) create by [Shinigami92](https://github.com/Shinigami92)

## License

[MIT](./LICENSE) License © 2026-PRESENT [ntnyq](https://github.com/ntnyq)
