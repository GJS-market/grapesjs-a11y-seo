import { test, expect } from '@playwright/test';

/**
 * Regression for the multi-page audit race (BUG #1): toggling "All pages" while
 * the initial single-page audit is still in flight used to wedge the auditor —
 * `requestIdleCallback` could starve, the run promise never settled, and the
 * queued all-pages run was silently dropped. With many pages the window is wide
 * enough to hit reliably.
 */
test('toggling All pages mid-audit still converges to a multi-page result', async ({ page }) => {
  await page.goto('/demo/index.html?pages=12');
  await page.waitForSelector('.gjs-as-root', { timeout: 20_000 });
  await page.click('.gjs-as-tab:has-text("Accessibility")');

  // As soon as the FIRST finding renders (single-page audit in flight), flip the
  // All-pages toggle without waiting for it to settle — this is the race.
  await page.waitForSelector('.gjs-as-item', { timeout: 20_000 });
  await page.click('.gjs-as-btn:has-text("All pages")');

  // The all-pages run must complete and tag findings across several pages.
  const distinctBadges = async () =>
    page.$$eval('.gjs-as-badge', (els) => [...new Set(els.map((e) => e.textContent))]);
  await expect
    .poll(async () => (await distinctBadges()).length, { timeout: 15_000 })
    .toBeGreaterThanOrEqual(3);

  // And the public results reflect more than a single page (not stuck on one).
  const pageCount = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (window as any).editor.A11ySeo.getResults() as Array<{ pageName?: string }>;
    return new Set(results.map((r) => r.pageName)).size;
  });
  expect(pageCount).toBeGreaterThanOrEqual(3);
});
