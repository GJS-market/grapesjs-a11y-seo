import type { Rule, RuleFinding } from '../../types';

/** 3.1.1 Language of Page — the document needs a valid `lang`. */
export const lang: Rule = {
  id: 'lang',
  title: 'Page language',
  severity: 'warning',
  wcag: 'WCAG 3.1.1 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html',
  run(ctx) {
    const out: RuleFinding[] = [];
    const html = ctx.doc.documentElement;
    const langAttr = html?.getAttribute('lang')?.trim();
    if (!langAttr) {
      out.push({ message: ctx.t('lang.missing') });
    } else if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(langAttr)) {
      out.push({ severity: 'info', message: ctx.t('lang.invalid', { lang: langAttr }) });
    }
    return out;
  },
};
