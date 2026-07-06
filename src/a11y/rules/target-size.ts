import type { Rule, RuleFinding } from '../../types';
import { isInteractive, isHidden } from '../../utils/dom';

/** 2.5.8 / 2.5.5 Target Size — interactive targets must be large enough. */
export const targetSize: Rule = {
  id: 'target-size',
  title: 'Target size',
  severity: 'warning',
  wcag: 'WCAG 2.5.8 (AA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
  needsLayout: true,
  run(ctx) {
    const out: RuleFinding[] = [];
    const min = ctx.opts.wcagLevel === 'AAA' ? 44 : 24;
    for (const { component, el } of ctx.walk) {
      if (!isInteractive(el)) continue;
      const style = ctx.style(el);
      if (isHidden(el, style)) continue;
      // Inline links in a text flow are exempt from the minimum.
      if (el.tagName === 'A' && style.display.startsWith('inline')) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.width < min || rect.height < min) {
        out.push({
          message: ctx.t('target-size.small', {
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            min,
          }),
          component,
          el,
        });
      }
    }
    return out;
  },
};
