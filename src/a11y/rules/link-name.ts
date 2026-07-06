import type { Rule, RuleFinding } from '../../types';
import { accessibleName, isHidden } from '../../utils/dom';
import { applyAttrs } from '../quickfix';

const VAGUE = ['click here', 'here', 'read more', 'more', 'learn more', 'link', 'this', 'подробнее', 'здесь', 'тут'];

/** 2.4.4 Link Purpose — links need a discernible, meaningful accessible name. */
export const linkName: Rule = {
  id: 'link-name',
  title: 'Link name',
  severity: 'error',
  wcag: 'WCAG 2.4.4 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
  run(ctx) {
    const out: RuleFinding[] = [];
    for (const { component, el } of ctx.walk) {
      if (el.tagName !== 'A') continue;
      const style = ctx.style(el);
      if (isHidden(el, style)) continue;

      const name = accessibleName(el);
      const href = el.getAttribute('href');

      if (!name) {
        out.push({
          message: ctx.t('link-name.empty'),
          component,
          el,
          fixLabel: 'aria-label',
          fix: () => applyAttrs(el, component, { 'aria-label': ctx.t('link-name.placeholder') }),
        });
        continue;
      }
      if (VAGUE.includes(name.trim().toLowerCase())) {
        out.push({
          severity: 'warning',
          message: ctx.t('link-name.vague', { text: name.trim() }),
          component,
          el,
        });
      }
      if (href == null || href === '' || href === '#') {
        out.push({
          severity: 'warning',
          message: ctx.t('link-name.noHref'),
          component,
          el,
        });
      }
    }
    return out;
  },
};
