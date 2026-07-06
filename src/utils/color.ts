import type { RGBA } from '../types';

/**
 * Colour parsing utilities. Kept dependency-free and pure so the contrast
 * engine can be unit-tested against known reference pairs.
 */

const NAMED: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  transparent: 'rgba(0,0,0,0)',
};

/** Parse a hex string (`#rgb`, `#rrggbb`, `#rrggbbaa`) into RGBA. */
function parseHex(hex: string): RGBA | null {
  let s = hex.slice(1);
  if (s.length === 3 || s.length === 4) {
    s = s
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (s.length !== 6 && s.length !== 8) return null;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b, a };
}

/** Parse an `rgb()`/`rgba()` string. */
function parseRgb(str: string): RGBA | null {
  const m = str.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[,/\s]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const r = parseFloat(parts[0]);
  const g = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);
  const a = parts.length >= 4 ? parseFloat(parts[3]) : 1;
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b, a: Number.isNaN(a) ? 1 : a };
}

/**
 * Parse any CSS colour string returned by `getComputedStyle` (always `rgb`/
 * `rgba` in practice), plus hex and a few named colours for robustness.
 * Returns `null` for unparseable / non-colour values (e.g. gradients).
 */
export function parseColor(input: string | null | undefined): RGBA | null {
  if (!input) return null;
  const str = input.trim().toLowerCase();
  if (str in NAMED) return parseColor(NAMED[str]);
  if (str.startsWith('#')) return parseHex(str);
  if (str.startsWith('rgb')) return parseRgb(str);
  return null;
}

/** Whether a value looks like a gradient / image (not a flat, checkable colour). */
export function isImageOrGradient(value: string | null | undefined): boolean {
  if (!value || value === 'none') return false;
  return /gradient|url\(/i.test(value);
}

/**
 * Composite a (possibly translucent) foreground colour over an opaque backdrop
 * using straight alpha. Returns an opaque colour.
 */
export function flatten(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

/** Format an RGBA as a hex string (ignores alpha). */
export function toHex({ r, g, b }: RGBA): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
