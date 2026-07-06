import type { Rule, RuleFinding } from '../../types';
import { focusableElements, tabOrder, visualOrder } from '../focus-order';

/**
 * 2.4.3 Focus Order — the keyboard tab sequence should follow the visual
 * reading order. Flags elements whose position in the tab order differs
 * markedly from their position in the visual (top→bottom, left→right) order —
 * a common symptom of positive `tabindex` or reordered layout. Pure geometry +
 * tabindex, so it needs real layout.
 */
export const visualFocusMismatch: Rule = {
  id: 'visual-focus-mismatch',
  title: 'Focus order vs. visual order',
  severity: 'warning',
  wcag: 'WCAG 2.4.3 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
  needsLayout: true,
  run(ctx) {
    const out: RuleFinding[] = [];
    const focusable = focusableElements(ctx.doc);
    if (focusable.length < 3) return out;

    const tab = tabOrder(focusable);
    const visual = visualOrder(focusable);
    const visualIndex = new Map<HTMLElement, number>();
    visual.forEach((el, i) => visualIndex.set(el, i));

    // Flag an element whose tab position is far from its visual position.
    tab.forEach((el, tabIdx) => {
      const visIdx = visualIndex.get(el) ?? tabIdx;
      if (Math.abs(visIdx - tabIdx) >= 2) {
        out.push({
          message: ctx.t('visual-focus-mismatch.msg', { tab: tabIdx + 1, visual: visIdx + 1 }),
          component: ctx.elToComp.get(el) ?? null,
          el,
        });
      }
    });
    return out;
  },
};
