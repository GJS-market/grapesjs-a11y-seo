import type { Rule, RuleFinding } from '../../types';
import { isHidden } from '../../utils/dom';
import { applyAttrs } from '../quickfix';

const LABELABLE = new Set(['INPUT', 'SELECT', 'TEXTAREA']);
const NO_LABEL_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image']);

/** 1.3.1 / 3.3.2 / 4.1.2 — every form control needs a programmatic label. */
export const formLabels: Rule = {
  id: 'form-labels',
  title: 'Form labels',
  severity: 'error',
  wcag: 'WCAG 4.1.2 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
  run(ctx) {
    const out: RuleFinding[] = [];
    const doc = ctx.doc;
    for (const { component, el } of ctx.walk) {
      if (!LABELABLE.has(el.tagName)) continue;
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (el.tagName === 'INPUT' && NO_LABEL_TYPES.has(type)) continue;
      const style = ctx.style(el);
      if (isHidden(el, style)) continue;

      const id = el.getAttribute('id');
      const hasWrappingLabel = !!el.closest('label');
      const hasForLabel = !!(id && doc.querySelector(`label[for="${cssEscape(id)}"]`));
      const hasAria = !!(el.getAttribute('aria-label')?.trim() || el.getAttribute('aria-labelledby')?.trim());
      const hasTitle = !!el.getAttribute('title')?.trim();

      if (!hasWrappingLabel && !hasForLabel && !hasAria && !hasTitle) {
        const placeholder = el.getAttribute('placeholder')?.trim();
        out.push({
          message: placeholder ? ctx.t('form-labels.placeholderOnly') : ctx.t('form-labels.missing'),
          component,
          el,
          fixLabel: 'aria-label',
          fix: () =>
            applyAttrs(el, component, {
              'aria-label': placeholder || ctx.t('form-labels.placeholderText'),
            }),
        });
      }

      if (el.tagName !== 'SELECT' && !el.getAttribute('name') && type !== 'button') {
        out.push({
          severity: 'info',
          message: ctx.t('form-labels.noName'),
          component,
          el,
        });
      }
    }
    return out;
  },
};

function cssEscape(s: string): string {
  return s.replace(/["\\]/g, '\\$&');
}
