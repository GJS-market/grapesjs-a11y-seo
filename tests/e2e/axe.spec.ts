import { test, expect } from '@playwright/test';

// Exercises the optional axe-core engine end-to-end (engine:'axe'), confirming
// the adapter runs axe against the canvas document and maps results back to
// GrapesJS components.
test.describe('axe engine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/index.html?engine=axe');
    await page.waitForSelector('.gjs-as-root', { timeout: 20_000 });
  });

  test('produces component-linked findings', async ({ page }) => {
    // axe loads lazily; give it a moment to run and populate the list.
    await page.waitForSelector('.gjs-as-item', { timeout: 25_000 });
    const count = await page.locator('.gjs-as-item').count();
    expect(count).toBeGreaterThan(0);

    // At least one finding maps to a component → Show selects it in the canvas.
    const showBtn = page.locator('.gjs-as-item .gjs-as-link:has-text("Show")').first();
    await showBtn.click();
    const frame = page.frameLocator('.gjs-frame');
    await expect(frame.locator('.gjs-selected')).toHaveCount(1, { timeout: 5000 });
  });
});
