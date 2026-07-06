import { accessibleName } from '../utils/dom';

export interface A11yInfo {
  name: string;
  role: string;
  states: string[];
}

// Implicit ARIA roles for common elements (a pragmatic subset).
const IMPLICIT: Record<string, string> = {
  a: 'link',
  button: 'button',
  nav: 'navigation',
  main: 'main',
  header: 'banner',
  footer: 'contentinfo',
  aside: 'complementary',
  form: 'form',
  section: 'region',
  article: 'article',
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  table: 'table',
  img: 'img',
  select: 'combobox',
  textarea: 'textbox',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
};

const INPUT_ROLES: Record<string, string> = {
  text: 'textbox',
  search: 'searchbox',
  email: 'textbox',
  tel: 'textbox',
  url: 'textbox',
  password: 'textbox',
  number: 'spinbutton',
  checkbox: 'checkbox',
  radio: 'radio',
  range: 'slider',
  button: 'button',
  submit: 'button',
  reset: 'button',
};

/** Compute the implicit or explicit ARIA role of an element. */
export function roleOf(el: HTMLElement): string {
  const explicit = el.getAttribute('role');
  if (explicit) return explicit.split(/\s+/)[0];
  const tag = el.tagName.toLowerCase();
  if (tag === 'a') return el.hasAttribute('href') ? 'link' : 'generic';
  if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'hidden') return 'none';
    return INPUT_ROLES[type] || 'textbox';
  }
  return IMPLICIT[tag] || 'generic';
}

/** Collect ARIA/native states worth surfacing. */
export function statesOf(el: HTMLElement): string[] {
  const out: string[] = [];
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith('aria-') && attr.name !== 'aria-label' && attr.name !== 'aria-labelledby') {
      out.push(`${attr.name.slice(5)}=${attr.value}`);
    }
  }
  const input = el as HTMLInputElement;
  if (input.disabled) out.push('disabled');
  if (input.required) out.push('required');
  if (input.readOnly) out.push('readonly');
  if (el.tagName === 'INPUT' && (input.type === 'checkbox' || input.type === 'radio') && input.checked) out.push('checked');
  if (roleOf(el) === 'heading') {
    const m = /^h([1-6])$/i.exec(el.tagName);
    if (m) out.push(`level=${m[1]}`);
  }
  return out;
}

/** Full accessibility description of an element (name + role + states). */
export function describeElement(el: HTMLElement): A11yInfo {
  return { name: accessibleName(el), role: roleOf(el), states: statesOf(el) };
}
