/** DOM helpers used across rules. All are read-only w.r.t. the canvas. */

const FOCUSABLE = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]',
  '[contenteditable="true"]',
];

/** Tags that are inherently interactive / focusable. */
export function isInteractive(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (['a', 'button', 'input', 'select', 'textarea'].includes(tag)) return true;
  const role = el.getAttribute('role');
  if (role && ['button', 'link', 'checkbox', 'menuitem', 'tab', 'switch'].includes(role)) {
    return true;
  }
  return el.matches(FOCUSABLE.join(','));
}

/**
 * Author-provided label from aria-label / aria-labelledby / title only — no
 * text-content fallback. Use for landmark regions (nav, region, …) whose inner
 * text (e.g. link labels) must NOT count as the region's accessible name.
 */
export function landmarkLabel(el: HTMLElement): string {
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();
  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    const doc = el.ownerDocument;
    const text = labelledby
      .split(/\s+/)
      .map((id) => doc.getElementById(id)?.textContent?.trim() || '')
      .join(' ')
      .trim();
    if (text) return text;
  }
  const title = el.getAttribute('title');
  if (title && title.trim()) return title.trim();
  return '';
}

/** Accessible name approximation (not a full accname algorithm). */
export function accessibleName(el: HTMLElement): string {
  const authored = landmarkLabel(el);
  if (authored) return authored;
  const text = (el.textContent || '').trim();
  if (text) return text;
  // Empty text content: fall back to the name contributed by nested content —
  // e.g. an icon link <a><img alt="Home"></a> gets its name from the image alt
  // (or a nested [aria-label]). Decorative alt="" contributes nothing.
  const parts: string[] = [];
  el.querySelectorAll('img[alt], [aria-label]').forEach((n) => {
    const label =
      (n as HTMLElement).getAttribute('aria-label') ?? (n as HTMLImageElement).getAttribute('alt') ?? '';
    if (label.trim()) parts.push(label.trim());
  });
  return parts.join(' ').trim();
}

/** Whether an element is visually hidden (display:none / visibility / aria-hidden). */
export function isHidden(el: HTMLElement, style: CSSStyleDeclaration): boolean {
  if (el.getAttribute('aria-hidden') === 'true') return true;
  if (style.display === 'none' || style.visibility === 'hidden') return true;
  if (el.hasAttribute('hidden')) return true;
  return false;
}

/** Parsed font-size in px from a computed style. */
export function fontSizePx(style: CSSStyleDeclaration): number {
  return parseFloat(style.fontSize) || 16;
}

/** Whether the computed font weight counts as bold (>= 700). */
export function isBold(style: CSSStyleDeclaration): boolean {
  const w = style.fontWeight;
  if (w === 'bold' || w === 'bolder') return true;
  return (parseInt(w, 10) || 400) >= 700;
}

/** Direct, trimmed text content of an element (excluding descendants' script/style). */
export function ownText(el: HTMLElement): string {
  let text = '';
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3 /* TEXT_NODE — literal, no global Node in headless */) text += n.textContent || '';
  });
  return text.trim();
}
