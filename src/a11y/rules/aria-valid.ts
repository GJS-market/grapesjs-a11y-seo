import type { Rule, RuleFinding } from '../../types';

// A pragmatic subset of the ARIA 1.2 role list — enough to catch typos and
// invented roles without shipping the full taxonomy.
const VALID_ROLES = new Set([
  'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell',
  'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo',
  'definition', 'dialog', 'directory', 'document', 'feed', 'figure', 'form',
  'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox',
  'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'navigation', 'none', 'note', 'option',
  'presentation', 'progressbar', 'radio', 'radiogroup', 'region', 'row',
  'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
  'slider', 'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist',
  'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree',
  'treegrid', 'treeitem',
]);

const IDREF_ATTRS = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns'];

/** 4.1.2 Name, Role, Value — roles and ARIA references must be valid. */
export const ariaValid: Rule = {
  id: 'aria-valid',
  title: 'Valid ARIA',
  severity: 'error',
  wcag: 'WCAG 4.1.2 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
  run(ctx) {
    const out: RuleFinding[] = [];
    const doc = ctx.doc;
    for (const { component, el } of ctx.walk) {
      const role = el.getAttribute('role');
      if (role) {
        for (const token of role.split(/\s+/).filter(Boolean)) {
          if (!VALID_ROLES.has(token)) {
            out.push({ message: ctx.t('aria-valid.badRole', { role: token }), component, el });
          }
        }
      }
      for (const attr of IDREF_ATTRS) {
        const val = el.getAttribute(attr);
        if (!val) continue;
        for (const id of val.split(/\s+/).filter(Boolean)) {
          if (!doc.getElementById(id)) {
            out.push({
              message: ctx.t('aria-valid.badRef', { attr, id }),
              component,
              el,
            });
          }
        }
      }
    }
    return out;
  },
};
