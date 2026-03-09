// @ts-check
import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration for AlmaDesk-Edu
 *
 * Requires running:
 *   - docker compose up (infra services: postgres, redis, keycloak, etc.)
 *   - backend:  cd app/backend && node src/server.js  (port 3001)
 *   - frontend: cd app/frontend && npm run dev         (port 5173)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: './test-report/e2e-html', open: 'never' }],
    ['json', { outputFile: './test-report/e2e-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'demo',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        launchOptions: { slowMo: 600 },
        video: 'on',
      },
    },
  ],
  /* Start frontend dev server before tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
