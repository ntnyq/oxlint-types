/* oxlint-disable no-null */

import { toSnakeCase } from './case-utils'
import {
  FETCH_CONCURRENCY,
  FETCH_RETRIES,
  REQUEST_TIMEOUT_MS,
  RUST_RULES_BASE_URL,
} from './constants'
import type { CanonicalRule, RuleSource } from './types'

/**
 * Builds all fetch URL candidates for one rule source.
 * @param rule Canonical rule metadata from oxlint output.
 * @returns Candidate Rust file URLs to try in order.
 */
export function getRustRuleUrlCandidates(rule: CanonicalRule): string[] {
  const pluginSource = rule.pluginSource
  const rustRuleName = toSnakeCase(rule.ruleName)
  return [
    `${RUST_RULES_BASE_URL}/${pluginSource}/${rustRuleName}.rs`,
    `${RUST_RULES_BASE_URL}/${pluginSource}/${rustRuleName}/mod.rs`,
  ]
}

/**
 * Fetches the first available Rust source among candidate URLs.
 * @param rule Canonical rule metadata from oxlint output.
 * @returns Downloaded Rust source payload, or null when all candidates fail.
 */
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

/**
 * Extracts likely option/config sibling module URLs for `mod.rs` rules.
 * @param ruleFileUrl Current rule Rust source URL.
 * @param source Rust source text from the current rule file.
 * @returns Candidate sibling module URLs that may define option/config structs.
 */
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

/**
 * Fetches optional extra Rust source files that may contain config definitions.
 * @param urls Candidate sibling Rust module URLs.
 * @returns Successfully downloaded source texts in input order.
 */
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

/**
 * Runs async tasks with fixed-width concurrency.
 * @param items Items to process.
 * @param worker Async worker called once per item.
 * @returns Promise that resolves after all items are processed.
 */
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
