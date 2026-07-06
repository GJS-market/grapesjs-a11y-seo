import type { Rule, RuleFinding } from '../../types';
import { isHidden, ownText } from '../../utils/dom';
import { applyTag } from '../quickfix';

const LEVEL = /^H([1-6])$/;

/** 1.3.1 / 2.4.6 — logical heading structure: one h1, no skipped levels. */
export const headings: Rule = {
  id: 'headings',
  title: 'Heading structure',
  severity: 'warning',
  wcag: 'WCAG 1.3.1 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
  run(ctx) {
    const out: RuleFinding[] = [];
    const heads = ctx.walk
      .map((n) => ({ ...n, m: LEVEL.exec(n.el.tagName) }))
      .filter((n) => n.m);

    let h1Count = 0;
    let prev = 0;
    for (const node of heads) {
      const level = parseInt(node.m![1], 10);
      const style = ctx.style(node.el);
      if (isHidden(node.el, style)) continue;

      if (level === 1) h1Count++;
      if (!ownText(node.el) && !node.el.textContent?.trim()) {
        out.push({
          severity: 'error',
          message: ctx.t('headings.empty', { level }),
          component: node.component,
          el: node.el,
        });
      }
      if (prev && level > prev + 1) {
        const fixLevel = prev + 1;
        out.push({
          message: ctx.t('headings.skip', { from: prev, to: level, fix: fixLevel }),
          component: node.component,
          el: node.el,
          fixLabel: `h${fixLevel}`,
          fix: () => applyTag(node.el, node.component, `h${fixLevel}`),
        });
      }
      prev = level;
    }

    if (heads.length && h1Count === 0) {
      out.push({ severity: 'warning', message: ctx.t('headings.noH1') });
    }
    if (h1Count > 1) {
      out.push({ severity: 'warning', message: ctx.t('headings.multipleH1', { count: h1Count }) });
    }
    return out;
  },
};
