import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

function workspaceSource(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url))
}

export default defineConfig({
  resolve: {
    alias: {
      '@project-havoc/protocol': workspaceSource('./packages/protocol/src/index.ts'),
      '@project-havoc/game-core': workspaceSource('./packages/game-core/src/index.ts'),
      '@project-havoc/test-support': workspaceSource('./packages/test-support/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    passWithNoTests: false,
    restoreMocks: true,
  },
})
