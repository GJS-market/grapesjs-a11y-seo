import { describe, it, expect } from 'vitest';
import { truncateTitle, truncateDescription, displayUrl } from './previews';
import { buildSitemapXml } from './sitemap';

describe('truncateDescription (advisory char budget)', () => {
  it('leaves short text untouched', () => {
    const r = truncateDescription('Short description.');
    expect(r.truncated).toBe(false);
    expect(r.text).toBe('Short description.');
  });
  it('truncates long text with an ellipsis at a word boundary', () => {
    const long = 'word '.repeat(60).trim();
    const r = truncateDescription(long, 40);
    expect(r.truncated).toBe(true);
    expect(r.text.endsWith('…')).toBe(true);
    expect(r.text.length).toBeLessThanOrEqual(41);
  });
});

describe('truncateTitle', () => {
  it('keeps short titles', () => {
    expect(truncateTitle('My page').truncated).toBe(false);
  });
  it('truncates very long titles', () => {
    const r = truncateTitle('a'.repeat(120));
    expect(r.truncated).toBe(true);
    expect(r.text.endsWith('…')).toBe(true);
  });
});

describe('displayUrl', () => {
  it('strips protocol and shows breadcrumb path', () => {
    expect(displayUrl('https://example.com/blog/post')).toBe('example.com › blog › post');
  });
  it('falls back for empty', () => {
    expect(displayUrl('')).toBe('example.com');
  });
});

describe('buildSitemapXml', () => {
  it('emits a urlset with one url per loc and escapes ampersands', () => {
    const xml = buildSitemapXml(['https://x.com/', 'https://x.com/a?b=1&c=2']);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('http://www.sitemaps.org/schemas/sitemap/0.9');
    expect((xml.match(/<url>/g) || []).length).toBe(2);
    expect(xml).toContain('b=1&amp;c=2');
  });
  it('handles an empty page set', () => {
    const xml = buildSitemapXml([]);
    expect(xml).toContain('<urlset');
    expect(xml).not.toContain('<url>');
  });
});
