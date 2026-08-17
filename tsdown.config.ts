import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: ['oxlint'],
  },
  dts: true,
  entry: ['src/index.ts'],
  platform: 'neutral',
})
