import type { Component, Editor, Page } from 'grapesjs';
import type { WalkNode } from '../types';

export interface WalkResult {
  nodes: WalkNode[];
  /** Reverse lookup from a live element to its owning component. */
  elToComp: Map<HTMLElement, Component>;
}

/**
 * Build the audit's element list. We walk the *real* canvas DOM (so wrapped
 * elements like `<iframe>`/`<video>`, which GrapesJS may render inside a
 * placeholder, are covered) and resolve each element to its nearest owning
 * GrapesJS component. That keeps every finding bound to a component for
 * select / scroll / quick-fix while never missing a DOM node. Runs once per
 * audit pass.
 */
export function walkComponents(
  editor: Editor,
  ignoreSelectors: string[],
  page?: Page,
): WalkResult {
  const nodes: WalkNode[] = [];
  const elToComp = new Map<HTMLElement, Component>();
  const ignore = ignoreSelectors.filter(Boolean);

  const root: Component | undefined = page
    ? page.getMainComponent()
    : editor.getWrapper();
  if (!root) return { nodes, elToComp };

  // component → element index (element may be a placeholder wrapper).
  const compEls = new Map<HTMLElement, Component>();
  root.onAll((component: Component) => {
    const el = component.getEl() as HTMLElement | undefined;
    if (el && el.nodeType === 1) compEls.set(el, component);
  });

  const rootEl = root.getEl() as HTMLElement | undefined;
  const doc = editor.Canvas.getDocument();
  const scope: HTMLElement | null = rootEl || doc?.body || null;
  if (!scope) return { nodes, elToComp };

  const resolve = (el: HTMLElement): Component => {
    let node: HTMLElement | null = el;
    while (node) {
      const comp = compEls.get(node);
      if (comp) return comp;
      node = node.parentElement;
    }
    return root;
  };

  const elements = [scope, ...Array.from(scope.querySelectorAll<HTMLElement>('*'))];
  for (const el of elements) {
    if (el.nodeType !== 1) continue;
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
    if (ignore.length && ignore.some((sel) => safeMatches(el, sel))) continue;
    const component = resolve(el);
    nodes.push({ component, el });
    elToComp.set(el, component);
  }

  return { nodes, elToComp };
}

function safeMatches(el: HTMLElement, selector: string): boolean {
  try {
    return el.matches(selector) || !!el.closest(selector);
  } catch {
    return false;
  }
}
