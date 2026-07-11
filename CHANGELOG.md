# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and the project adheres to
[Semantic Versioning](https://semver.org/).

## [2.3.4] - 2026-07-11

### Changed
- **Build switched to `grapesjs-cli`, producing one self-contained UMD bundle.** `dist/`
  now contains exactly three files — `index.js`, `index.js.map`, `index.d.ts` — and the
  build output is committed to the repo (browseable on GitHub, servable via the jsdelivr
  `/gh/` path). `dist/index.js` registers `window.grapesjsA11ySeo`, keeps `grapesjs`
  external, bundles axe-core, and **injects its own CSS** (no separate stylesheet to link).

### Removed
- The separate ESM / `.umd.cjs` entries and the standalone `.css` file (CSS is now injected
  by the bundle). `import 'grapesjs-a11y-seo/style.css'` is no longer needed or available.
- The headless CI auditor (`grapesjs-a11y-seo-ci` bin and the `grapesjs-a11y-seo/ci`
  export). The in-editor auditor is unchanged.

## [2.3.3] - 2026-07-10

### Added
- **Browser UMD build for `<script>` / CDN use.** A real `dist/grapesjs-a11y-seo.umd.js`
  is now emitted (in addition to the ESM and `.umd.cjs` entries), attaching to the
  `window.grapesjsA11ySeo` global with GrapesJS read from `window.grapesjs`. The package
  now advertises `browser`, `unpkg`, and `jsdelivr` fields plus a `grapesjs` marketplace
  metadata block, so it installs and runs directly in the browser (e.g. the GJS Market
  catalog and the WordPress builder).
- `axe-core` is bundled into the browser UMD only, so a plain `<script>` is
  self-contained. The npm ESM/CJS builds keep it as an optional, lazy-loaded external —
  `import` consumers' bundles stay tiny.

## [2.3.2] - 2026-07-07

### Docs
- Added a screenshot of the accessibility auditor (canvas + findings panel) to the README
  and the npm page.

## [2.3.1] - 2026-07-07

### Fixed
- **In-editor "GitHub" footer link** now points to the canonical repository
  (`github.com/GJS-market/grapesjs-a11y-seo`) instead of the old placeholder. The
  `repository`/`bugs` URLs in `package.json` were corrected to match.

### Docs
- Added a project banner (rendered on the README and the npm page), npm/CI/license/bundle
  badges, and a hosted live demo at
  [grapesjs-a11y-seo.netlify.app](https://grapesjs-a11y-seo.netlify.app/) with a switcher
  between plain **GrapesJS** and **GrapesJS Studio**.

## [2.3.0] - 2026-07-06

### Added
- **Pick images from the GrapesJS Asset Manager.** Image/logo URL fields — JSON-LD
  `image`/`logo` and the OG image field — now show a 🖼 browse button that opens
  `editor.AssetManager` (`types: ['image']`) and drops the chosen asset's URL into the field.
  Typing a URL still works. New `FieldDef.asset` flag + `PickAsset` callback; the demo seeds a
  few offline SVG assets. e2e: `tests/e2e/assets.spec.ts`.

### Fixed
- **First hotkey/♿-button toggle was a no-op.** With `enabled: true` the panel auto-opened via
  `panel.show()`, which left GrapesJS' command active-state (and the ♿ toolbar button) out of
  sync, so the first `⌘/Ctrl+Shift+A` press or button click did nothing. Auto-open now runs
  through the toggle command. e2e: `tests/e2e/toggle.spec.ts` covers hotkey open/close and
  opening from the ♿ button.

## [2.2.2] - 2026-07-06

### Fixed
- **Checkbox rows were misaligned** — in Settings (Live audit, the rules grid) and SEO
  (Index / Follow) the generic `.gjs-as-field` styling stretched each checkbox to full width
  and stacked it *above* its label. Checkboxes now render as a proper inline row (box then
  label) via a dedicated `.gjs-as-check` class with `accent-color`; select/text fields are
  unaffected. Both checkbox renderers (`SettingsPanel`, `SeoPanel`) share the class.

## [2.2.1] - 2026-07-06

### Fixed
- **Multi-page audit could wedge on a race (critical).** Toggling *All pages* (or *Run*) while
  the initial single-page audit was still in flight could hang the auditor silently: the idle
  scheduler called `requestIdleCallback` with no timeout, so if it starved the audit promise
  never settled, `auditing` stayed `true`, and the queued all-pages run was dropped. The idle
  yield now passes `{ timeout: 300 }` **and** races a `setTimeout` fallback so it always
  resolves; `runAuditAsync` also gained a `.catch` so a failed run can never leave the auditor
  stuck. Regression tests: `AuditEngine.test.ts` (idle scheduler always settles) +
  `tests/e2e/multipage.spec.ts` (toggle mid-audit converges).
- **`landmarks.unnamedNav` almost never fired.** The rule derived a landmark's name via
  `accessibleName`, which falls back to `textContent`, so any `<nav>` with link text looked
  "named". Landmark naming now uses a new `landmarkLabel()` helper (aria-label /
  aria-labelledby / title only — no text fallback).
- **Icon-only links falsely flagged `link-name.empty`.** `<a href="/"><img alt="Home"></a>` has
  empty `textContent`; `accessibleName` now falls back to nested `img[alt]` / `[aria-label]`
  when own text is empty (decorative `alt=""` still contributes nothing).

## [2.2.0] - 2026-07-06

### JSON-LD (Structured data) — refined block

- Each schema is now a **collapsible card** with a per-type emoji icon, the type label, a
  status **pill** (`✓ Valid` / `⚠ N missing`), a chevron, and an aria-labelled actions row
  (Auto-fill · Duplicate · Copy JSON · Remove). Default expanded; header toggles the body.
- Schemas are added from a row of **icon chips** (one per type) with an empty-state hint,
  replacing the bare `<select>`.
- **Auto-fill from page** prefills empty fields from the page + SEO model
  (`autoFillValues(block, { title, h1, image, url })`): Article/Product name·image,
  Org/WebSite name·url, Article `datePublished`←today. **Duplicate** and **Copy JSON** per card.
- Fields show a required `*` + `aria-required` and a live **invalid ring** until filled;
  list items (FAQ/breadcrumb) render as numbered **sub-cards** with a full-width dashed
  **＋ Add** button.
- **Advanced: JSON** gains **Copy**, **Format** (pretty-print), and a **Test in Google Rich
  Results** external link (no network from the plugin).
- New `SCHEMA_ICON` map + `autoFillValues` helper (unit-tested); refreshed `.gjs-as-ld-*`
  theming; ru/es labels; e2e for chip-add, fill→valid, collapse/expand, duplicate, auto-fill,
  FAQ add-item, and Advanced Format. All new controls carry accessible names (self-audit stays
  clean).

## [2.1.0] - 2026-07-06

### JSON-LD field editor
- Structured-data blocks are now **editable**: each schema renders proper inputs for its
  required + key optional fields (Article, Product, Organization, WebSite, BreadcrumbList,
  FAQPage), including **repeatable items** (FAQ questions, breadcrumb steps) with add/remove.
- Per-block **Advanced: JSON** collapsible textarea for arbitrary/complex fields (validated
  on input).
- Empty optional fields are pruned from exported markup (`pruneEmpty`); `getPath`/`setPath`
  helpers. Live validation status updates in place (focus preserved while typing).
- ru/es labels shipped; unit + e2e coverage.

## [2.0.0] - 2026-07-06

Reference-implementation release — beyond "axe in a panel".

### Quick-fix
- Unified fix model: `fix()` returns a `FixResult` (before/after diff); `a11y:fix` event;
  element-accurate targeting via `el.__gjsv.model`. Fixes for media-captions, and correct
  clearing for wrapped iframes.
- **Fix all safe** (single undo group); contrast is now a one-click colour fix. Every fix
  goes through the component API and is undoable.

### Visibility
- Layer Manager severity badges; **Highlight issues** persistent overlay; **Show tab order**
  focus visualizer + new `visual-focus-mismatch` rule.
- **Accessibility Tree** preview (name / role / states) for the selected component.

### Workflow
- **Settings** tab (rules on/off, WCAG level/version, theme, engine, ignored selectors),
  persisted per project via a new ProjectStore.
- **Baseline** / "won't fix" accepted-risk, excluded from the score, persisted.
- Score-history sparkline; "Powered by" badge (`api.getBadgeHtml()`).

### Reach
- **Headless engine + CLI** (`grapesjs-a11y-seo/ci`, `grapesjs-a11y-seo-ci`) for CI /
  pre-deploy, powered by linkedom (isolated; browser core stays zero-dep).
- SEO: separate Twitter card, cross-page duplicate title/description, Core Web Vitals
  heuristics, hreflang, opt-in external-link check, JSON-LD Rich Results hints.
- The plugin passes its own audit (roles, names, keyboard, aria-live).
- Shipped `en` / `ru` / `es` i18n bundles; README comparison table.

## [1.0.0] - 2026-07-03

Initial release.

### Added (follow-up in this release)
- **Multi-page audit**: an "All pages" toggle audits every page, tags findings
  with their page (badge + "this page only" filter), and cross-page "Show"
  selects the finding's page first. Live re-audit is suppressed in this mode.
- **`mountInDevtools`**: mounts the UI as a tab inside `grapesjs-devtools` when
  present (best-effort), with graceful fallback to the standalone panel.
- **`editor.I18n` bridge**: strings are registered under an `a11ySeo` namespace
  and resolved through GrapesJS' i18n, so hosts can localize centrally.
- Expanded tests: jsdom unit coverage for all builtin rules; e2e for the axe
  engine, a 1200+ component performance guard, and multi-page auditing.
- CI now runs the Playwright e2e suite; `npm pack` contents verified.

### Accessibility
- Live in-editor WCAG 2.1/2.2 auditor with 15 built-in rules (`img-alt`,
  `contrast`, `headings`, `link-name`, `form-labels`, `aria-valid`, `landmarks`,
  `tabindex`, `target-size`, `media-captions`, `iframe-title`, `duplicate-id`,
  `table-structure`, `lang`, `font-size`).
- Every finding is bound to its GrapesJS component: **Show** (select + scroll +
  overlay highlight), **Fix** (safe quick-fix via the component API), **Learn**.
- Dependency-free contrast engine validated against WebAIM reference pairs;
  effective-background compositing with alpha; version-aware SC citations.
- Score (0–100), severity/rule filters, JSON + Markdown report export.
- Chunked audit via `requestIdleCallback` (with `setTimeout` fallback), per-run
  computed-style cache, and debounced live re-audit.
- Optional lazy **axe-core** engine (`engine: 'axe'`) mapping results back to
  components.

### SEO
- Per-page metadata store persisted in `projectData` (survives save/load).
- Editor with live length counters; Google SERP (pixel-width truncation),
  Open Graph and Twitter card previews.
- SEO checklist, JSON-LD templates (Article, Product, Organization,
  BreadcrumbList, FAQPage, WebSite) with required-field validation.
- `getHeadHtml()`, `renderPage()` and `getSitemap()` exports.

### Infrastructure
- Dockable, resizable, themeable panel (light/dark/auto); command + hotkey
  (auto `⌘` on macOS) + toolbar button.
- Leak-proof `EditorBridge`; `destroy()` restores the editor to baseline.
- i18n-ready (all strings via a message catalog); `tsc --strict` clean.
- ESM + UMD + bundled `.d.ts`; zero runtime dependencies.
