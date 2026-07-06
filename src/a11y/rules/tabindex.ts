import type { Rule, RuleFinding } from '../../types';
import { applyAttrs } from '../quickfix';

/** 2.4.3 Focus Order — positive tabindex breaks the natural focus order. */
export const tabindex: Rule = {
  id: 'tabindex',
  title: 'Tab order',
  severity: 'warning',
  wcag: 'WCAG 2.4.3 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
  run(ctx) {
    const out: RuleFinding[] = [];
    for (const { component, el } of ctx.walk) {
      const raw = el.getAttribute('tabindex');
      if (raw == null) continue;
      const value = parseInt(raw, 10);
      if (Number.isNaN(value)) continue;
      if (value > 0) {
        out.push({
          message: ctx.t('tabindex.positive', { value }),
          component,
          el,
          fixLabel: 'tabindex="0"',
          fix: () => applyAttrs(el, component, { tabindex: '0' }),
        });
      }
    }
    return out;
  },
};
