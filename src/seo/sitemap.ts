import type { Editor } from 'grapesjs';
import type { SeoStore } from './SeoStore';
import { escapeXml } from '../utils/format';

/**
 * Build a `sitemap.xml` over all pages, skipping any whose SEO model sets
 * `robots.index = false`. URLs prefer the page's canonical, else
 * `baseUrl + '/' + pageId`.
 */
export function getSitemap(
  editor: Editor,
  store: SeoStore,
  baseUrl: string,
): string {
  const base = baseUrl.replace(/\/$/, '');
  const pages = editor.Pages?.getAll?.() ?? [];
  const urls: string[] = [];

  for (const page of pages) {
    const id = page.getId();
    const model = store.get(id);
    if (!model.robots.index) continue;
    const loc = model.canonical || `${base}/${slug(page, id)}`;
    if (!loc) continue;
    urls.push(loc);
  }

  return buildSitemapXml(urls);
}

/** Pure sitemap XML assembly from a list of location URLs. */
export function buildSitemapXml(locs: string[]): string {
  const urls = locs.map((loc) => `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

function slug(page: { getName?: () => string | undefined }, id: string): string {
  const name = page.getName?.();
  const base = (name || id).toString().trim().toLowerCase();
  return base
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || id;
}
