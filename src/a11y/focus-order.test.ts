import { describe, it, expect } from 'vitest';
import { tabOrder, visualOrder } from './focus-order';

// jsdom has no layout, so we test the ordering logic directly with fake rects.
function el(tabindex?: number, top = 0, left = 0): HTMLElement {
  const e = document.createElement('button');
  if (tabindex != null) e.setAttribute('tabindex', String(tabindex));
  e.getBoundingClientRect = () => ({ top, left, width: 10, height: 10, right: left + 10, bottom: top + 10, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
  return e;
}

describe('tabOrder', () => {
  it('puts positive tabindex first (ascending), then DOM order', () => {
    const a = el(); // 0
    const b = el(2);
    const c = el(1);
    const d = el(); // 0
    const order = tabOrder([a, b, c, d]);
    expect(order).toEqual([c, b, a, d]); // 1, 2, then natural a,d
  });
  it('is stable when there are no positive tabindexes', () => {
    const a = el();
    const b = el();
    expect(tabOrder([a, b])).toEqual([a, b]);
  });
});

describe('visualOrder', () => {
  it('sorts top-to-bottom then left-to-right within a row', () => {
    const topRight = el(0, 0, 100);
    const topLeft = el(0, 0, 0);
    const below = el(0, 50, 10);
    expect(visualOrder([below, topRight, topLeft])).toEqual([topLeft, topRight, below]);
  });
});
