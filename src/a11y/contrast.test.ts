import { describe, it, expect } from 'vitest';
import { parseColor } from '../utils/color';
import {
  contrastRatio,
  isLargeText,
  requiredRatio,
  passes,
  suggestForeground,
} from './contrast';
import type { RGBA } from '../types';

const c = (hex: string): RGBA => {
  const v = parseColor(hex);
  if (!v) throw new Error(`bad colour ${hex}`);
  return v;
};

describe('contrastRatio — reference pairs (WebAIM-validated)', () => {
  const cases: Array<[string, string, number]> = [
    ['#000000', '#ffffff', 21],
    ['#ffffff', '#000000', 21], // order-independent
    ['#767676', '#ffffff', 4.54], // canonical "just passes AA"
    ['#787878', '#ffffff', 4.38], // one shade lighter -> fails AA
    ['#595959', '#ffffff', 7.0], // exactly AAA-normal threshold
    ['#ff0000', '#ffffff', 3.99], // pure red on white
    ['#0000ff', '#ffffff', 8.59], // pure blue on white
  ];
  for (const [fg, bg, expected] of cases) {
    it(`${fg} on ${bg} ≈ ${expected}:1`, () => {
      expect(contrastRatio(c(fg), c(bg))).toBeCloseTo(expected, 1);
    });
  }

  it('identical colours are 1:1', () => {
    expect(contrastRatio(c('#123456'), c('#123456'))).toBeCloseTo(1, 5);
  });
});

describe('isLargeText', () => {
  it('24px is large regardless of weight', () => {
    expect(isLargeText(24, false)).toBe(true);
  });
  it('18.66px is large only when bold', () => {
    expect(isLargeText(18.66, true)).toBe(true);
    expect(isLargeText(18.66, false)).toBe(false);
  });
  it('16px is never large', () => {
    expect(isLargeText(16, true)).toBe(false);
  });
});

describe('requiredRatio / passes', () => {
  it('AA thresholds', () => {
    expect(requiredRatio(false, 'AA')).toBe(4.5);
    expect(requiredRatio(true, 'AA')).toBe(3);
  });
  it('AAA thresholds', () => {
    expect(requiredRatio(false, 'AAA')).toBe(7);
    expect(requiredRatio(true, 'AAA')).toBe(4.5);
  });
  it('#767676 on white passes AA normal but fails AAA normal', () => {
    const r = contrastRatio(c('#767676'), c('#ffffff'));
    expect(passes(r, false, 'AA')).toBe(true);
    expect(passes(r, false, 'AAA')).toBe(false);
  });
  it('#787878 on white fails AA normal but passes AA large', () => {
    const r = contrastRatio(c('#787878'), c('#ffffff'));
    expect(passes(r, false, 'AA')).toBe(false);
    expect(passes(r, true, 'AA')).toBe(true);
  });
});

describe('suggestForeground', () => {
  it('darkens a failing light-grey to something passing on white', () => {
    const bg = c('#ffffff');
    const fg = c('#aaaaaa'); // ~2.3:1, fails
    const better = suggestForeground(fg, bg, false, 'AA');
    expect(better).not.toBeNull();
    expect(contrastRatio(better!, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
