/* oxlint-disable import/no-nodejs-modules, no-async-await, no-await-in-loop, no-optional-chaining, no-null, no-ternary, no-undefined, sort-keys, require-unicode-regexp, no-magic-numbers, jsdoc/require-param, jsdoc/require-returns */

import { toSnakeCase } from './case-utils'
import {
  FETCH_CONCURRENCY,
  FETCH_RETRIES,
  REQUEST_TIMEOUT_MS,
  RUST_RULES_BASE_URL,
} from './constants'
import type { CanonicalRule, RuleSource } from './types'

/** Builds all fetch URL candidates for one rule source. */
export function getRustRuleUrlCandidates(rule: CanonicalRule): string[] {
  const pluginSource = rule.pluginSource
  const rustRuleName = toSnakeCase(rule.ruleName)
  return [
    `${RUST_RULES_BASE_URL}/${pluginSource}/${rustRuleName}.rs`,
    `${RUST_RULES_BASE_URL}/${pluginSource}/${rustRuleName}/mod.rs`,
  ]
}

/** Fetches the first available Rust source among candidate URLs. */
export async function fetchFirstAvailableRuleSource(
  rule: CanonicalRule,
): Promise<RuleSource | null> {
  const candidates = getRustRuleUrlCandidates(rule)

  for (const candidate of candidates) {
    for (let attempt = 0; attempt < FETCH_RETRIES; attempt += 1) {
      try {
        const response = await fetch(candidate, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        if (!response.ok) {
          continue
        }
        return {
          ruleFileUrl: candidate,
          source: await response.text(),
        }
      } catch {
        continue
      }
    }
  }

  return null
}

/** Extracts likely option/config sibling module URLs for `mod.rs` rules. */
export function getRuleModuleSiblingUrls(
  ruleFileUrl: string,
  source: string,
): string[] {
  if (!ruleFileUrl.endsWith('/mod.rs')) {
    return []
  }

  const dir = ruleFileUrl.slice(0, -'mod.rs'.length)
  const modules = [
    ...source.matchAll(/(?:pub\s+)?mod\s+([a-z_][a-z0-9_]*)\s*;/gmu),
  ]
    .flatMap(match => (match[1] ? [match[1]] : []))
    .filter(name => name.includes('option') || name.includes('config'))

  return modules.map(moduleName => `${dir}${moduleName}.rs`)
}

/** Fetches optional extra Rust source files that may contain config definitions. */
export async function fetchOptionalSources(urls: string[]): Promise<string[]> {
  const texts: string[] = []
  for (const url of urls) {
    for (let attempt = 0; attempt < FETCH_RETRIES; attempt += 1) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        if (!response.ok) {
          continue
        }
        texts.push(await response.text())
        break
      } catch {
        continue
      }
    }
  }
  return texts
}

/** Runs async tasks with fixed-width concurrency. */
export async function runPool<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items]
  const runners = Array.from(
    { length: Math.min(FETCH_CONCURRENCY, queue.length) },
    async () => {
      while (queue.length > 0) {
        const item = queue.shift()
        if (item === undefined) {
          return
        }
        await worker(item)
      }
    },
  )

  await Promise.all(runners)
}
