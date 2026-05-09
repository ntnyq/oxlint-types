/* oxlint-disable import/no-nodejs-modules, no-async-await, no-await-in-loop, no-optional-chaining, no-null, no-ternary, no-undefined, sort-keys, require-unicode-regexp, no-magic-numbers, jsdoc/require-param, jsdoc/require-returns */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ROOT } from './constants'
import { buildRuleOptionsByRuleName } from './options'
import { writePluginFiles } from './output'
import { parseRulesJson } from './rules-json'

/** Runs the full rule generation pipeline and writes generated files. */
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
    const optionsByRuleName = await buildRuleOptionsByRuleName(parsed)
    writePluginFiles(parsed, optionsByRuleName)

    const knownCount = Object.values(optionsByRuleName).filter(
      optionType => optionType !== 'unknown',
    ).length

    // eslint-disable-next-line no-console
    console.log(
      `Generated ${parsed.sortedRuleNames.length} rules (${knownCount} option schemas parsed) from ${parsed.pluginNames.length} plugins into src/plugins/*.generated.ts`,
    )
  } finally {
    fs.rmSync(tmpConfigPath, { force: true })
  }
}
