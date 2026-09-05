import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The Next tsconfig sets `jsx: "preserve"` because Next runs its own
  // transform. Vite 8 compiles through oxc, which honours that and leaves JSX
  // in place, so the test files fail to parse unless it is told otherwise.
  oxc: { jsx: { runtime: 'automatic' } },

  // Mirrors the `@/*` path mapping in tsconfig.json, which the stories use.
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url).href) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // next-intl imports from `next/navigation` without file extensions, which
    // Vite's default externalization for `node_modules` doesn't resolve under
    // Vitest. Inlining it processes those imports through the same resolver
    // as the rest of the test.
    server: { deps: { inline: ['next-intl'] } },
    // Playwright owns tests/e2e (see playwright.config.ts `testDir`). Confining
    // the unit suite to app/ is what keeps `turbo run test` from starting a
    // browser or a dev server.
    include: ['app/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // Measured at 18% statements / 18% lines when these floors were set. A
      // starting floor that ratchets upward, not a target: it exists to catch a
      // drop, so raise it as coverage grows. The suite now clears these floors
      // by a wide margin — JobLauncher.tsx and app/lib/i18n.ts both have tests —
      // so the next ratchet is a deliberate bump, not a side effect of this one.
      thresholds: { lines: 15, statements: 15, functions: 25 },
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      // Components and helpers only. Route handlers, pages and Server Actions
      // are the I/O boundary and are gated by the Playwright suite in the `e2e`
      // job; counting them here would measure that suite's work as a gap in
      // this one and make the percentage meaningless.
      include: ['app/components/**/*.{ts,tsx}', 'app/lib/**/*.{ts,tsx}'],
      exclude: ['app/**/*.stories.tsx', 'app/**/*.test.{ts,tsx}'],
    },
  },
})
