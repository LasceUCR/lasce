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
    // Playwright owns tests/e2e (see playwright.config.ts `testDir`) — its specs
    // are named `*.spec.ts`, so they are never picked up here regardless. Unit
    // tests live either alongside their source under app/ or under
    // tests/unit/ for cases (like the storage module) that don't have a
    // colocated home; both are covered below.
    include: ['app/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // Ratcheted from 15%/15%/25% now that app/services/storage has real,
      // fully-tested code behind it: measured at 57.7% lines / 57.0%
      // statements / 53.1% functions when these floors were raised, then
      // 63.3% lines / 62.8% statements / 63.4% functions after the
      // free-function service was restructured into app/services (see
      // docs/manage-assets.md). A starting floor that ratchets upward, not a
      // target: it exists to catch a drop, so raise it as coverage grows.
      // Branches are still not gated because JobLauncher.tsx is untested and
      // dominates the branch count, which makes that figure noise. Testing
      // it is the next ratchet step.
      thresholds: { lines: 50, statements: 50, functions: 45 },
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      // Components and helpers only. Route handlers, pages and Server Actions
      // are the I/O boundary and are gated by the Playwright suite in the `e2e`
      // job; counting them here would measure that suite's work as a gap in
      // this one and make the percentage meaningless.
      include: [
        'app/components/**/*.{ts,tsx}',
        'app/lib/**/*.{ts,tsx}',
        'app/services/**/*.{ts,tsx}',
      ],
      exclude: ['app/**/*.stories.tsx', 'app/**/*.test.{ts,tsx}'],
    },
  },
})
