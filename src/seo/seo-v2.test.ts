import { describe, it, expect, vi } from 'vitest';
import { externalLinks, checkExternalLinks } from './links';
import { richResultsHints } from './jsonld';

describe('externalLinks', () => {
  it('collects unique absolute http(s) links only', () => {
    document.body.innerHTML =
      '<a href="https://a.com">a</a><a href="/rel">rel</a><a href="https://a.com">dup</a><a href="http://b.com">b</a><a href="#x">frag</a>';
    expect(externalLinks(document).sort()).toEqual(['http://b.com', 'https://a.com']);
  });
});

describe('checkExternalLinks', () => {
  it('returns only broken urls, with bounded concurrency', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      return { status: url.includes('bad') ? 404 : 200 } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    const broken = await checkExternalLinks(['https://ok.com', 'https://bad.com', 'https://ok2.com'], { timeoutMs: 100 });
    expect(broken.map((b) => b.url)).toEqual(['https://bad.com']);
    vi.unstubAllGlobals();
  });

  it('treats network errors as broken', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network');
    }));
    const broken = await checkExternalLinks(['https://x.com'], { timeoutMs: 50 });
    expect(broken).toHaveLength(1);
    expect(broken[0].ok).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('richResultsHints', () => {
  it('suggests high-value optional fields per type', () => {
    expect(richResultsHints({ '@type': 'Article', headline: 'x' })).toEqual(
      expect.arrayContaining(['image', 'dateModified']),
    );
  });
  it('is empty when the enriching fields are present', () => {
    expect(
      richResultsHints({ '@type': 'Organization', name: 'x', url: 'y', logo: 'l', sameAs: ['https://x'] }),
    ).toEqual([]);
  });
  it('returns nothing for unknown types', () => {
    expect(richResultsHints({ '@type': 'Nope' })).toEqual([]);
  });
});
