/**
 * Tiny hyperscript helper — zero-dep DOM construction, mirroring the pattern
 * used in `grapesjs-devtools`. Keeps UI code declarative without a framework.
 */

export interface HProps {
  class?: string;
  text?: string;
  html?: string;
  title?: string;
  attrs?: Record<string, string>;
  style?: Partial<CSSStyleDeclaration>;
  on?: Record<string, (ev: Event) => void>;
  dataset?: Record<string, string>;
}

type Child = Node | string | null | undefined | false;

/** Create an element with props and children. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: HProps = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text != null) el.textContent = props.text;
  if (props.html != null) el.innerHTML = props.html;
  if (props.title != null) el.title = props.title;
  if (props.attrs) {
    for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  }
  if (props.dataset) {
    for (const [k, v] of Object.entries(props.dataset)) el.dataset[k] = v;
  }
  if (props.style) Object.assign(el.style, props.style);
  if (props.on) {
    for (const [ev, fn] of Object.entries(props.on)) el.addEventListener(ev, fn);
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/** Convenience: an anchor that always opens safely in a new tab. */
export function link(href: string, text: string, cls?: string): HTMLAnchorElement {
  return h('a', {
    class: cls,
    text,
    attrs: { href, target: '_blank', rel: 'noopener noreferrer' },
  });
}

/** Remove all children of a node. */
export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
