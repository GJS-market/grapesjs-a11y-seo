import type { RGBA, WcagLevel } from '../types';

/**
 * WCAG contrast math. Formulas are normative (WCAG 2.1/2.2 §1.4.3, technique
 * G17/G18) and implemented exactly so results match WebAIM's checker.
 */

/** Linearise a single 0..255 sRGB channel to its 0..1 luminance contribution. */
function channel(c255: number): number {
  const c = c255 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance (0..1) of an opaque colour. */
export function luminance({ r, g, b }: RGBA): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * WCAG contrast ratio between two opaque colours, in the range 1..21.
 * Order-independent.
 */
export function contrastRatio(fg: RGBA, bg: RGBA): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Whether text counts as "large" per WCAG: >= 18pt (24px), or >= 14pt bold
 * (18.66px bold). Larger text has a relaxed threshold.
 */
export function isLargeText(fontPx: number, bold: boolean): boolean {
  if (fontPx >= 24) return true;
  if (bold && fontPx >= 18.66) return true;
  return false;
}

/** The required minimum ratio for a given text size and conformance level. */
export function requiredRatio(large: boolean, level: WcagLevel): number {
  if (level === 'AAA') return large ? 4.5 : 7;
  return large ? 3 : 4.5;
}

/** Whether a ratio passes the threshold for the given size and level. */
export function passes(ratio: number, large: boolean, level: WcagLevel): boolean {
  // Round to 2 decimals the way tools display it, to avoid float edge cases
  // where e.g. exactly 4.5 would otherwise fail on a 4.4999999 float.
  const r = Math.round(ratio * 100) / 100;
  return r >= requiredRatio(large, level);
}

/**
 * Suggest the nearest passing foreground by darkening or lightening toward the
 * end that increases contrast, returning the first shade that passes. Returns
 * `null` if no shade in range passes (rare, e.g. mid-grey backgrounds at AAA).
 */
export function suggestForeground(
  fg: RGBA,
  bg: RGBA,
  large: boolean,
  level: WcagLevel,
): RGBA | null {
  const target = requiredRatio(large, level);
  const bgLum = luminance(bg);
  // Move toward black if the background is light, toward white if dark.
  const toward = bgLum > 0.5 ? 0 : 255;
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const cand: RGBA = {
      r: Math.round(fg.r + (toward - fg.r) * t),
      g: Math.round(fg.g + (toward - fg.g) * t),
      b: Math.round(fg.b + (toward - fg.b) * t),
      a: 1,
    };
    if (contrastRatio(cand, bg) >= target) return cand;
  }
  return null;
}
