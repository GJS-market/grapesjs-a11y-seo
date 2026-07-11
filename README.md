<p align="center">
  <img src="https://raw.githubusercontent.com/GJS-market/grapesjs-a11y-seo/main/assets/banner.png" alt="grapesjs-a11y-seo — Lighthouse for GrapesJS: a live WCAG 2.2 accessibility auditor and SEO metadata manager inside the editor, with one-click quick-fixes" width="100%" />
</p>

# grapesjs-a11y-seo

### Lighthouse for GrapesJS — live WCAG accessibility + SEO, right inside the editor

[![npm version](https://img.shields.io/npm/v/grapesjs-a11y-seo?color=cb0000&logo=npm)](https://www.npmjs.com/package/grapesjs-a11y-seo)
[![npm downloads](https://img.shields.io/npm/dm/grapesjs-a11y-seo?color=cb0000&logo=npm)](https://www.npmjs.com/package/grapesjs-a11y-seo)
[![CI](https://img.shields.io/github/actions/workflow/status/GJS-market/grapesjs-a11y-seo/ci.yml?branch=main&label=CI&logo=github)](https://github.com/GJS-market/grapesjs-a11y-seo/actions/workflows/ci.yml)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/grapesjs-a11y-seo?label=min%2Bgzip)](https://bundlephobia.com/package/grapesjs-a11y-seo)
[![types included](https://img.shields.io/npm/types/grapesjs-a11y-seo?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/npm/l/grapesjs-a11y-seo?color=brightgreen)](./LICENSE)

> **Lighthouse for GrapesJS** — a live accessibility auditor (WCAG 2.1/2.2) **and** an SEO metadata manager, right inside the editor.

Every accessibility finding is **bound to the exact GrapesJS component**: click it and the component is selected, scrolled into view and highlighted on the canvas — with a one-click **quick-fix** through the component API where the fix is unambiguous. The SEO tab manages per-page metadata with live Google / Open Graph / Twitter previews, a checklist, JSON-LD, and full `<head>` / `sitemap.xml` export.

Built by [gjs.market](https://gjs.market) for the GrapesJS community — same DNA as [`grapesjs-devtools`](https://github.com/GJS-market/grapesjs-devtools). **Zero runtime dependencies** in the browser (axe-core is an optional peer; linkedom is used only by the `./ci` entry).

<p align="center">
  <img src="https://raw.githubusercontent.com/GJS-market/grapesjs-a11y-seo/main/assets/screenshot-a11y.png" alt="The accessibility auditor open beside the GrapesJS canvas: an overall score with error/warning/info counts and a list of findings (missing alt, low contrast, empty link, unlabeled form control, invalid ARIA role), each with Show, Fix, Learn and Won't-fix actions" width="100%" />
</p>

## Why not just run axe in the console?

| | grapesjs-a11y-seo | axe-core in console | Lighthouse CI |
|---|---|---|---|
| Findings bound to the **GrapesJS component** | ✅ select / scroll / highlight | ❌ DOM only | ❌ |
| **Quick-fix** through the component API (undoable) | ✅ + "Fix all safe" | ❌ | ❌ |
| **Live** audit while editing | ✅ | ❌ | ❌ |
| **SEO** out of the box (meta, previews, JSON-LD, sitemap) | ✅ | ❌ | partial |
| **Multi-page** | ✅ | ❌ | ✅ |
| Layer badges · focus-order visualizer · a11y tree | ✅ | ❌ | ❌ |
| Baseline / "won't fix" | ✅ | ❌ (axe CI) | ✅ |
| Works in **CI** (headless) | ✅ `grapesjs-a11y-seo-ci` | ✅ | ✅ |
| In-editor, no build step | ✅ | ✅ | ❌ |

---

## Live demo

**▶ [grapesjs-a11y-seo.netlify.app](https://grapesjs-a11y-seo.netlify.app/)**

Try the auditor on a deliberately-broken page, and use the top switcher to run it inside
**plain GrapesJS** or **GrapesJS Studio**. Press **Ctrl/⌘ + Shift + A** or click the ♿ button
to open the auditor. Or run it locally with `npm run dev`.

<!-- TODO: drop a short screen capture at demo/demo.gif and uncomment:
![grapesjs-a11y-seo in action](./demo/demo.gif)
-->

---

## Install

```bash
npm i grapesjs-a11y-seo
```

```js
import grapesjs from 'grapesjs';
import a11ySeo from 'grapesjs-a11y-seo';
// Styles are injected automatically — no separate CSS import needed.

const editor = grapesjs.init({
  container: '#gjs',
  plugins: [a11ySeo],
  pluginsOpts: {
    'grapesjs-a11y-seo': {
      hotkey: 'ctrl+shift+a', // ⌘ variant added automatically on macOS
      position: 'right',
      theme: 'dark',
      wcagLevel: 'AA',
      wcagVersion: '2.2',
    },
  },
});
```

Open the panel with the hotkey, the ♿ toolbar button, or `editor.A11ySeo.open()`.

### Browser `<script>` / CDN

No bundler? Load GrapesJS, then the plugin — a single self-contained UMD bundle
that registers the global `window.grapesjsA11ySeo` and injects its own CSS
(axe-core is bundled in too, so nothing else is needed):

```html
<link rel="stylesheet" href="https://unpkg.com/grapesjs/dist/css/grapes.min.css" />
<script src="https://unpkg.com/grapesjs"></script>
<script src="https://unpkg.com/grapesjs-a11y-seo"></script>
<script>
  const editor = grapesjs.init({
    container: '#gjs',
    plugins: [window.grapesjsA11ySeo],
  });
</script>
```

## What it checks

| # | Rule | Catches | WCAG |
|---|---|---|---|
| 1 | `img-alt` | missing `alt`, filename-like `alt` | 1.1.1 (A) |
| 2 | `contrast` | text below 4.5:1 / 3:1 (AAA-aware); flags un-checkable image backgrounds | 1.4.3 / 1.4.6 |
| 3 | `headings` | skipped levels, empty headings, missing / multiple `h1` | 1.3.1 / 2.4.6 |
| 4 | `link-name` | empty links, vague "click here", missing `href` | 2.4.4 (A) |
| 5 | `form-labels` | controls with no label, placeholder-as-label, missing `name` | 1.3.1 / 3.3.2 / 4.1.2 |
| 6 | `aria-valid` | invalid roles, dangling `aria-*` idrefs | 4.1.2 (A) |
| 7 | `landmarks` | no/multiple `main`, unnamed `nav` | 2.4.1 (A) |
| 8 | `tabindex` | positive `tabindex` | 2.4.3 (A) |
| 9 | `target-size` | targets below 24px (AA) / 44px (AAA) | 2.5.8 / 2.5.5 |
| 10 | `media-captions` | `<video>`/`<audio>` without a captions track | 1.2.2 (A) |
| 11 | `iframe-title` | `<iframe>` without a title | 4.1.2 (A) |
| 12 | `duplicate-id` | repeated ids (version-aware: 1.3.1 in 2.2, 4.1.1 in 2.0/2.1) | 4.1.1 / 1.3.1 |
| 13 | `table-structure` | data tables without `<th>`/scope/caption | 1.3.1 (A) |
| 14 | `lang` | missing / invalid document language | 3.1.1 (A) |
| 15 | `font-size` | text below 12px (advisory) | 1.4.4 (AA) |

## SEO tab

- **Per-page metadata**: title, description, canonical, robots, focus keyword, Open Graph, Twitter, favicon.
- **Live previews**: Google SERP (real **pixel-width** title truncation), Open Graph & Twitter cards.
- **Checklist**: title/description length, one `h1`, alt coverage, OG image, canonical, word count, focus-keyword placement, broken internal links.
- **JSON-LD**: Article, Product, Organization, BreadcrumbList, FAQPage, WebSite — with required-field validation.
- **Export**: `getHeadHtml()`, `renderPage()` (full document), `getSitemap()`.

```js
const seo = editor.A11ySeo;
seo.setSeo(pageId, { title: 'Home', description: '…', og: { image: 'https://…/cover.jpg' } });
const head = seo.getHeadHtml();      // <title>… <meta …> <script type="application/ld+json">…
const html = seo.renderPage();       // <!doctype html>… full standalone document
const xml  = seo.getSitemap('https://example.com');
```

## More v2 features

- **Quick-fixes**: every fixable finding has a one-click Fix (undoable via the component
  API); **Fix all safe** applies them as a single undo step; contrast offers a one-click
  colour fix. Subscribe with `editor.A11ySeo.on('fix', cb)`.
- **See issues where you work**: severity badges on Layer Manager rows, a **Highlight issues**
  overlay, and a **Show tab order** visualizer (numbered focus path + `visual-focus-mismatch`
  rule).
- **Accessibility Tree**: name / role / states for the selected component.
- **Baseline**: mark a finding **Won't fix** — excluded from the score, kept under an
  *Accepted* filter (persisted with the project).
- **Settings tab**: content editors toggle rules, WCAG level/version, theme, engine and
  ignored selectors — saved with the project, no code needed.
- **i18n**: shipped `en` / `ru` / `es` bundles (`locale` option); fully overridable.

## Multi-page

Toggle **All pages** in the Accessibility tab to audit every page at once — each
finding is tagged with its page and a **This page only** filter narrows the
list. SEO metadata is managed per page, and `getSitemap()` covers them all.

## Options

See [`DOCS.md`](./DOCS.md) for the full reference. Highlights: `engine` (`'builtin' | 'axe'`), `wcagLevel`, `wcagVersion`, `live`, `disableRules`, `rules` (custom), `ignoreSelectors`, `i18n`, `theme`, `position`, `showButton`, `mountInDevtools`.

### Optional axe-core engine

For 100% rule coverage, set `engine: 'axe'` and install axe-core (`npm i axe-core`). It's lazy-loaded, so the default bundle stays tiny; results are still mapped back to components.

## Honest limits

The built-in engine is a **helper, not a replacement** for manual testing or axe. It doesn't emulate a screen reader, can't verify contrast over background images/gradients (flagged as un-checkable), and doesn't inspect `::before`/`::after`. Use `engine: 'axe'` for full coverage.

## License

MIT © gjs.market — [custom GrapesJS development & plugins](https://gjs.market/services).
