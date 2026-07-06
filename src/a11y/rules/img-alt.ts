import type { Rule } from '../../types';
import { applyAttrs } from '../quickfix';

/** 1.1.1 Non-text Content — images must have appropriate text alternatives. */
export const imgAlt: Rule = {
  id: 'img-alt',
  title: 'Image alternative text',
  severity: 'error',
  wcag: 'WCAG 1.1.1 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
  run(ctx) {
    const out = [];
    for (const { component, el } of ctx.walk) {
      if (el.tagName !== 'IMG') continue;
      const hasAlt = el.hasAttribute('alt');
      const alt = el.getAttribute('alt') ?? '';
      const role = el.getAttribute('role');
      const decorative = role === 'presentation' || role === 'none';

      if (!hasAlt) {
        out.push({
          message: ctx.t('img-alt.missing'),
          component,
          el,
          fixLabel: 'alt=""',
          fix: () => applyAttrs(el, component, { alt: '' }),
        });
        continue;
      }
      if (decorative) continue;

      const src = el.getAttribute('src') || '';
      const file = src.split('/').pop() || '';
      const fileNoExt = file.replace(/\.[a-z0-9]+$/i, '');
      if (alt && fileNoExt && alt.trim().toLowerCase() === fileNoExt.toLowerCase()) {
        out.push({
          severity: 'warning' as const,
          message: ctx.t('img-alt.filename', { alt }),
          component,
          el,
        });
      }
    }
    return out;
  },
};
