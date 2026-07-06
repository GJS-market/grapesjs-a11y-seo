import type { JsonLdBlock } from '../types';

/** How a single JSON-LD field is edited in the form. */
export type FieldKind = 'text' | 'url' | 'date' | 'textarea' | 'select' | 'list';

/** Describes one editable field of a JSON-LD block (or of a list item). */
export interface FieldDef {
  /** Dot path relative to the block (or, inside a list, to the item). */
  path: string;
  /** i18n key for the label. */
  labelKey: string;
  kind: FieldKind;
  required?: boolean;
  /** Show an "Asset Manager" picker button (for image/logo URL fields). */
  asset?: boolean;
  /** Options for `kind: 'select'`. */
  options?: string[];
  /** For `kind: 'list'`: the fields of each item. */
  itemFields?: FieldDef[];
  /** For `kind: 'list'`: how to create a new item. */
  itemCreate?: () => Record<string, unknown>;
  /** For `kind: 'list'`: i18n key labelling one item. */
  itemLabelKey?: string;
}

/** A JSON-LD schema template plus its required fields for validation. */
export interface JsonLdTemplate {
  type: string;
  label: string;
  required: string[];
  /** Editable fields shown in the form. */
  fields: FieldDef[];
  create(): JsonLdBlock;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'RUB', 'BRL'];

export const JSONLD_TEMPLATES: JsonLdTemplate[] = [
  {
    type: 'Article',
    label: 'Article',
    required: ['headline', 'author', 'datePublished'],
    fields: [
      { path: 'headline', labelKey: 'seo.ld.headline', kind: 'text', required: true },
      { path: 'author.name', labelKey: 'seo.ld.author', kind: 'text', required: true },
      { path: 'datePublished', labelKey: 'seo.ld.datePublished', kind: 'date', required: true },
      { path: 'dateModified', labelKey: 'seo.ld.dateModified', kind: 'date' },
      { path: 'image', labelKey: 'seo.ld.image', kind: 'url', asset: true },
      { path: 'description', labelKey: 'seo.ld.description', kind: 'textarea' },
    ],
    create: () => ({
      '@type': 'Article',
      headline: '',
      author: { '@type': 'Person', name: '' },
      datePublished: '',
      dateModified: '',
      image: '',
      description: '',
    }),
  },
  {
    type: 'Product',
    label: 'Product',
    required: ['name', 'offers'],
    fields: [
      { path: 'name', labelKey: 'seo.ld.name', kind: 'text', required: true },
      { path: 'offers.price', labelKey: 'seo.ld.price', kind: 'text', required: true },
      { path: 'offers.priceCurrency', labelKey: 'seo.ld.priceCurrency', kind: 'select', options: CURRENCIES },
      { path: 'image', labelKey: 'seo.ld.image', kind: 'url', asset: true },
      { path: 'brand.name', labelKey: 'seo.ld.brand', kind: 'text' },
      { path: 'description', labelKey: 'seo.ld.description', kind: 'textarea' },
    ],
    create: () => ({
      '@type': 'Product',
      name: '',
      image: '',
      brand: { '@type': 'Brand', name: '' },
      offers: { '@type': 'Offer', price: '', priceCurrency: 'USD' },
      description: '',
    }),
  },
  {
    type: 'Organization',
    label: 'Organization',
    required: ['name', 'url'],
    fields: [
      { path: 'name', labelKey: 'seo.ld.name', kind: 'text', required: true },
      { path: 'url', labelKey: 'seo.ld.url', kind: 'url', required: true },
      { path: 'logo', labelKey: 'seo.ld.logo', kind: 'url', asset: true },
    ],
    create: () => ({ '@type': 'Organization', name: '', url: '', logo: '' }),
  },
  {
    type: 'BreadcrumbList',
    label: 'Breadcrumbs',
    required: ['itemListElement'],
    fields: [
      {
        path: 'itemListElement',
        labelKey: 'seo.ld.breadcrumbs',
        kind: 'list',
        itemLabelKey: 'seo.ld.step',
        itemCreate: () => ({ '@type': 'ListItem', position: 1, name: '', item: '' }),
        itemFields: [
          { path: 'name', labelKey: 'seo.ld.stepName', kind: 'text' },
          { path: 'item', labelKey: 'seo.ld.stepUrl', kind: 'url' },
        ],
      },
    ],
    create: () => ({
      '@type': 'BreadcrumbList',
      itemListElement: [{ '@type': 'ListItem', position: 1, name: '', item: '' }],
    }),
  },
  {
    type: 'FAQPage',
    label: 'FAQ',
    required: ['mainEntity'],
    fields: [
      {
        path: 'mainEntity',
        labelKey: 'seo.ld.faq',
        kind: 'list',
        itemLabelKey: 'seo.ld.qa',
        itemCreate: () => ({ '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } }),
        itemFields: [
          { path: 'name', labelKey: 'seo.ld.question', kind: 'text' },
          { path: 'acceptedAnswer.text', labelKey: 'seo.ld.answer', kind: 'textarea' },
        ],
      },
    ],
    create: () => ({
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } }],
    }),
  },
  {
    type: 'WebSite',
    label: 'WebSite',
    required: ['name', 'url'],
    fields: [
      { path: 'name', labelKey: 'seo.ld.name', kind: 'text', required: true },
      { path: 'url', labelKey: 'seo.ld.url', kind: 'url', required: true },
    ],
    create: () => ({ '@type': 'WebSite', name: '', url: '' }),
  },
];

/** Read a dot-path value from a block (or list item). */
export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Set a dot-path value, creating intermediate objects as needed. */
export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof node[k] !== 'object' || node[k] === null) node[k] = {};
    node = node[k] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = value;
}

/** Find a template by @type. */
export function templateFor(type: string): JsonLdTemplate | undefined {
  return JSONLD_TEMPLATES.find((t) => t.type === type);
}

/** Emoji icon per schema type (no icon-font dependency). */
export const SCHEMA_ICON: Record<string, string> = {
  Article: '📄',
  Product: '🛒',
  Organization: '🏢',
  BreadcrumbList: '🧭',
  FAQPage: '❓',
  WebSite: '🌐',
};

/** Page-derived values used to auto-fill a schema. */
export interface AutoFillSource {
  title?: string;
  h1?: string;
  image?: string;
  url?: string;
  today?: string;
}

/**
 * Prefill a block's common fields from the page — but only where they are
 * currently empty (never overwrites user input). Returns the number of fields
 * filled. Pure/unit-testable; the panel supplies the source values.
 */
export function autoFillValues(block: JsonLdBlock, src: AutoFillSource): number {
  const type = block['@type'];
  const name = (src.h1 || src.title || '').trim();
  let filled = 0;
  const fill = (path: string, value: string | undefined): void => {
    if (!value) return;
    if (getPath(block, path) === '' || getPath(block, path) == null) {
      setPath(block, path, value);
      filled++;
    }
  };

  if (type === 'Article') {
    fill('headline', name);
    fill('image', src.image);
    fill('datePublished', src.today);
  } else if (type === 'Product') {
    fill('name', name);
    fill('image', src.image);
  } else if (type === 'Organization' || type === 'WebSite') {
    fill('name', src.title || name);
    fill('url', src.url);
  }
  return filled;
}

/** Report which required fields of a block are missing/empty. */
export function validateBlock(block: JsonLdBlock): string[] {
  const tpl = templateFor(block['@type']);
  if (!tpl) return [];
  return tpl.required.filter((field) => isEmpty(block[field]));
}

function isEmpty(value: unknown): boolean {
  if (value == null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0 || value.every((v) => deepEmpty(v));
  if (typeof value === 'object') return deepEmpty(value);
  return false;
}

function deepEmpty(obj: unknown): boolean {
  if (obj == null || obj === '') return true;
  if (typeof obj !== 'object') return false;
  // Ignore @type-only objects (considered empty of real data).
  const entries = Object.entries(obj as Record<string, unknown>).filter(([k]) => k !== '@type');
  return entries.length === 0 || entries.every(([, v]) => isEmpty(v));
}

// Fields that aren't required but strongly improve Google Rich Results.
const RICH_HINTS: Record<string, string[]> = {
  Article: ['image', 'dateModified'],
  Product: ['image', 'brand', 'aggregateRating'],
  Organization: ['logo', 'sameAs'],
  WebSite: ['potentialAction'],
  BreadcrumbList: [],
  FAQPage: [],
};

/**
 * Advisory hints (beyond required fields) for a block's Rich Results
 * eligibility — heuristic, not the real Google validator.
 */
export function richResultsHints(block: JsonLdBlock): string[] {
  const hints = RICH_HINTS[block['@type']] || [];
  return hints.filter((field) => isEmpty(block[field]));
}

/**
 * Recursively drop empty scalars/arrays/objects (keeping `@type`-only objects
 * out) so pre-seeded but unfilled optional fields never reach exported markup.
 */
export function pruneEmpty<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => pruneEmpty(v)).filter((v) => !isEmpty(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '@type' || k === '@context') {
        out[k] = v;
        continue;
      }
      const pruned = pruneEmpty(v);
      if (!isEmpty(pruned)) out[k] = pruned;
    }
    return out as T;
  }
  return value;
}

/** Render a `<script type="application/ld+json">` for one block (empties pruned). */
export function renderJsonLd(block: JsonLdBlock): string {
  const withContext = pruneEmpty({ '@context': 'https://schema.org', ...block });
  return `<script type="application/ld+json">${JSON.stringify(withContext)}</script>`;
}
