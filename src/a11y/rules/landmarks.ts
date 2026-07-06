import type { Rule, RuleFinding } from '../../types';
import { landmarkLabel } from '../../utils/dom';
import { applyAttrs } from '../quickfix';

/** 2.4.1 Bypass Blocks — pages need a main landmark and named regions. */
export const landmarks: Rule = {
  id: 'landmarks',
  title: 'Landmarks',
  severity: 'warning',
  wcag: 'WCAG 2.4.1 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html',
  run(ctx) {
    const out: RuleFinding[] = [];
    const mains = ctx.walk.filter(
      (n) => n.el.tagName === 'MAIN' || n.el.getAttribute('role') === 'main',
    );
    if (mains.length === 0) {
      out.push({ message: ctx.t('landmarks.noMain') });
    } else if (mains.length > 1) {
      out.push({ message: ctx.t('landmarks.multipleMain', { count: mains.length }) });
    }

    // nav / region landmarks that share a role should be distinguishable.
    const navs = ctx.walk.filter(
      (n) => n.el.tagName === 'NAV' || n.el.getAttribute('role') === 'navigation',
    );
    if (navs.length > 1) {
      for (const n of navs) {
        // A landmark's name must come from aria-label/aria-labelledby/title,
        // NOT its link text — so nav regions with only link content still count
        // as unnamed and need distinguishing labels.
        if (!landmarkLabel(n.el)) {
          out.push({
            severity: 'info',
            message: ctx.t('landmarks.unnamedNav'),
            component: n.component,
            el: n.el,
            fixLabel: 'aria-label',
            fix: () => applyAttrs(n.el, n.component, { 'aria-label': ctx.t('landmarks.navLabel') }),
          });
        }
      }
    }
    return out;
  },
};
