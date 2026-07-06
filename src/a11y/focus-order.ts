import { isInteractive } from '../utils/dom';

const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]';

/** Visible, enabled, not `tabindex="-1"` focusable elements. */
export function focusableElements(doc: Document): HTMLElement[] {
  return Array.from(doc.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    const ti = el.getAttribute('tabindex');
    if (ti != null && parseInt(ti, 10) < 0) return false;
    if ((el as HTMLInputElement).disabled) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    if (!isInteractive(el) && ti == null) return false;
    return true;
  });
}

/**
 * The keyboard tab sequence: positive `tabindex` first (ascending, ties broken
 * by DOM order), then everything else in DOM order.
 */
export function tabOrder(els: HTMLElement[]): HTMLElement[] {
  const domIndex = new Map<HTMLElement, number>();
  els.forEach((el, i) => domIndex.set(el, i));
  const ti = (el: HTMLElement) => parseInt(el.getAttribute('tabindex') || '0', 10) || 0;
  const positive = els.filter((el) => ti(el) > 0).sort((a, b) => ti(a) - ti(b) || domIndex.get(a)! - domIndex.get(b)!);
  const rest = els.filter((el) => ti(el) <= 0);
  return [...positive, ...rest];
}

/** Reading order by geometry: top-to-bottom, then left-to-right within a row. */
export function visualOrder(els: HTMLElement[]): HTMLElement[] {
  const ROW = 12; // px tolerance to treat elements as the same row
  return [...els].sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    if (Math.abs(ra.top - rb.top) > ROW) return ra.top - rb.top;
    return ra.left - rb.left;
  });
}
