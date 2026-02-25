import type { OxlintConfig } from 'oxlint'

type AllowWarnDeny = ('allow' | 'off' | 'warn' | 'error' | 'deny') | number
type GlobalValue = 'readonly' | 'writable' | 'off'
type Plugins =
  | 'eslint'
  | 'react'
  | 'unicorn'
  | 'typescript'
  | 'oxc'
  | 'import'
  | 'jsdoc'
  | 'jest'
  | 'vitest'
  | 'jsx-a11y'
  | 'nextjs'
  | 'react-perf'
  | 'promise'
  | 'node'
  | 'vue'

export type Globals = Record<string, GlobalValue>

export interface Options {
  typeAware?: boolean
  typeCheck?: boolean
}

export interface Categories {
  correctness?: AllowWarnDeny
  nursery?: AllowWarnDeny
  pedantic?: AllowWarnDeny
  perf?: AllowWarnDeny
  restriction?: AllowWarnDeny
  style?: AllowWarnDeny
  suspicious?: AllowWarnDeny
}

export type Env = Record<string, boolean>

type TagNamePreference =
  | string
  | {
      message: string
      replacement: string
      [k: string]: unknown
    }
  | {
      message: string
      [k: string]: unknown
    }
  | boolean

export interface PluginJSDocSettings {
  augmentsExtendsReplacesDocs?: boolean
  exemptDestructuredRootsFromChecks?: boolean
  ignoreInternal?: boolean
  ignorePrivate?: boolean
  ignoreReplacesDocs?: boolean
  implementsReplacesDocs?: boolean
  overrideReplacesDocs?: boolean
  tagNamePreference: Record<string, TagNamePreference>
  [k: string]: unknown
}

export interface Settings {
  jsdoc?: PluginJSDocSettings
}

export interface Config {
  globals?: Globals

  categories?: Categories

  ignorePatterns?: string[]

  files?: string[]

  extends?: Omit<Config, 'extends'>

  env?: Env

  options?: Options

  plugins?: Plugins[]

  settings?: Settings
}

export type { OxlintConfig }
