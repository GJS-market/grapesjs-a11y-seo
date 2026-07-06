import type { Rule, RuleFinding } from '../../types';
import { fontSizePx, isHidden, ownText } from '../../utils/dom';

/** 1.4.4 (advisory) — very small body text is hard to read. */
export const fontSize: Rule = {
  id: 'font-size',
  title: 'Font size',
  severity: 'info',
  wcag: 'WCAG 1.4.4 (AA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html',
  needsLayout: true,
  run(ctx) {
    const out: RuleFinding[] = [];
    const seen = new Set<string>();
    for (const { component, el } of ctx.walk) {
      if (!ownText(el)) continue;
      const style = ctx.style(el);
      if (isHidden(el, style)) continue;
      const px = fontSizePx(style);
      if (px < 12) {
        // De-dup by rounded size so a tiny-font block reports once per size.
        const key = `${px.toFixed(1)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          message: ctx.t('font-size.small', { px: px.toFixed(1) }),
          component,
          el,
        });
      }
    }
    return out;
  },
};
