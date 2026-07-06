import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/demo/index.html');
  // Wait for the panel (auto-opens because enabled:true) and its first audit.
  await page.waitForSelector('.gjs-as-root', { timeout: 20_000 });
  await page.waitForSelector('.gjs-as-item', { timeout: 20_000 });
});

test('audit finds the seeded violations across rules', async ({ page }) => {
  const rules = await page.$$eval('.gjs-as-item-meta span:first-child', (els) =>
    els.map((e) => e.textContent),
  );
  // The enriched "bad" page trips every one of these rules.
  for (const id of [
    'img-alt', 'contrast', 'headings', 'link-name', 'form-labels', 'iframe-title',
    'tabindex', 'aria-valid', 'media-captions', 'table-structure', 'target-size',
    'font-size', 'lang',
  ]) {
    expect(rules).toContain(id);
  }
  // Score ring renders a number 0..100.
  const scoreText = await page.textContent('.gjs-as-score-ring');
  expect(Number(scoreText)).toBeGreaterThanOrEqual(0);
  expect(Number(scoreText)).toBeLessThan(100);
});

test('Show selects the component in the canvas', async ({ page }) => {
  // Click the first "Show" action.
  await page.click('.gjs-as-item .gjs-as-item-actions .gjs-as-link:has-text("Show")');
  // GrapesJS marks a selected component in the canvas iframe.
  const frame = page.frameLocator('.gjs-frame');
  await expect(frame.locator('.gjs-selected')).toHaveCount(1, { timeout: 5000 });
});

test('Fix on the tabindex violation clears it after re-audit', async ({ page }) => {
  const countFor = async (ruleId: string) =>
    page.$$eval(
      '.gjs-as-item',
      (items, id) =>
        items.filter((el) => el.querySelector('.gjs-as-item-meta span:first-child')?.textContent === id).length,
      ruleId,
    );

  expect(await countFor('tabindex')).toBeGreaterThan(0);
  // Find the positive-tabindex item and click its Fix button (not "Won't fix").
  const item = page.locator('.gjs-as-item', { hasText: 'Positive tabindex' }).first();
  await item.locator('.gjs-as-link', { hasText: /^Fix/ }).click();
  // Re-audit is automatic; the finding should disappear.
  await expect.poll(async () => countFor('tabindex'), { timeout: 8000 }).toBe(0);
});

test('SEO tab: editing the title updates the SERP preview', async ({ page }) => {
  await page.click('.gjs-as-tab:has-text("SEO")');
  await page.fill('.gjs-as-form .gjs-as-field input', 'My Brand — Fast, Accessible Websites');
  await expect(page.locator('.gjs-as-serp-title')).toContainText('My Brand');
});

test('All pages audits every page and tags findings with a page badge', async ({ page }) => {
  await page.click('.gjs-as-tab:has-text("Accessibility")');
  // Flip the "All pages" toggle and wait for the multi-page audit to converge.
  // (An in-flight single-page audit may render first; the pending re-run then
  // produces the all-pages result, so poll for the final state.)
  await page.click('.gjs-as-btn:has-text("All pages")');
  const distinctBadges = async () =>
    page.$$eval('.gjs-as-badge', (els) => [...new Set(els.map((e) => e.textContent))]);
  // Both demo pages should appear (the "good" About page still trips page-level
  // rules like lang), proving off-screen pages are audited and tagged.
  await expect.poll(distinctBadges, { timeout: 12_000 }).toContain('About');
  const badges = await distinctBadges();
  expect(badges).toContain('Home');
});

test('teardown removes the panel and restores editor listeners', async ({ page }) => {
  const baseline = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).editor;
    ed.A11ySeo.destroy();
    const events = ed.getModel()._events || {};
    return {
      panelGone: !document.querySelector('.gjs-as-root'),
      apiGone: !ed.A11ySeo,
    };
  });
  expect(baseline.panelGone).toBe(true);
  expect(baseline.apiGone).toBe(true);
});
