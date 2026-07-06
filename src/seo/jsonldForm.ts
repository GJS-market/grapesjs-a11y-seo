import type { JsonLdBlock } from '../types';
import type { FieldDef, JsonLdTemplate } from './jsonld';
import { getPath, setPath } from './jsonld';
import { h, clear } from '../utils/h';

type T = (key: string, params?: Record<string, string | number>) => string;

/** Opens the host's asset picker and calls back with the chosen image URL. */
export type PickAsset = (onPick: (url: string) => void) => void;

/**
 * Build the editable form for a JSON-LD block from its template's `fields`.
 * Text edits mutate the block in place (via setPath) and call `onChange()`
 * without rebuilding the inputs, so focus is preserved on every keystroke.
 * List add/remove rebuilds only that list's container. When `pickAsset` is
 * given, image/logo fields also get an "Asset Manager" browse button.
 */
export function renderJsonLdFields(
  block: JsonLdBlock,
  template: JsonLdTemplate,
  onChange: () => void,
  t: T,
  pickAsset?: PickAsset,
): HTMLElement {
  const wrap = h('div', { class: 'gjs-as-ld-fields' });
  for (const field of template.fields) {
    wrap.appendChild(
      field.kind === 'list'
        ? renderList(block, field, onChange, t, pickAsset)
        : renderScalar(block, field, onChange, t, pickAsset),
    );
  }
  return wrap;
}

function renderScalar(
  target: Record<string, unknown>,
  field: FieldDef,
  onChange: () => void,
  t: T,
  pickAsset?: PickAsset,
): HTMLElement {
  const labelText = t(field.labelKey);
  const value = String(getPath(target, field.path) ?? '');
  const wrapper = h('div', { class: 'gjs-as-field gjs-as-ld-field' });

  const markInvalid = () => {
    if (!field.required) return;
    const empty = String(getPath(target, field.path) ?? '').trim() === '';
    wrapper.classList.toggle('gjs-as-invalid', empty);
  };
  const handle = (v: string) => {
    setPath(target, field.path, v);
    markInvalid();
    onChange();
  };

  const aria = labelText + (field.required ? ' *' : '');
  let input: HTMLElement;
  if (field.kind === 'select') {
    const sel = h('select', {
      class: 'gjs-as-select',
      attrs: { 'aria-label': aria },
      on: { change: () => handle((sel as HTMLSelectElement).value) },
    });
    for (const opt of field.options ?? []) sel.appendChild(h('option', { attrs: { value: opt }, text: opt }));
    (sel as HTMLSelectElement).value = value;
    input = sel;
  } else if (field.kind === 'textarea') {
    const ta = h('textarea', {
      attrs: { 'aria-label': aria, ...(field.required ? { 'aria-required': 'true' } : {}) },
      on: { input: () => handle((ta as HTMLTextAreaElement).value) },
    });
    (ta as HTMLTextAreaElement).value = value;
    input = ta;
  } else {
    const type = field.kind === 'date' ? 'date' : field.kind === 'url' ? 'url' : 'text';
    const el = h('input', {
      attrs: { type, 'aria-label': aria, ...(field.required ? { 'aria-required': 'true' } : {}) },
      on: { input: () => handle((el as HTMLInputElement).value) },
    });
    (el as HTMLInputElement).value = value;
    if (field.asset && pickAsset) {
      const browse = h('button', {
        class: 'gjs-as-asset-btn',
        text: '🖼',
        title: t('seo.ld.chooseImage'),
        attrs: { type: 'button', 'aria-label': t('seo.ld.chooseImage') },
        on: {
          click: () =>
            pickAsset((url) => {
              (el as HTMLInputElement).value = url;
              handle(url);
            }),
        },
      });
      input = h('div', { class: 'gjs-as-input-row' }, [el, browse]);
    } else {
      input = el;
    }
  }

  const label = h('label', {}, [
    document.createTextNode(labelText),
    field.required ? h('span', { class: 'gjs-as-req', text: ' *', attrs: { 'aria-hidden': 'true' } }) : null,
  ]);
  wrapper.append(label, input);
  markInvalid();
  return wrapper;
}

function renderList(
  block: JsonLdBlock,
  field: FieldDef,
  onChange: () => void,
  t: T,
  pickAsset?: PickAsset,
): HTMLElement {
  const container = h('div', { class: 'gjs-as-ld-list' });

  const rebuild = () => {
    clear(container);
    container.appendChild(h('div', { class: 'gjs-as-section-title', text: t(field.labelKey) }));
    const items = (getPath(block, field.path) as Array<Record<string, unknown>>) ?? [];
    renumber(items);

    items.forEach((item, i) => {
      const itemBox = h('div', { class: 'gjs-as-ld-subcard' }, [
        h('div', { class: 'gjs-as-ld-subcard-head' }, [
          h('span', { class: 'gjs-as-ld-index', text: String(i + 1) }),
          h('span', { class: 'gjs-as-ld-subcard-label', text: t(field.itemLabelKey || field.labelKey) }),
          h('button', {
            class: 'gjs-as-iconbtn',
            text: '✕',
            title: t('seo.ld.removeItem'),
            attrs: { 'aria-label': `${t('seo.ld.removeItem')} ${i + 1}`, type: 'button' },
            on: {
              click: () => {
                items.splice(i, 1);
                onChange();
                rebuild();
              },
            },
          }),
        ]),
      ]);
      for (const sub of field.itemFields ?? []) itemBox.appendChild(renderScalar(item, sub, onChange, t, pickAsset));
      container.appendChild(itemBox);
    });

    container.appendChild(
      h('button', {
        class: 'gjs-as-ld-add',
        text: `＋ ${t('seo.ld.addItem')}`,
        attrs: { type: 'button' },
        on: {
          click: () => {
            const arr = (getPath(block, field.path) as unknown[]) ?? [];
            arr.push(field.itemCreate ? field.itemCreate() : {});
            setPath(block, field.path, arr);
            onChange();
            rebuild();
          },
        },
      }),
    );
  };

  rebuild();
  return container;
}

/** Keep breadcrumb-style `position` fields sequential. */
function renumber(items: Array<Record<string, unknown>>): void {
  items.forEach((item, i) => {
    if ('position' in item) item.position = i + 1;
  });
}
