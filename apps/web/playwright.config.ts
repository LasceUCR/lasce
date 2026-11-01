import { defineConfig, devices } from '@playwright/test'

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url))
} catch {
  // No root .env: CI provides the variables through its environment.
}

const baseURL = 'http://localhost:3000'

// CI tests the production build, which the e2e job prepares with `next build` and the copy of
// static/ and public/ that `output: 'standalone'` leaves out. `next dev` would compile every route
// on its first request, which made the job several times slower. Locally the dev server stays, so
// no build is needed to run a spec.
const serverCommand = process.env.CI
  ? 'node .next/standalone/apps/web/server.js'
  : 'node ./node_modules/next/dist/bin/next dev'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  // CI runs in shards; each writes a blob that the `e2e` job merges into one HTML report.
  reporter: process.env.CI ? [['line'], ['blob']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit-responsive',
      testMatch: '**/responsive-controls.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-safari-responsive',
      testMatch: '**/responsive-controls.spec.ts',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'android-responsive',
      testMatch: '**/responsive-controls.spec.ts',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: serverCommand,
    env: {
      // Inlined at build time too: the e2e job sets it on `next build` as well.
      NEXT_PUBLIC_WEBDOTS_DISABLED: 'true',
      HOSTNAME: 'localhost',
      PORT: '3000',
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
