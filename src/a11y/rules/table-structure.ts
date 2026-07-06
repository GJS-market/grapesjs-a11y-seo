import type { Rule, RuleFinding } from '../../types';

/** 1.3.1 — data tables need header cells (and ideally a caption). */
export const tableStructure: Rule = {
  id: 'table-structure',
  title: 'Table structure',
  severity: 'warning',
  wcag: 'WCAG 1.3.1 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
  run(ctx) {
    const out: RuleFinding[] = [];
    for (const { component, el } of ctx.walk) {
      if (el.tagName !== 'TABLE') continue;
      // Layout tables opt out via role.
      const role = el.getAttribute('role');
      if (role === 'presentation' || role === 'none') continue;

      const rows = el.querySelectorAll('tr').length;
      if (rows < 2) continue; // too small to be a meaningful data table

      const hasTh = !!el.querySelector('th');
      if (!hasTh) {
        out.push({ message: ctx.t('table-structure.noTh'), component, el });
      } else {
        const scopedOrHeaders = !!el.querySelector('th[scope], td[headers]');
        if (!scopedOrHeaders && el.querySelectorAll('th').length > 2) {
          out.push({ severity: 'info', message: ctx.t('table-structure.noScope'), component, el });
        }
      }
      if (!el.querySelector('caption')) {
        out.push({ severity: 'info', message: ctx.t('table-structure.noCaption'), component, el });
      }
    }
    return out;
  },
};
