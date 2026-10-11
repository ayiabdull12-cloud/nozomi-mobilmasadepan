import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
process.env.WARUNG_TEST_DATABASE = `/tmp/warung-raya-e2e-${randomUUID()}.sqlite`;
export default defineConfig({
  globalTeardown: './tests/teardown.js',
  testDir: './tests', testMatch: '*.spec.js', workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3002', headless: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] }, trace: 'retain-on-failure' },
  webServer: { command: 'node server/index.js', url: 'http://127.0.0.1:3002/api/health', reuseExistingServer: false, env: { PORT: '3002', DATABASE_PATH: process.env.WARUNG_TEST_DATABASE, SEED_DEMO: 'false', MIDTRANS_SERVER_KEY: '', PUBLIC_BASE_URL: '', APP_PASSWORD: '' } }
});
