import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/globalSetup.ts',
  outputDir: './test-results',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4311',
    trace: 'on-first-retry',
    viewport: { width: 1366, height: 768 },
  },
  projects: [
    { name: 'tv-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
