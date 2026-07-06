import { describe, it, expect } from 'vitest';
import { runAuditHeadless } from './headless';

describe('runAuditHeadless', () => {
  it('finds structural violations without a browser', () => {
    const html = `<!doctype html><html><body>
      <h1>A</h1><h3>skip</h3>
      <img src="x.jpg">
      <a href="#"></a>
      <input type="text" placeholder="email">
      <iframe src="x"></iframe>
    </body></html>`;
    const ids = new Set(runAuditHeadless(html).map((v) => v.ruleId));
    for (const id of ['img-alt', 'link-name', 'form-labels', 'iframe-title', 'landmarks', 'lang', 'headings']) {
      expect(ids, `expected ${id}`).toContain(id);
    }
  });

  it('skips layout-dependent rules (no contrast/target-size/font-size)', () => {
    const html = `<p style="color:#aaa;font-size:8px">x</p>`;
    const ids = new Set(runAuditHeadless(html).map((v) => v.ruleId));
    expect(ids.has('contrast')).toBe(false);
    expect(ids.has('font-size')).toBe(false);
    expect(ids.has('target-size')).toBe(false);
  });

  it('returns no findings for clean HTML', () => {
    const html = `<!doctype html><html lang="en"><body><main><h1>Hi</h1><img src="a.jpg" alt="a cat"></main></body></html>`;
    const violations = runAuditHeadless(html);
    expect(violations.map((v) => v.ruleId)).not.toContain('img-alt');
    expect(violations.map((v) => v.ruleId)).not.toContain('lang');
  });

  it('findings carry no component/el (serializable)', () => {
    const v = runAuditHeadless('<img src="x.jpg">').find((x) => x.ruleId === 'img-alt');
    expect(v).toBeDefined();
    expect(v!.component).toBeUndefined();
    expect(v!.el).toBeUndefined();
  });

  it('honors disableRules', () => {
    const ids = new Set(runAuditHeadless('<img src="x.jpg">', { disableRules: ['img-alt'] }).map((v) => v.ruleId));
    expect(ids.has('img-alt')).toBe(false);
  });
});
