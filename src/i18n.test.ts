import { describe, it, expect } from 'vitest';
import { buildNested, makeT, DEFAULT_MESSAGES } from './i18n';
import { ru } from './i18n/ru';
import { es } from './i18n/es';

describe('buildNested', () => {
  it('nests dot-separated keys for editor.I18n', () => {
    const nested = buildNested({ 'img-alt.missing': 'M', 'a11y.run': 'Run', 'a11y.live': 'Live' }) as any;
    expect(nested['img-alt'].missing).toBe('M');
    expect(nested.a11y.run).toBe('Run');
    expect(nested.a11y.live).toBe('Live');
  });

  it('round-trips the whole default catalog without collisions', () => {
    const nested = buildNested(DEFAULT_MESSAGES) as any;
    // seo.title (leaf) and seo.check.title (nested) must coexist.
    expect(typeof nested.seo.title).toBe('string');
    expect(typeof nested.seo.check.title).toBe('string');
  });
});

describe('makeT', () => {
  it('resolves defaults and interpolates params', () => {
    const t = makeT();
    expect(t('a11y.run')).toBe(DEFAULT_MESSAGES['a11y.run']);
    expect(t('duplicate-id.dup', { id: 'x' })).toContain('x');
  });
  it('applies host overrides', () => {
    const t = makeT({ 'a11y.run': 'Проверить' });
    expect(t('a11y.run')).toBe('Проверить');
  });
  it('falls back to the key when unknown', () => {
    expect(makeT()('nope.key')).toBe('nope.key');
  });
});

describe('shipped locale bundles', () => {
  it('ru/es translate core keys and fall back to English for the rest', () => {
    const tru = makeT({ ...ru });
    expect(tru('tab.a11y')).toBe('Доступность');
    // A key not in the ru bundle falls back to the English default.
    expect(tru('seo.check.canonical')).toBe(DEFAULT_MESSAGES['seo.check.canonical']);
    expect(makeT({ ...es })('tab.settings')).toBe('Ajustes');
  });
});
