/**
 * Default English message catalog. Every user-facing string flows through
 * {@link makeT}, so hosts can localize by passing `opts.i18n` overrides (keyed
 * by the same ids). Placeholders use `{name}` and are filled from params.
 */
export const DEFAULT_MESSAGES: Record<string, string> = {
  // Panel chrome
  'panel.label': 'Accessibility & SEO auditor',
  'a11y.announce': 'Audit complete: {errors} errors, {warnings} warnings, {infos} info. Score {score}.',
  'tab.a11y': 'Accessibility',
  'tab.seo': 'SEO',
  'tab.settings': 'Settings',
  'dock.left': 'Dock left',
  'dock.right': 'Dock right',
  'dock.bottom': 'Dock bottom',
  'action.close': 'Close',
  'action.show': 'Show',
  'action.fix': 'Fix',
  'action.fixWith': 'Fix ({what})',
  'action.learn': 'Learn',
  'action.remove': 'Remove',
  'action.wontFix': "Won't fix",
  'action.restore': 'Restore',
  'footer.tagline': 'Built by gjs.market for the GrapesJS community ♥',
  'footer.services': 'Services',
  'common.on': 'on',
  'common.off': 'off',

  // Severity
  'severity.error': 'errors',
  'severity.warning': 'warnings',
  'severity.info': 'info',

  // Accessibility panel
  'a11y.run': 'Run audit',
  'a11y.live': 'Live',
  'a11y.allPages': 'All pages',
  'a11y.currentPageOnly': 'This page only',
  'a11y.accepted': 'Accepted',
  'a11y.fixAll': 'Fix all safe',
  'a11y.fixAllN': 'Fix all safe ({n})',
  'a11y.highlightAll': 'Highlight issues',
  'a11y.tabOrder': 'Show tab order',
  'a11y.tree': 'Accessibility tree',
  'a11y.treeName': 'Name',
  'a11y.treeRole': 'Role',
  'a11y.treeStates': 'States',
  'a11y.export': 'Export',
  'a11y.allRules': 'All rules',
  'a11y.notRun': 'Run an audit to see accessibility findings.',
  'a11y.clean': 'No accessibility issues found. 🎉',
  'a11y.noneMatch': 'No findings match the current filters.',

  // Rules
  'img-alt.missing': 'Image has no alt attribute.',
  'img-alt.filename': 'Alt text "{alt}" looks like the file name — describe the image instead.',
  'contrast.low': 'Low contrast {ratio}:1 (needs {required}:1). Try {suggestion}.',
  'contrast.unverifiable': 'Contrast can’t be verified over a background image/gradient.',
  'headings.empty': 'Empty h{level} heading.',
  'headings.skip': 'Heading level jumps from h{from} to h{to} — use h{fix}.',
  'headings.noH1': 'Page has no h1 heading.',
  'headings.multipleH1': 'Page has {count} h1 headings — use exactly one.',
  'link-name.empty': 'Link has no accessible name.',
  'link-name.placeholder': 'Describe this link',
  'link-name.vague': 'Vague link text "{text}" — describe the destination.',
  'link-name.noHref': 'Link has no valid href.',
  'form-labels.missing': 'Form control has no associated label.',
  'form-labels.placeholderOnly': 'Placeholder is not a substitute for a label.',
  'form-labels.placeholderText': 'Label',
  'form-labels.noName': 'Form control has no name attribute.',
  'aria-valid.badRole': 'Invalid ARIA role "{role}".',
  'aria-valid.badRef': '{attr} references missing id "{id}".',
  'landmarks.noMain': 'Page has no main landmark.',
  'landmarks.multipleMain': 'Page has {count} main landmarks — use one.',
  'landmarks.unnamedNav': 'Multiple nav landmarks should have distinct labels.',
  'landmarks.navLabel': 'Navigation',
  'tabindex.positive': 'Positive tabindex ({value}) disrupts focus order.',
  'target-size.small': 'Target is {w}×{h}px — below the {min}px minimum.',
  'media-captions.missing': '<{tag}> has no captions/subtitles track.',
  'iframe-title.missing': 'Iframe has no title.',
  'iframe-title.placeholder': 'Embedded content',
  'duplicate-id.dup': 'Duplicate id "{id}".',
  'table-structure.noTh': 'Data table has no <th> header cells.',
  'table-structure.noScope': 'Complex table cells lack scope/headers association.',
  'table-structure.noCaption': 'Table has no <caption>.',
  'lang.missing': 'Document has no lang attribute.',
  'lang.invalid': 'Document lang "{lang}" is not a valid language tag.',
  'font-size.small': 'Text is {px}px — smaller than 12px is hard to read.',
  'visual-focus-mismatch.msg': 'Tab position {tab} doesn’t match visual order {visual}.',

  // SEO fields
  'seo.title': 'Title',
  'seo.description': 'Meta description',
  'seo.canonical': 'Canonical URL',
  'seo.focusKeyword': 'Focus keyword',
  'seo.index': 'Index',
  'seo.follow': 'Follow',
  'seo.social': 'Social (Open Graph / Twitter)',
  'seo.ogImage': 'OG image URL',
  'seo.ogTitle': 'OG title (optional)',
  'seo.previews': 'Previews',
  'seo.checklist': 'SEO checklist',
  'seo.jsonld': 'Structured data (JSON-LD)',
  'seo.export': 'Export',
  'seo.exportHead': 'Head HTML',
  'seo.exportPage': 'Full page',
  'seo.exportSitemap': 'sitemap.xml',
  'seo.counter.title': '{len} chars (aim 30–60)',
  'seo.counter.desc': '{len} chars (aim 50–160)',
  'seo.previewTitle': 'Your page title',
  'seo.previewDesc': 'Your meta description appears here in search results.',
  'seo.noImage': 'No OG image',
  'seo.addSchema': '+ Add schema…',
  'seo.addSchemaOf': 'Add {type} schema',
  'seo.jsonldMissing': 'Missing required: {fields}',
  'seo.jsonldOk': 'All required fields present.',
  'seo.jsonldHints': 'For Rich Results, consider: {fields}',
  'seo.ld.advanced': 'Advanced: JSON',
  'seo.ld.jsonInvalid': 'Invalid JSON — changes not applied.',
  'seo.ld.addItem': 'Add item',
  'seo.ld.removeItem': 'Remove',
  'seo.ld.empty': 'No structured data yet. Add a schema so search engines can show rich results.',
  'seo.ld.pillValid': '✓ Valid',
  'seo.ld.pillMissing': '⚠ {n} missing',
  'seo.ld.autoFill': 'Auto-fill from page',
  'seo.ld.duplicate': 'Duplicate',
  'seo.ld.copyJson': 'Copy JSON',
  'seo.ld.formatJson': 'Format',
  'seo.ld.testGoogle': 'Test in Google',
  'seo.ld.chooseImage': 'Choose image from Asset Manager',
  'seo.ld.headline': 'Headline',
  'seo.ld.author': 'Author name',
  'seo.ld.datePublished': 'Date published',
  'seo.ld.dateModified': 'Date modified',
  'seo.ld.image': 'Image URL',
  'seo.ld.description': 'Description',
  'seo.ld.name': 'Name',
  'seo.ld.url': 'URL',
  'seo.ld.logo': 'Logo URL',
  'seo.ld.price': 'Price',
  'seo.ld.priceCurrency': 'Currency',
  'seo.ld.brand': 'Brand',
  'seo.ld.breadcrumbs': 'Breadcrumb steps',
  'seo.ld.step': 'Step',
  'seo.ld.stepName': 'Name',
  'seo.ld.stepUrl': 'URL',
  'seo.ld.faq': 'Questions',
  'seo.ld.qa': 'Q&A',
  'seo.ld.question': 'Question',
  'seo.ld.answer': 'Answer',
  'seo.ogCard': 'Open Graph (Facebook / LinkedIn)',
  'seo.twitterCard': 'Twitter ({card})',

  // Settings
  'settings.intro': 'Project settings — saved with the project, so anyone editing it shares them.',
  'settings.rules': 'Rules',
  'settings.wcagLevel': 'WCAG level',
  'settings.wcagVersion': 'WCAG version',
  'settings.theme': 'Theme',
  'settings.live': 'Live audit',
  'settings.engine': 'Audit engine',
  'settings.ignoreSelectors': 'Ignore selectors (one per line)',
  'settings.reset': 'Reset to defaults',

  // SEO checks
  'seo.check.title': 'Title length: {len} chars (~{px}px)',
  'seo.check.desc': 'Description length: {len} chars',
  'seo.check.h1': 'H1 count: {count}',
  'seo.check.alt': 'Alt coverage: {pct}% of {total} images',
  'seo.check.words': 'Word count: {count}',
  'seo.check.links': 'Broken internal links: {count}',
  'seo.check.keyword': 'Focus keyword found in {hits}/3 key places',
  'seo.check.ogImage': 'Open Graph image set',
  'seo.check.canonical': 'Canonical URL set',
  'seo.check.cwvDims': 'Images without width/height (CLS risk): {count}',
  'seo.check.cwvLazy': 'Images without loading="lazy": {count}',
  'seo.check.cwvFormat': 'Legacy image formats (prefer WebP/AVIF): {count}',
  'seo.check.hreflang': 'Invalid hreflang: {bad} of {total}',
  'seo.check.dupTitle': 'Duplicate titles across pages: {count}',
  'seo.check.dupDesc': 'Duplicate descriptions across pages: {count}',
  'seo.check.extLinks': 'Broken external links: {count}',
};

/**
 * Convert our flat, dot-separated catalog into the nested shape GrapesJS'
 * `I18n.addMessages` expects (it splits keys on `.` when resolving). e.g.
 * `'img-alt.missing'` → `{ 'img-alt': { missing: '…' } }`. Lets hosts localize
 * our strings through `editor.I18n` centrally.
 */
export function buildNested(flat: Record<string, string>): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (typeof node[p] !== 'object' || node[p] === null) node[p] = {};
      node = node[p] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]] = value;
  }
  return root;
}

/** Resolve a message key with params, merging default + host-supplied strings. */
export function makeT(
  overrides: Record<string, string> = {},
): (key: string, params?: Record<string, string | number>) => string {
  const table = { ...DEFAULT_MESSAGES, ...overrides };
  return (key, params) => {
    let msg = table[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return msg;
  };
}
