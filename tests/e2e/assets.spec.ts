import { test, expect } from '@playwright/test';

/**
 * Image URL fields (JSON-LD image/logo, OG image) can pick from the GrapesJS
 * Asset Manager instead of typing a URL. The demo seeds a few offline SVG
 * assets so the picker has content.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/demo/index.html');
  await page.waitForSelector('.gjs-as-root', { timeout: 20_000 });
  await page.click('.gjs-as-tab:has-text("SEO")');
});

function seoPane(page: import('@playwright/test').Page) {
  return page.locator('.gjs-as-pane[data-tab="seo"]');
}

const getHead = (page: import('@playwright/test').Page) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page.evaluate(() => (window as any).editor.A11ySeo.getHeadHtml() as string);

test('JSON-LD image field picks an image from the Asset Manager', async ({ page }) => {
  const seo = seoPane(page);
  await seo.locator('.gjs-as-ld-chip', { hasText: 'Article' }).click();

  const card = seo.locator('.gjs-as-ld-card', { hasText: 'Article' }).first();
  await card.locator('.gjs-as-asset-btn').first().click();

  // The Asset Manager modal opens with the seeded assets.
  await expect(page.locator('.gjs-mdl-dialog')).toBeVisible();
  await expect(page.locator('.gjs-am-asset')).toHaveCount(4);

  // Choosing an asset fills the field and closes the manager.
  await page.locator('.gjs-am-asset').first().dblclick();
  await expect(page.locator('.gjs-mdl-dialog')).toBeHidden();

  expect(await getHead(page)).toContain('data:image/svg');
});

test('OG image field picks from the Asset Manager', async ({ page }) => {
  const seo = seoPane(page);
  // The OG image field is the one wired for asset picking in the Social section.
  const ogField = seo.locator('.gjs-as-field', { hasText: 'OG image' }).first();
  await ogField.locator('.gjs-as-asset-btn').click();

  await expect(page.locator('.gjs-mdl-dialog')).toBeVisible();
  await page.locator('.gjs-am-asset').nth(1).dblclick();
  await expect(page.locator('.gjs-mdl-dialog')).toBeHidden();

  // The chosen URL landed in the OG image input.
  const val = await ogField.locator('input').inputValue();
  expect(val).toContain('data:image/svg');
});
