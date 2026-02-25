import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: ['oxlint'],
  },
  dts: {
    tsgo: true,
  },
  entry: ['src/index.ts'],
  platform: 'neutral',
})
