import type { OxlintConfig } from './config'

export function defineConfig<T extends OxlintConfig>(config: T): T {
  return config
}
