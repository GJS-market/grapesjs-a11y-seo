import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/demo/index.html');
  await page.waitForSelector('.gjs-as-item', { timeout: 20_000 });
});

test('Layer Manager badges appear for components with issues', async ({ page }) => {
  // The demo doesn't mount the Layer Manager, so render it here, then re-audit
  // to paint severity dots onto the freshly rendered rows.
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).editor;
    const host = document.createElement('div');
    document.body.appendChild(host);
    host.appendChild(ed.Layers.render());
    ed.A11ySeo.runAudit();
  });
  await expect.poll(() => page.locator('.gjs-as-layer-badge').count(), { timeout: 10_000 }).toBeGreaterThan(0);
});

test('Highlight issues draws persistent overlay boxes', async ({ page }) => {
  await page.click('.gjs-as-btn:has-text("Highlight issues")');
  await expect.poll(() => page.locator('.gjs-as-overlay-persistent-box').count(), { timeout: 5000 }).toBeGreaterThan(0);
  // Toggling off clears them.
  await page.click('.gjs-as-btn:has-text("Highlight issues")');
  await expect.poll(() => page.locator('.gjs-as-overlay-persistent-box').count(), { timeout: 5000 }).toBe(0);
});

test('Show tab order draws numbered focus dots', async ({ page }) => {
  await page.click('.gjs-as-btn:has-text("Show tab order")');
  await expect.poll(() => page.locator('.gjs-as-focus-dot').count(), { timeout: 5000 }).toBeGreaterThan(1);
});

test('Settings: disabling a rule hides its findings and persists', async ({ page }) => {
  const imgAltBefore = await page.$$eval('.gjs-as-item-meta span:first-child', (els) =>
    els.filter((e) => e.textContent === 'img-alt').length,
  );
  expect(imgAltBefore).toBeGreaterThan(0);

  // Go to Settings and untick img-alt.
  await page.click('.gjs-as-tab:has-text("Settings")');
  const cb = page.locator('.gjs-as-rules label', { hasText: /^\s*img-alt$/ }).locator('input[type="checkbox"]');
  await cb.uncheck();

  // Back to Accessibility — img-alt findings gone.
  await page.click('.gjs-as-tab:has-text("Accessibility")');
  await expect
    .poll(
      () => page.$$eval('.gjs-as-item-meta span:first-child', (els) => els.filter((e) => e.textContent === 'img-alt').length),
      { timeout: 6000 },
    )
    .toBe(0);

  // The setting is persisted in projectData.
  const persisted = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).editor;
    return ed.getProjectData().a11ySeoState?.settings?.disabledRules || [];
  });
  expect(persisted).toContain('img-alt');
});

test('Baseline: "Won\'t fix" moves a finding to Accepted and persists', async ({ page }) => {
  // Remember the first finding's message, mark it won't-fix.
  const firstRow = page.locator('.gjs-as-item').first();
  const msg = (await firstRow.locator('.gjs-as-item-msg').textContent())?.trim() || '';
  const scoreBefore = Number(await page.textContent('.gjs-as-score-ring'));
  await firstRow.locator('.gjs-as-link', { hasText: "Won't fix" }).click();

  // It leaves the default list...
  await expect.poll(() => page.locator('.gjs-as-item-msg', { hasText: msg }).count(), { timeout: 4000 }).toBe(0);
  // ...score improves (accepted findings don't count)...
  expect(Number(await page.textContent('.gjs-as-score-ring'))).toBeGreaterThanOrEqual(scoreBefore);
  // ...and shows under the Accepted filter.
  await page.click('.gjs-as-chip:has-text("Accepted")');
  await expect(page.locator('.gjs-as-item-msg', { hasText: msg })).toHaveCount(1);

  const baseline = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).editor;
    return Object.keys(ed.getProjectData().a11ySeoState?.baseline || {}).length;
  });
  expect(baseline).toBeGreaterThan(0);
});

test('Accessibility Tree shows name/role/state for the selected component', async ({ page }) => {
  // Select a component in the canvas via the API and check the tree appears.
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).editor;
    const link = ed.getWrapper().find('a')[0];
    ed.select(link);
  });
  await expect(page.locator('.gjs-as-tree')).toBeVisible();
  await expect(page.locator('.gjs-as-tree')).toContainText('Role');
  await expect(page.locator('.gjs-as-tree-val', { hasText: 'link' })).toBeVisible();
});

test('the panel passes its own accessibility checks', async ({ page }) => {
  const audit = await page.evaluate(() => {
    const root = document.querySelector('.gjs-as-root')!;
    const accName = (el: Element): string => {
      const aria = el.getAttribute('aria-label') || el.getAttribute('title') || '';
      if (aria.trim()) return aria.trim();
      const label = el.closest('label');
      if (label && (label.textContent || '').trim()) return (label.textContent || '').trim();
      if (el.tagName === 'BUTTON' || el.tagName === 'A') return (el.textContent || '').trim();
      return '';
    };
    const controls = [...root.querySelectorAll('button, a, input, select, textarea')];
    const unnamed = controls.filter((el) => !accName(el)).map((el) => el.outerHTML.slice(0, 80));
    return {
      unnamed,
      hasLive: !!root.querySelector('[aria-live]'),
      hasTablist: !!root.querySelector('[role="tablist"]'),
      hasRegion: root.getAttribute('role') === 'region',
    };
  });
  expect(audit.unnamed, `controls missing an accessible name:\n${audit.unnamed.join('\n')}`).toEqual([]);
  expect(audit.hasLive).toBe(true);
  expect(audit.hasTablist).toBe(true);
  expect(audit.hasRegion).toBe(true);
});

test('Escape closes the panel; aria-live announces the audit', async ({ page }) => {
  await expect.poll(async () => (await page.textContent('[aria-live]'))?.includes('Score') ?? false, { timeout: 8000 }).toBe(true);
  // Focus a control inside the panel, then Escape (keydown bubbles to the root).
  await page.locator('.gjs-as-toolbar .gjs-as-btn').first().focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('.gjs-as-root')).toBeHidden();
});

test('public API: badge + score history', async ({ page }) => {
  const info = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).editor;
    return { badge: ed.A11ySeo.getBadgeHtml(), history: ed.A11ySeo.getScoreHistory() };
  });
  expect(info.badge).toContain('grapesjs-a11y-seo');
  expect(info.badge).toContain('gjs.market');
  expect(Array.isArray(info.history)).toBe(true);
});

test('visual-focus-mismatch rule is registered', async ({ page }) => {
  const rules = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).editor;
    return ed.A11ySeo.runAudit().map((v: any) => v.ruleId);
  });
  // The demo's positive tabindex (Submit) reorders the tab sequence.
  expect(rules).toContain('visual-focus-mismatch');
});
