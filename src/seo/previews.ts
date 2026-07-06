/**
 * SEO preview helpers. Google truncates titles by *pixel width* (~600px), not
 * character count, so we measure with a canvas. Descriptions have no official
 * limit (Google frequently rewrites them) — the ~160 char figure is advisory.
 */

const TITLE_MAX_PX = 600;
const TITLE_FONT = '20px Arial'; // approximates Google's desktop SERP title
const DESC_MAX_CHARS = 160;

let measureCtx: CanvasRenderingContext2D | null = null;

let measureTried = false;

function ctx(): CanvasRenderingContext2D | null {
  if (measureCtx || measureTried) return measureCtx;
  measureTried = true;
  if (typeof document === 'undefined') return null;
  // jsdom's canvas isn't implemented and logs on getContext — skip it there so
  // the char-count fallback is used cleanly in unit tests.
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return null;
  try {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d');
  } catch {
    measureCtx = null; // e.g. jsdom without the canvas package
  }
  return measureCtx;
}

/** Measure a string's rendered width in px for the SERP title font. */
export function titleWidthPx(text: string, font = TITLE_FONT): number {
  const c = ctx();
  if (!c) return text.length * 10; // rough fallback (no DOM)
  c.font = font;
  return c.measureText(text).width;
}

export interface Truncation {
  text: string;
  truncated: boolean;
}

/** Truncate a title to Google's ~600px width, adding an ellipsis. */
export function truncateTitle(text: string, maxPx = TITLE_MAX_PX): Truncation {
  if (titleWidthPx(text) <= maxPx) return { text, truncated: false };
  let out = text;
  while (out.length > 1 && titleWidthPx(out + '…') > maxPx) {
    out = out.slice(0, -1);
  }
  return { text: out.replace(/\s+\S*$/, '') + '…', truncated: true };
}

/** Truncate a description to the advisory character budget. */
export function truncateDescription(text: string, maxChars = DESC_MAX_CHARS): Truncation {
  if (text.length <= maxChars) return { text, truncated: false };
  const cut = text.slice(0, maxChars).replace(/\s+\S*$/, '');
  return { text: cut + '…', truncated: true };
}

/** Pretty-print a canonical/base URL the way a SERP shows it. */
export function displayUrl(url: string): string {
  if (!url) return 'example.com';
  return url
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/\//g, ' › ');
}
