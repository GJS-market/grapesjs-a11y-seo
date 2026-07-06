import { describe, it, expect } from 'vitest';
import { resolveTarget, applyAttrs, applyStyle, applyTag } from './quickfix';

// Minimal component mock with the bits the fix helpers touch.
function mockComponent() {
  const attrs: Record<string, string> = {};
  const style: Record<string, string> = {};
  let tag = 'div';
  return {
    getAttributes: () => ({ ...attrs }),
    addAttributes: (a: Record<string, string>) => Object.assign(attrs, a),
    getStyle: () => ({ ...style }),
    setStyle: (s: Record<string, string>) => Object.assign(style, s),
    get: (k: string) => (k === 'tagName' ? tag : undefined),
    set: (k: string, v: string) => {
      if (k === 'tagName') tag = v;
    },
    _peek: () => ({ attrs: { ...attrs }, style: { ...style }, tag }),
  };
}

function elWithView(model: unknown): HTMLElement {
  const el = document.createElement('div');
  (el as unknown as { __gjsv: { model: unknown } }).__gjsv = { model };
  return el;
}

describe('resolveTarget', () => {
  it('prefers the element-accurate component (__gjsv) over the fallback', () => {
    const own = mockComponent();
    const fallback = mockComponent();
    const el = elWithView(own);
    expect(resolveTarget(el, fallback as never)).toBe(own);
  });
  it('falls back to the nearest component when el has no view', () => {
    const fallback = mockComponent();
    expect(resolveTarget(document.createElement('div'), fallback as never)).toBe(fallback);
  });
  it('returns null when nothing resolves', () => {
    expect(resolveTarget(undefined, null)).toBeNull();
  });
});

describe('applyAttrs', () => {
  it('reports a before/after diff and changed=true', () => {
    const c = mockComponent();
    const el = elWithView(c);
    const r = applyAttrs(el, null, { title: 'Hello' });
    expect(r).toEqual({ changed: true, before: { title: '' }, after: { title: 'Hello' } });
    expect(c._peek().attrs.title).toBe('Hello');
  });
  it('changed=false when the value is unchanged', () => {
    const c = mockComponent();
    c.addAttributes({ alt: 'x' });
    const r = applyAttrs(elWithView(c), null, { alt: 'x' });
    expect(r.changed).toBe(false);
  });
  it('no-ops with no resolvable target', () => {
    expect(applyAttrs(undefined, null, { a: 'b' })).toEqual({ changed: false, before: {}, after: {} });
  });
});

describe('applyStyle / applyTag', () => {
  it('applyStyle writes the style and reports the diff', () => {
    const c = mockComponent();
    const r = applyStyle(elWithView(c), null, { color: '#747474' });
    expect(r.after.color).toBe('#747474');
    expect(c._peek().style.color).toBe('#747474');
  });
  it('applyTag changes the tag name', () => {
    const c = mockComponent();
    const r = applyTag(elWithView(c), null, 'h3');
    expect(r).toEqual({ changed: true, before: { tagName: 'div' }, after: { tagName: 'h3' } });
    expect(c._peek().tag).toBe('h3');
  });
});
