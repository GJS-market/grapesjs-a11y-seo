import type { Component } from 'grapesjs';
import type { FixResult } from '../types';

/**
 * Safe quick-fixes. Every mutation goes through the GrapesJS component API
 * (`addAttributes` / `setStyle` / `append`) — never the raw iframe DOM — so
 * changes land in the history/undo stack and serialize correctly. Each helper
 * returns a {@link FixResult} (before/after) for the UI mini-diff and the
 * `a11y:fix` event.
 *
 * Element-accuracy: a finding's `component` is the *nearest* component, which
 * for view-wrapped elements (e.g. a `<video>` rendered inside a placeholder
 * `<div>`) is not the audited element. `resolveTarget` prefers the component
 * whose view root IS the element (`el.__gjsv.model`) and falls back to the
 * nearest one.
 */

interface WithView {
  __gjsv?: { model?: Component };
}

const NO_CHANGE: FixResult = { changed: false, before: {}, after: {} };

/** The component that owns exactly `el`, else the nearest `fallback`. */
export function resolveTarget(el: HTMLElement | undefined, fallback: Component | null | undefined): Component | null {
  const own = (el as unknown as WithView | undefined)?.__gjsv?.model;
  return own ?? fallback ?? null;
}

function attrSnapshot(target: Component, keys: string[]): Record<string, string> {
  const attrs = target.getAttributes() as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = attrs[k] == null ? '' : String(attrs[k]);
  return out;
}

/** Merge attributes onto the element-accurate component. */
export function applyAttrs(
  el: HTMLElement | undefined,
  fallback: Component | null | undefined,
  attrs: Record<string, string>,
): FixResult {
  const target = resolveTarget(el, fallback);
  if (!target) return NO_CHANGE;
  const keys = Object.keys(attrs);
  const before = attrSnapshot(target, keys);
  target.addAttributes(attrs);
  const after = attrSnapshot(target, keys);
  return { changed: keys.some((k) => before[k] !== after[k]), before, after };
}

/** Set inline/rule styles on the element-accurate component. */
export function applyStyle(
  el: HTMLElement | undefined,
  fallback: Component | null | undefined,
  styles: Record<string, string>,
): FixResult {
  const target = resolveTarget(el, fallback);
  if (!target) return NO_CHANGE;
  const keys = Object.keys(styles);
  const cur = target.getStyle() as Record<string, string | string[]>;
  const before: Record<string, string> = {};
  for (const k of keys) before[k] = cur[k] == null ? '' : String(cur[k]);
  target.setStyle({ ...cur, ...styles });
  return { changed: true, before, after: { ...styles } };
}

/** Change a component's tag name (heading level fixes). */
export function applyTag(
  el: HTMLElement | undefined,
  fallback: Component | null | undefined,
  tagName: string,
): FixResult {
  const target = resolveTarget(el, fallback);
  if (!target) return NO_CHANGE;
  const before = { tagName: String(target.get('tagName') || '') };
  target.set('tagName', tagName);
  return { changed: before.tagName !== tagName, before, after: { tagName } };
}

/** Append a child component (e.g. a `<track>` for captions). */
export function applyAppend(
  el: HTMLElement | undefined,
  fallback: Component | null | undefined,
  html: string,
  label: string,
): FixResult {
  const target = resolveTarget(el, fallback);
  if (!target || typeof target.append !== 'function') return NO_CHANGE;
  target.append(html);
  return { changed: true, before: { [label]: 'missing' }, after: { [label]: 'added' } };
}

/** Generate a reasonably unique id for duplicate-id fixes. */
export function uniqueId(prefix = 'el'): string {
  const rand = Math.abs(hashString(String(idCounter++) + prefix)).toString(36);
  return `${prefix}-${rand}`;
}

let idCounter = 1;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
