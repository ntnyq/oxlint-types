/* oxlint-disable no-async-await, no-await-in-loop, no-optional-chaining, no-null, no-ternary, no-undefined, sort-keys, require-unicode-regexp, no-magic-numbers */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ROOT } from './constants'
import { buildRuleOptionsByRuleName } from './options'
import { readExistingGeneratedOptionTypes, writePluginFiles } from './output'
import { parseRulesJson } from './rules-json'

/**
 * Runs the full rule generation pipeline and writes generated files.
 * @returns Promise that resolves after all generated files are written.
 */
export async function generateRules(): Promise<void> {
  const tmpConfigPath = path.join(
    os.tmpdir(),
    `oxlint-types-generate-rules-${process.pid}.json`,
  )

  fs.writeFileSync(tmpConfigPath, '{}\n', 'utf8')

  try {
    const rulesOutput = execSync(
      `./node_modules/.bin/oxlint --rules -f json -c ${JSON.stringify(tmpConfigPath)}`,
      {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      },
    )

    const parsed = parseRulesJson(rulesOutput)
    const previousOptionsByRuleName = readExistingGeneratedOptionTypes()
    const { optionsByRuleName, report } = await buildRuleOptionsByRuleName(
      parsed,
      previousOptionsByRuleName,
    )
    writePluginFiles(parsed, optionsByRuleName)

    const knownCount = Object.values(optionsByRuleName).filter(
      optionType => optionType !== 'unknown',
    ).length

    // eslint-disable-next-line no-console
    console.log(
      `Generated ${parsed.sortedRuleNames.length} rules (${knownCount} option schemas parsed) from ${parsed.pluginNames.length} plugins into src/plugins/*.generated.ts`,
    )
    // eslint-disable-next-line no-console
    console.log(
      [
        'Option parse summary:',
        `- parsed with known type: ${report.parsedRules.length}`,
        `- parse errors: ${report.errorRules.length}`,
        `- preserved previous non-unknown type: ${report.preservedUnknownDowngradeRules.length}`,
      ].join('\n'),
    )

    if (report.errorRules.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Parse error rules:')
      for (const item of report.errorRules) {
        // eslint-disable-next-line no-console
        console.log(`- ${item}`)
      }
    }

    if (report.preservedUnknownDowngradeRules.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Preserved previous non-unknown type rules:')
      for (const ruleName of report.preservedUnknownDowngradeRules) {
        // eslint-disable-next-line no-console
        console.log(`- ${ruleName}`)
      }
    }
  } finally {
    fs.rmSync(tmpConfigPath, { force: true })
  }
}
