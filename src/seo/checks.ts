import type { Editor } from 'grapesjs';
import type { ResolvedOptions, Severity } from '../types';
import type { SeoStore } from './SeoStore';
import { wordCount } from '../utils/format';
import { titleWidthPx } from './previews';

export interface SeoCheck {
  id: string;
  severity: Severity;
  message: string;
  ok: boolean;
}

interface CheckDeps {
  editor: Editor;
  store: SeoStore;
  opts: ResolvedOptions;
  t: (k: string, p?: Record<string, string | number>) => string;
  pageId?: string;
}

/**
 * SEO checklist — each item mirrors an a11y finding (id, severity, message) and
 * whether it currently passes. Character/pixel budgets are advisory (Google
 * measures pixels and often rewrites descriptions).
 */
export function runSeoChecks(deps: CheckDeps): SeoCheck[] {
  const { editor, store, t, pageId } = deps;
  const m = store.get(pageId);
  const doc = safeDoc(editor);
  const out: SeoCheck[] = [];

  const push = (id: string, ok: boolean, severity: Severity, msg: string) =>
    out.push({ id, ok, severity, message: msg });

  // Title
  const titleLen = m.title.trim().length;
  push(
    'title-length',
    titleLen >= 30 && titleLen <= 60,
    titleLen === 0 ? 'error' : 'warning',
    t('seo.check.title', { len: titleLen, px: Math.round(titleWidthPx(m.title)) }),
  );

  // Description
  const descLen = m.description.trim().length;
  push(
    'desc-length',
    descLen >= 50 && descLen <= 160,
    descLen === 0 ? 'warning' : 'info',
    t('seo.check.desc', { len: descLen }),
  );

  if (doc) {
    // Exactly one h1
    const h1s = doc.querySelectorAll('h1').length;
    push('one-h1', h1s === 1, h1s === 0 ? 'warning' : 'error', t('seo.check.h1', { count: h1s }));

    // Alt coverage
    const imgs = [...doc.querySelectorAll('img')];
    const withAlt = imgs.filter((i) => i.hasAttribute('alt')).length;
    const pct = imgs.length ? Math.round((withAlt / imgs.length) * 100) : 100;
    push('alt-coverage', pct === 100, pct < 100 ? 'warning' : 'info', t('seo.check.alt', { pct, total: imgs.length }));

    // Word count
    const words = wordCount(doc.body?.textContent || '');
    push('word-count', words >= 250, words < 250 ? 'info' : 'info', t('seo.check.words', { count: words }));

    // Broken internal links (fragment targets that don't exist)
    const broken = [...doc.querySelectorAll('a[href^="#"]')].filter((a) => {
      const href = a.getAttribute('href') || '';
      if (href === '#' || href.length < 2) return false;
      return !doc.getElementById(href.slice(1));
    }).length;
    push('internal-links', broken === 0, broken > 0 ? 'warning' : 'info', t('seo.check.links', { count: broken }));

    // Focus keyword
    if (m.focusKeyword) {
      const kw = m.focusKeyword.toLowerCase();
      const inTitle = m.title.toLowerCase().includes(kw);
      const inDesc = m.description.toLowerCase().includes(kw);
      const inH1 = [...doc.querySelectorAll('h1')].some((el) => (el.textContent || '').toLowerCase().includes(kw));
      const hits = [inTitle, inDesc, inH1].filter(Boolean).length;
      push('focus-keyword', hits >= 2, hits < 2 ? 'warning' : 'info', t('seo.check.keyword', { hits }));
    }
  }

  // OG image / canonical
  push('og-image', !!m.og.image, m.og.image ? 'info' : 'warning', t('seo.check.ogImage'));
  push('canonical', !!m.canonical, m.canonical ? 'info' : 'info', t('seo.check.canonical'));

  if (doc) {
    // Core Web Vitals heuristics (advisory — no real measurement).
    const imgs = [...doc.querySelectorAll('img')];
    const noDims = imgs.filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length;
    push('cwv-dimensions', noDims === 0, noDims > 0 ? 'info' : 'info', t('seo.check.cwvDims', { count: noDims }));

    const noLazy = imgs.filter((i) => i.getAttribute('loading') !== 'lazy').length;
    push('cwv-lazy', noLazy === 0, 'info', t('seo.check.cwvLazy', { count: noLazy }));

    const legacy = imgs.filter((i) => /\.(jpe?g|png|gif|bmp)(\?|#|$)/i.test(i.getAttribute('src') || '')).length;
    push('cwv-format', legacy === 0, 'info', t('seo.check.cwvFormat', { count: legacy }));

    // hreflang validity (only if the content declares alternates).
    const hreflangs = [...doc.querySelectorAll('link[rel~="alternate"][hreflang]')];
    if (hreflangs.length) {
      const bad = hreflangs.filter((l) => !isValidHreflang(l.getAttribute('hreflang') || '')).length;
      push('hreflang', bad === 0, bad > 0 ? 'warning' : 'info', t('seo.check.hreflang', { bad, total: hreflangs.length }));
    }
  }

  return out;
}

/** BCP-47-ish check: `en`, `en-US`, or `x-default`. */
function isValidHreflang(value: string): boolean {
  return value === 'x-default' || /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value);
}

/**
 * Cross-page duplicate title / description detection (All-pages mode). Titles or
 * descriptions shared by more than one page are a common multi-page SEO problem.
 */
export function duplicateSeo(
  store: SeoStore,
  pageIds: string[],
  t: (k: string, p?: Record<string, string | number>) => string,
): SeoCheck[] {
  const out: SeoCheck[] = [];
  const titles = new Map<string, number>();
  const descs = new Map<string, number>();
  for (const id of pageIds) {
    const m = store.get(id);
    if (m.title.trim()) titles.set(m.title.trim(), (titles.get(m.title.trim()) || 0) + 1);
    if (m.description.trim()) descs.set(m.description.trim(), (descs.get(m.description.trim()) || 0) + 1);
  }
  const dupTitles = [...titles.values()].filter((n) => n > 1).length;
  const dupDescs = [...descs.values()].filter((n) => n > 1).length;
  if (dupTitles) out.push({ id: 'dup-title', ok: false, severity: 'warning', message: t('seo.check.dupTitle', { count: dupTitles }) });
  if (dupDescs) out.push({ id: 'dup-desc', ok: false, severity: 'warning', message: t('seo.check.dupDesc', { count: dupDescs }) });
  return out;
}

function safeDoc(editor: Editor): Document | null {
  try {
    return editor.Canvas.getDocument() || null;
  } catch {
    return null;
  }
}
