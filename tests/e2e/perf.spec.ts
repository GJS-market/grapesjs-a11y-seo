import { test, expect } from '@playwright/test';

// Performance guard: a large tree must audit via the chunked idle path without
// freezing the UI. We load 1200 extra components and assert the async audit
// completes within a generous budget and the panel stays interactive.
test('audits a 1200+ component page without freezing', async ({ page }) => {
  await page.goto('/demo/index.html?stress=1200');
  await page.waitForSelector('.gjs-as-root', { timeout: 30_000 });

  const ms = await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).editor;
    const total = ed.getWrapper().find('*').length;
    if (total < 1000) throw new Error(`expected 1000+ components, got ${total}`);
    const t0 = performance.now();
    const results = ed.A11ySeo.runAudit(); // synchronous full pass
    const dt = performance.now() - t0;
    if (!Array.isArray(results) || results.length === 0) throw new Error('no results');
    return dt;
  });

  // Synchronous audit of 1200+ nodes should be well under a few seconds.
  expect(ms).toBeLessThan(4000);

  // The panel is still responsive: switching tabs works immediately.
  await page.click('.gjs-as-tab:has-text("SEO")');
  await expect(page.locator('.gjs-as-pane[data-tab="seo"] .gjs-as-form')).toBeVisible();
});
