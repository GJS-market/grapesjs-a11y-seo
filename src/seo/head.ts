import type { Editor } from 'grapesjs';
import type { ResolvedOptions, SeoModel } from '../types';
import type { SeoStore } from './SeoStore';
import { escapeHtml } from '../utils/format';
import { renderJsonLd } from './jsonld';

function meta(name: string, content: string, prop = false): string {
  if (!content) return '';
  const attr = prop ? 'property' : 'name';
  return `<meta ${attr}="${escapeHtml(name)}" content="${escapeHtml(content)}">`;
}

/**
 * Render the `<head>` inner HTML (title, meta, canonical, OG/Twitter, JSON-LD)
 * for a page. GrapesJS' own `getHtml()` is body-only, so this is where SEO
 * metadata becomes exportable markup.
 */
export function getHeadHtml(store: SeoStore, pageId?: string): string {
  const m: SeoModel = store.get(pageId);
  const parts: string[] = [];

  if (m.title) parts.push(`<title>${escapeHtml(m.title)}</title>`);
  parts.push(meta('description', m.description));
  parts.push(meta('viewport', 'width=device-width, initial-scale=1'));
  const robots = `${m.robots.index ? 'index' : 'noindex'},${m.robots.follow ? 'follow' : 'nofollow'}`;
  parts.push(meta('robots', robots));
  if (m.canonical) parts.push(`<link rel="canonical" href="${escapeHtml(m.canonical)}">`);
  if (m.favicon) parts.push(`<link rel="icon" href="${escapeHtml(m.favicon)}">`);

  // Open Graph
  parts.push(meta('og:title', m.og.title || m.title, true));
  parts.push(meta('og:description', m.og.description || m.description, true));
  parts.push(meta('og:type', m.og.type || 'website', true));
  parts.push(meta('og:url', m.og.url || m.canonical, true));
  parts.push(meta('og:image', m.og.image || '', true));

  // Twitter
  parts.push(meta('twitter:card', m.twitter.card || 'summary_large_image'));
  parts.push(meta('twitter:site', m.twitter.site || ''));
  parts.push(meta('twitter:title', m.og.title || m.title));
  parts.push(meta('twitter:description', m.og.description || m.description));
  if (m.og.image) parts.push(meta('twitter:image', m.og.image));

  for (const block of m.jsonld) parts.push(renderJsonLd(block));

  return parts.filter(Boolean).join('\n');
}

/** Render a full standalone HTML document for a page (head + body + CSS). */
export function renderPage(
  editor: Editor,
  store: SeoStore,
  _opts: ResolvedOptions,
  pageId?: string,
): string {
  const page = pageId ? editor.Pages?.get?.(pageId) : editor.Pages?.getSelected?.();
  const root = page?.getMainComponent?.();
  const body = root ? editor.getHtml({ component: root }) : editor.getHtml();
  const css = root ? editor.getCss({ component: root }) : editor.getCss();
  const lang = detectLang(editor) || 'en';

  return [
    '<!doctype html>',
    `<html lang="${escapeHtml(lang)}">`,
    '<head>',
    '<meta charset="utf-8">',
    getHeadHtml(store, pageId),
    css ? `<style>${css}</style>` : '',
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
}

function detectLang(editor: Editor): string | undefined {
  try {
    return editor.Canvas.getDocument()?.documentElement?.getAttribute('lang') || undefined;
  } catch {
    return undefined;
  }
}
