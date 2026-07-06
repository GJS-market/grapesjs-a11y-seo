import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// The environment ships a pre-installed Chromium whose build may not match the
// one this Playwright version would download. Launch the existing binary
// directly (no download) when present.
const PREINSTALLED = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].find((p) => existsSync(p));

/**
 * E2E harness: Vite serves the demo, Playwright drives Chromium against the
 * deliberately-broken page. The pre-installed Chromium is used via env
 * (PLAYWRIGHT_BROWSERS_PATH), so no download step is needed.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:5199',
    headless: true,
  },
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199/demo/index.html',
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        launchOptions: PREINSTALLED ? { executablePath: PREINSTALLED } : {},
      },
    },
  ],
});
