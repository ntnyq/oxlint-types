import path from 'node:path'

/** Workspace root used by the generator. */
export const ROOT = process.cwd()

/** Directory containing generated per-plugin type files. */
export const PLUGINS_DIR = path.resolve(ROOT, 'src/plugins')

/** Output path for the aggregate plugin index file. */
export const PLUGINS_INDEX_OUTPUT_PATH = path.resolve(
  PLUGINS_DIR,
  'index.generated.ts',
)

/** Compatibility output path kept for legacy imports. */
export const COMPAT_RULES_OUTPUT_PATH = path.resolve(
  ROOT,
  'src/rules/generated.ts',
)

/** Pinned OXC commit for deterministic Rust-source parsing. */
export const OXC_COMMIT = 'f31fc82ff39a74b856b0798389903ae096ad2317'

/** Base URL of OXC Rust lint rule sources. */
export const RUST_RULES_BASE_URL = `https://raw.githubusercontent.com/oxc-project/oxc/${OXC_COMMIT}/crates/oxc_linter/src/rules`

/** Parallel fetch concurrency for remote Rust sources. */
export const FETCH_CONCURRENCY = 16

/** Per-request timeout in milliseconds. */
export const REQUEST_TIMEOUT_MS = 8000

/** Retry count for fetching remote Rust sources. */
export const FETCH_RETRIES = 2

/** Plugin name mappings from oxlint source id to public plugin id. */
export const PLUGIN_SOURCE_TO_ID: Record<string, string> = {
  jsx_a11y: 'jsx-a11y',
  react_perf: 'react-perf',
}

/**
 * Fallback option types for rules where Rust source cannot be fully resolved.
 * These types are still derived from Rust rule implementation and options files.
 */
export const FALLBACK_OPTION_TYPES: Record<string, string> = {
  'eslint/array-callback-return': `{
  "checkForEach"?: boolean
  "allowImplicit"?: boolean
  "allowVoid"?: boolean
}`,
  'eslint/no-shadow': `{
  "hoist"?: "all" | "functions" | "functions-and-types" | "never" | "types"
  "allow"?: readonly (string)[]
  "ignoreTypeValueShadow"?: boolean
  "ignoreFunctionTypeParameterNameValueShadow"?: boolean
  "builtinGlobals"?: boolean
  "ignoreOnInitialization"?: boolean
}`,
  'eslint/no-unused-vars': `{
  "vars"?: "all" | "local"
  "varsIgnorePattern"?: string
  "args"?: "after-used" | "all" | "none"
  "argsIgnorePattern"?: string
  "ignoreRestSiblings"?: boolean
  "caughtErrors"?: "all" | "none" | boolean
  "caughtErrorsIgnorePattern"?: string
  "destructuredArrayIgnorePattern"?: string
  "ignoreClassWithStaticInitBlock"?: boolean
  "ignoreUsingDeclarations"?: boolean
  "reportUsedIgnorePattern"?: boolean
  "reportVarsOnlyUsedAsTypes"?: boolean
  "fix"?: {
  "imports"?: "off" | "suggestion" | "fix" | "safe-fix"
  "variables"?: "off" | "suggestion" | "fix" | "safe-fix"
}
}`,
}
