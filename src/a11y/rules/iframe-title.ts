import type { Component } from 'grapesjs';
import type { Rule, RuleFinding } from '../../types';
import { applyAttrs, resolveTarget } from '../quickfix';

/**
 * 4.1.2 / 2.4.1 — iframes need a title. GrapesJS renders an iframe component
 * inside a placeholder `<div>` in the editor, so the title we set via the
 * component API isn't visible on the live `<iframe>` — we therefore also read
 * the owning component's attributes (which is what serializes to `<iframe
 * title>` on export), so the finding clears after a fix.
 */
export const iframeTitle: Rule = {
  id: 'iframe-title',
  title: 'Iframe title',
  severity: 'warning',
  wcag: 'WCAG 4.1.2 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
  run(ctx) {
    const out: RuleFinding[] = [];
    for (const { component, el } of ctx.walk) {
      if (el.tagName !== 'IFRAME') continue;
      const target = resolveTarget(el, component);
      const attrs = compAttr(target);
      const title = (el.getAttribute('title') || attrs.title || '').trim();
      const aria = (el.getAttribute('aria-label') || attrs['aria-label'] || '').trim();
      if (!title && !aria) {
        out.push({
          message: ctx.t('iframe-title.missing'),
          component,
          el,
          fixLabel: 'title',
          fix: () => applyAttrs(el, component, { title: ctx.t('iframe-title.placeholder') }),
        });
      }
    }
    return out;
  },
};

function compAttr(target: Component | null): Record<string, string> {
  if (!target) return {};
  const a = target.getAttributes() as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) out[k] = v == null ? '' : String(v);
  return out;
}
