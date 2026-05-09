import { expect, it } from 'vitest'
import { defineConfig } from '../src'

it('Should match', () => {
  const config = defineConfig({
    rules: {
      eqeqeq: 'warn',
      'import/no-cycle': 'error',
    },
  })

  expect(config.rules).toBeDefined()
  expect(config.rules!.eqeqeq).toBe('warn')
})
