import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/demo/index.html');
  await page.waitForSelector('.gjs-as-root', { timeout: 20_000 });
  await page.click('.gjs-as-tab:has-text("SEO")');
});

function seoPane(page: import('@playwright/test').Page) {
  return page.locator('.gjs-as-pane[data-tab="seo"]');
}

test('JSON-LD: add Article via chip, fill fields → Valid, and it exports', async ({ page }) => {
  const seo = seoPane(page);
  await seo.locator('.gjs-as-ld-chip', { hasText: 'Article' }).click();

  const card = seo.locator('.gjs-as-ld-card', { hasText: 'Article' }).first();
  await expect(card.locator('.gjs-as-ld-pill')).toContainText('missing');

  await card.getByLabel('Headline *').fill('Our launch announcement');
  await card.getByLabel('Author name *').fill('Ada Lovelace');
  await card.getByLabel('Date published *').fill('2026-01-15');

  await expect(card.locator('.gjs-as-ld-pill')).toContainText('Valid');

  const head = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).editor.A11ySeo.getHeadHtml();
  });
  expect(head).toContain('application/ld+json');
  expect(head).toContain('Our launch announcement');
  expect(head).toContain('Ada Lovelace');
  expect(head).not.toContain('"description":""');
});

test('JSON-LD: card collapses and expands from the header', async ({ page }) => {
  const seo = seoPane(page);
  await seo.locator('.gjs-as-ld-chip', { hasText: 'WebSite' }).click();
  const card = seo.locator('.gjs-as-ld-card', { hasText: 'WebSite' }).first();
  await expect(card.locator('.gjs-as-ld-body')).toBeVisible();
  await card.locator('.gjs-as-ld-header').click();
  await expect(card.locator('.gjs-as-ld-body')).toBeHidden();
  await card.locator('.gjs-as-ld-header').click();
  await expect(card.locator('.gjs-as-ld-body')).toBeVisible();
});

test('JSON-LD: Duplicate creates a second card', async ({ page }) => {
  const seo = seoPane(page);
  await seo.locator('.gjs-as-ld-chip', { hasText: 'Organization' }).click();
  await seo.locator('.gjs-as-ld-card', { hasText: 'Organization' }).first().getByLabel('Duplicate').click();
  await expect(seo.locator('.gjs-as-ld-card', { hasText: 'Organization' })).toHaveCount(2);
});

test('JSON-LD: Auto-fill from page populates empty fields', async ({ page }) => {
  const seo = seoPane(page);
  await seo.locator('.gjs-as-ld-chip', { hasText: 'Article' }).click();
  await seo.locator('.gjs-as-ld-card', { hasText: 'Article' }).first().getByLabel('Auto-fill from page').click();
  // The demo "home" page has an <h1>Welcome</h1>; auto-fill maps it to headline.
  const head = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).editor.A11ySeo.getHeadHtml();
  });
  expect(head).toContain('Welcome');
});

test('JSON-LD: FAQ with repeatable questions', async ({ page }) => {
  const seo = seoPane(page);
  await seo.locator('.gjs-as-ld-chip', { hasText: 'FAQ' }).click();
  const card = seo.locator('.gjs-as-ld-card', { hasText: 'FAQPage' }).first();

  await card.getByLabel('Question').first().fill('What is it?');
  await card.getByLabel('Answer').first().fill('An a11y + SEO auditor.');
  await card.locator('.gjs-as-ld-add').click();
  await expect(card.getByLabel('Question')).toHaveCount(2);
  await card.getByLabel('Question').nth(1).fill('Is it free?');
  await card.getByLabel('Answer').nth(1).fill('Yes, MIT.');

  const head = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).editor.A11ySeo.getHeadHtml();
  });
  expect(head).toContain('What is it?');
  expect(head).toContain('Is it free?');
});

test('JSON-LD: Advanced JSON — Format + edit replaces the block', async ({ page }) => {
  const seo = seoPane(page);
  await seo.locator('.gjs-as-ld-chip', { hasText: 'WebSite' }).click();
  const card = seo.locator('.gjs-as-ld-card', { hasText: 'WebSite' }).first();
  await card.locator('summary', { hasText: 'Advanced' }).click();
  const ta = card.locator('textarea.gjs-as-ld-json');
  await ta.fill('{"@type":"WebSite","name":"My Site","url":"https://my.site"}');
  await card.locator('.gjs-as-link', { hasText: 'Format' }).click();
  const head = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).editor.A11ySeo.getHeadHtml();
  });
  expect(head).toContain('My Site');
  expect(head).toContain('https://my.site');
});
