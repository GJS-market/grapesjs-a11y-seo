import { test, expect } from '@playwright/test';

/**
 * The auditor opens via the ⌘/Ctrl+Shift+A hotkey and the ♿ toolbar button.
 * The demo auto-opens the panel (enabled: true); visibility is the absence of
 * the `.gjs-as-hidden` class on `.gjs-as-root`. When the panel is docked open
 * it overlays the top toolbar, so the ♿ button's job is to OPEN it — closing
 * is done from the panel (✕ / Esc / hotkey).
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/demo/index.html');
  await page.waitForSelector('.gjs-as-root', { timeout: 20_000 });
});

const isHidden = (page: import('@playwright/test').Page) =>
  page.locator('.gjs-as-root').evaluate((el) => el.classList.contains('gjs-as-hidden'));

test('Ctrl/⌘+Shift+A toggles the auditor panel', async ({ page }) => {
  expect(await isHidden(page)).toBe(false); // auto-opened
  await page.keyboard.press('Control+Shift+A');
  await expect.poll(() => isHidden(page)).toBe(true); // closed
  await page.keyboard.press('Control+Shift+A');
  await expect.poll(() => isHidden(page)).toBe(false); // re-opened
});

test('the ♿ toolbar button opens the auditor', async ({ page }) => {
  const btn = page.locator('.gjs-pn-btn.fa-universal-access');
  await expect(btn).toBeVisible();

  // Close first (the open panel overlays the toolbar), then the button opens it.
  await page.keyboard.press('Control+Shift+A');
  await expect.poll(() => isHidden(page)).toBe(true);

  await btn.click();
  await expect.poll(() => isHidden(page)).toBe(false); // opened by the ♿ button
  await expect(page.locator('.gjs-as-root .gjs-as-tab')).toHaveCount(3); // the auditor is really there
});
