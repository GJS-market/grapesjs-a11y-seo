import type { Rule, RuleFinding } from '../../types';
import { applyAttrs, uniqueId } from '../quickfix';

/**
 * Duplicate ids. Cited as 4.1.1 Parsing under WCAG 2.0/2.1; that criterion was
 * removed in WCAG 2.2, where duplicate ids surface via 1.3.1 / 4.1.2 instead —
 * so the citation is version-aware.
 */
export const duplicateId: Rule = {
  id: 'duplicate-id',
  title: 'Duplicate id',
  severity: 'warning',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/parsing.html',
  run(ctx) {
    const out: RuleFinding[] = [];
    const wcag =
      ctx.opts.wcagVersion === '2.2' ? 'WCAG 1.3.1 (A)' : 'WCAG 4.1.1 (A)';
    const byId = new Map<string, typeof ctx.walk>();
    for (const node of ctx.walk) {
      const id = node.el.getAttribute('id');
      if (!id) continue;
      const list = byId.get(id) ?? [];
      list.push(node);
      byId.set(id, list);
    }
    for (const [id, nodes] of byId) {
      if (nodes.length < 2) continue;
      // Flag every duplicate after the first; fix re-generates its id.
      nodes.slice(1).forEach(({ component, el }) => {
        out.push({
          wcag,
          message: ctx.t('duplicate-id.dup', { id }),
          component,
          el,
          fixLabel: 'new id',
          fix: () => applyAttrs(el, component, { id: uniqueId(id) }),
        });
      });
    }
    return out;
  },
};
