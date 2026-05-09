import path from 'node:path'

/**
 * Resolves a path from the repository root.
 * @param args Path segments relative to the repository root.
 * @returns Absolute normalized path.
 */
export const resolve = (...args: string[]): string =>
  path.resolve(import.meta.dirname, '..', ...args)
