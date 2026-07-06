import { describe, it, expect } from 'vitest';
import { describeElement, roleOf, statesOf } from './a11yTree';

function make(html: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.firstElementChild as HTMLElement;
}

describe('roleOf', () => {
  it('uses explicit role', () => {
    expect(roleOf(make('<div role="navigation"></div>'))).toBe('navigation');
  });
  it('derives implicit roles from the tag', () => {
    expect(roleOf(make('<nav></nav>'))).toBe('navigation');
    expect(roleOf(make('<button>x</button>'))).toBe('button');
    expect(roleOf(make('<h2>x</h2>'))).toBe('heading');
  });
  it('handles anchors and inputs by attribute/type', () => {
    expect(roleOf(make('<a href="/x">x</a>'))).toBe('link');
    expect(roleOf(make('<a>x</a>'))).toBe('generic');
    expect(roleOf(make('<input type="checkbox">'))).toBe('checkbox');
    expect(roleOf(make('<input>'))).toBe('textbox');
  });
});

describe('statesOf', () => {
  it('collects aria states, native flags and heading level', () => {
    expect(statesOf(make('<button aria-expanded="true" disabled>x</button>'))).toEqual(
      expect.arrayContaining(['expanded=true', 'disabled']),
    );
    expect(statesOf(make('<h3>x</h3>'))).toContain('level=3');
    const cb = make('<input type="checkbox" required>') as HTMLInputElement;
    cb.checked = true;
    expect(statesOf(cb)).toEqual(expect.arrayContaining(['required', 'checked']));
  });
  it('excludes aria-label/labelledby (those are the name, not a state)', () => {
    expect(statesOf(make('<button aria-label="Close">x</button>'))).not.toContain('label=Close');
  });
});

describe('describeElement', () => {
  it('returns name + role + states', () => {
    const info = describeElement(make('<button aria-label="Menu" aria-expanded="false">x</button>'));
    expect(info).toEqual({ name: 'Menu', role: 'button', states: ['expanded=false'] });
  });
});
