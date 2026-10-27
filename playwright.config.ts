import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'tv-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone-chromium', use: { ...devices['Pixel 7'] } },
  ],
})
