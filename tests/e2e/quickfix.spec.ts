import { test, expect } from '@playwright/test';

// Block 0/1 regression: for every rule with a quick-fix, clicking Fix must
// remove that finding from the list WITHOUT a manual "Run audit", and the
// change must be undoable (goes through the component API).

async function countByRule(page: import('@playwright/test').Page, ruleId: string): Promise<number> {
  return page.$$eval(
    '.gjs-as-item',
    (items, id) =>
      items.filter((el) => el.querySelector('.gjs-as-item-meta span:first-child')?.textContent === id).length,
    ruleId,
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/demo/index.html');
  await page.waitForSelector('.gjs-as-item', { timeout: 20_000 });
});

const FIXABLE = ['img-alt', 'headings', 'link-name', 'form-labels', 'tabindex', 'iframe-title', 'media-captions', 'contrast'];

for (const ruleId of FIXABLE) {
  test(`Fix clears a "${ruleId}" finding without manual Run`, async ({ page }) => {
    expect(await countByRule(page, ruleId), `demo should seed a ${ruleId} finding`).toBeGreaterThan(0);

    // Grab the first row of this rule that has a Fix button, remember its exact
    // message, click Fix, and assert that specific finding is gone (fixing one
    // finding can surface a different finding of the same rule, so we key on the
    // message rather than the rule count).
    const row = page
      .locator('.gjs-as-item', {
        has: page.locator('.gjs-as-item-meta span:first-child', { hasText: new RegExp(`^${ruleId}$`) }),
      })
      .filter({ has: page.locator('.gjs-as-link', { hasText: /^Fix/ }) })
      .first();
    const message = (await row.locator('.gjs-as-item-msg').first().textContent())?.trim() || '';
    expect(message).not.toBe('');
    await row.locator('.gjs-as-link', { hasText: /^Fix/ }).first().click();

    await expect
      .poll(() => page.locator('.gjs-as-item-msg', { hasText: message }).count(), { timeout: 8000 })
      .toBe(0);
  });
}

test('a fix is undoable (component API, not raw DOM)', async ({ page }) => {
  const hasUndo = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).editor;
    const before = ed.UndoManager.hasUndo();
    // Apply the first available fix directly.
    const v = ed.A11ySeo.getResults().find((x: any) => x.fix);
    v.fix();
    return { before, after: ed.UndoManager.hasUndo() };
  });
  expect(hasUndo.after).toBe(true);
});

test('Fix all safe applies every fix as ONE undo group', async ({ page }) => {
  const info = await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).editor;
    const fixableCount = () => ed.A11ySeo.runAudit().filter((v: any) => v.fix).length;
    const before = fixableCount();
    const btns = [...document.querySelectorAll('.gjs-as-btn')];
    (btns.find((b) => /Fix all/.test(b.textContent || '')) as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 1500));
    const afterFix = fixableCount();
    // A single undo must revert the WHOLE batch (mutations coalesce into one
    // magic-fusion group), bringing the fixable findings back.
    ed.UndoManager.undo();
    await new Promise((r) => setTimeout(r, 300));
    const afterUndo = fixableCount();
    return { before, afterFix, afterUndo };
  });
  expect(info.before).toBeGreaterThan(1);
  expect(info.afterFix).toBeLessThan(info.before); // fixes applied
  expect(info.afterUndo).toBeGreaterThan(info.afterFix); // one undo reverted the batch
});
