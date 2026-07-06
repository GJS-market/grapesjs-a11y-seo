import { describe, it, expect } from 'vitest';
import {
  JSONLD_TEMPLATES,
  templateFor,
  validateBlock,
  renderJsonLd,
  getPath,
  setPath,
  pruneEmpty,
  autoFillValues,
  SCHEMA_ICON,
  type FieldDef,
} from './jsonld';

describe('jsonld templates', () => {
  it('a fresh block reports missing fields as a subset of its required set', () => {
    for (const tpl of JSONLD_TEMPLATES) {
      const missing = validateBlock(tpl.create());
      // Everything reported missing must be a declared required field.
      for (const field of missing) expect(tpl.required).toContain(field);
    }
  });

  it('a fresh block flags its empty-by-default required fields', () => {
    // e.g. Article headline/datePublished, Organization name/url, WebSite name/url.
    expect(validateBlock(templateFor('Article')!.create())).toEqual(
      expect.arrayContaining(['headline', 'author', 'datePublished']),
    );
    expect(validateBlock(templateFor('Organization')!.create())).toEqual(
      expect.arrayContaining(['name', 'url']),
    );
  });

  it('validates a filled Article as complete', () => {
    const block = {
      '@type': 'Article',
      headline: 'Hello',
      author: { '@type': 'Person', name: 'Ada' },
      datePublished: '2026-01-01',
    };
    expect(validateBlock(block)).toEqual([]);
  });

  it('treats a @type-only author object as empty', () => {
    const block = {
      '@type': 'Article',
      headline: 'Hello',
      author: { '@type': 'Person', name: '' },
      datePublished: '2026-01-01',
    };
    expect(validateBlock(block)).toContain('author');
  });

  it('templateFor resolves and unknown types validate as empty', () => {
    expect(templateFor('Product')?.type).toBe('Product');
    expect(validateBlock({ '@type': 'Unknown' })).toEqual([]);
  });

  it('renders a script with @context', () => {
    const html = renderJsonLd({ '@type': 'WebSite', name: 'X', url: 'https://x.com' });
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@context":"https://schema.org"');
    expect(html).toContain('"@type":"WebSite"');
  });
});

describe('getPath / setPath', () => {
  it('reads and writes nested leaves', () => {
    const obj: Record<string, unknown> = { a: { b: { c: 1 } } };
    expect(getPath(obj, 'a.b.c')).toBe(1);
    setPath(obj, 'a.b.c', 2);
    expect(getPath(obj, 'a.b.c')).toBe(2);
  });
  it('creates intermediate objects when missing', () => {
    const obj: Record<string, unknown> = {};
    setPath(obj, 'offers.price', '9.99');
    expect(obj).toEqual({ offers: { price: '9.99' } });
  });
  it('returns undefined for missing paths', () => {
    expect(getPath({ a: 1 }, 'a.b.c')).toBeUndefined();
  });
});

describe('pruneEmpty', () => {
  it('drops empty scalars, arrays and @type-only objects but keeps real data', () => {
    const pruned = pruneEmpty({
      '@type': 'Article',
      headline: 'Hi',
      image: '',
      author: { '@type': 'Person', name: '' },
      tags: [],
    });
    expect(pruned).toEqual({ '@type': 'Article', headline: 'Hi' });
  });
  it('renderJsonLd omits empty pre-seeded optionals', () => {
    const tpl = templateFor('Article')!;
    const block = tpl.create();
    (block as Record<string, unknown>).headline = 'A';
    (block as { author: { name: string } }).author.name = 'Ada';
    (block as Record<string, unknown>).datePublished = '2026-01-01';
    const html = renderJsonLd(block);
    expect(html).toContain('"headline":"A"');
    expect(html).not.toContain('"image"'); // empty optional pruned
    expect(html).not.toContain('"description"');
  });
});

describe('template fields cover required paths', () => {
  it('filling every field of a template clears validateBlock', () => {
    for (const tpl of JSONLD_TEMPLATES) {
      const block = tpl.create();
      fillFields(block, tpl.fields);
      expect(validateBlock(block), `${tpl.type} should be valid once filled`).toEqual([]);
    }
  });
});

describe('SCHEMA_ICON', () => {
  it('has an icon for every template type', () => {
    for (const tpl of JSONLD_TEMPLATES) expect(SCHEMA_ICON[tpl.type]).toBeTruthy();
  });
});

describe('autoFillValues', () => {
  it('fills empty Article fields from the page, without overwriting', () => {
    const block = templateFor('Article')!.create();
    (block as Record<string, unknown>).headline = 'Keep me';
    const n = autoFillValues(block, { h1: 'Ignored', image: 'https://x/a.jpg', today: '2026-07-06' });
    expect((block as Record<string, unknown>).headline).toBe('Keep me'); // not overwritten
    expect((block as Record<string, unknown>).image).toBe('https://x/a.jpg');
    expect((block as Record<string, unknown>).datePublished).toBe('2026-07-06');
    expect(n).toBe(2);
  });
  it('fills Organization name/url', () => {
    const block = templateFor('Organization')!.create();
    autoFillValues(block, { title: 'Acme', url: 'https://acme.com' });
    expect((block as Record<string, unknown>).name).toBe('Acme');
    expect((block as Record<string, unknown>).url).toBe('https://acme.com');
  });
  it('does nothing for schemas it does not know how to fill', () => {
    const block = templateFor('FAQPage')!.create();
    expect(autoFillValues(block, { title: 'x' })).toBe(0);
  });
});

// Fill each field with a plausible non-empty value (recursing into lists).
function fillFields(target: Record<string, unknown>, fields: FieldDef[]): void {
  for (const f of fields) {
    if (f.kind === 'list') {
      const arr = (getPath(target, f.path) as Array<Record<string, unknown>>) ?? [];
      if (!arr.length && f.itemCreate) arr.push(f.itemCreate());
      for (const item of arr) fillFields(item, f.itemFields ?? []);
      setPath(target, f.path, arr);
    } else {
      setPath(target, f.path, f.kind === 'url' ? 'https://x.com' : f.kind === 'date' ? '2026-01-01' : 'value');
    }
  }
}
