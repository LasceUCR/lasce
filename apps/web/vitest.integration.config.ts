import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * PostgreSQL integration tests: the publications service against a real database, with real
 * transactions, constraints and concurrent connections. Run them with `pnpm test:integration`
 * and `INTEGRATION_DATABASE_URL` set to a disposable `*_test` database (see
 * `tests/integration/guard.ts` and `docs/translate-database-content.md`). They are not part of
 * `pnpm test`, which needs no database.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url).href) },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/integration/setup.ts'],
    // One file at a time: the files share one database.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
