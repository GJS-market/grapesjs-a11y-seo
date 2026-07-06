import type { Rule, RuleFinding } from '../../types';
import { parseColor, toHex } from '../../utils/color';
import { fontSizePx, isBold, isHidden, ownText } from '../../utils/dom';
import { isLargeText, passes, requiredRatio, suggestForeground } from '../contrast';
import { applyStyle } from '../quickfix';

/** 1.4.3 / 1.4.6 Contrast — text must contrast sufficiently with its background. */
export const contrast: Rule = {
  id: 'contrast',
  title: 'Text contrast',
  severity: 'error',
  wcag: 'WCAG 1.4.3 (AA)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
  needsLayout: true,
  run(ctx) {
    const out: RuleFinding[] = [];
    const level = ctx.opts.wcagLevel;
    for (const { component, el } of ctx.walk) {
      const text = ownText(el);
      if (!text) continue; // only elements with their own text runs
      const style = ctx.style(el);
      if (isHidden(el, style)) continue;

      const fg = parseColor(style.color);
      if (!fg || fg.a === 0) continue;

      // Background image / gradient → contrast is not reliably checkable.
      if ((el as unknown as { __asBgImage?: boolean }).__asBgImage) {
        out.push({
          severity: 'info',
          message: ctx.t('contrast.unverifiable'),
          component,
          el,
        });
        continue;
      }

      const bg = ctx.getBg(el);
      const ratio = ctx.contrast(fg, bg);
      const large = isLargeText(fontSizePx(style), isBold(style));
      if (passes(ratio, large, level)) continue;

      const suggestion = suggestForeground(fg, bg, large, level);
      const suggestedHex = suggestion ? toHex(suggestion) : '';
      out.push({
        message: ctx.t('contrast.low', {
          ratio: ratio.toFixed(2),
          required: requiredRatio(large, level),
          suggestion: suggestedHex || '—',
        }),
        component,
        el,
        // The computed passing colour becomes a one-click fix.
        ...(suggestedHex
          ? {
              fixLabel: `color ${suggestedHex}`,
              fix: () => applyStyle(el, component, { color: suggestedHex }),
            }
          : {}),
      });
    }
    return out;
  },
};
