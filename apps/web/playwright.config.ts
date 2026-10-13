import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
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
    command: 'node ./node_modules/next/dist/bin/next dev',
    env: {
      NEXT_PUBLIC_WEBDOTS_DISABLED: 'true',
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
