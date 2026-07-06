# grapesjs-a11y-seo — reference

## Options

```ts
interface A11ySeoOptions {
  enabled?: boolean;            // open panel on init (default false)
  hotkey?: string;             // 'ctrl+shift+a' — ⌘ variant auto-added on macOS
  position?: 'left' | 'right' | 'bottom';   // default 'right'
  theme?: 'dark' | 'light' | 'auto';        // default 'dark'
  open?: 'a11y' | 'seo';       // initial tab (default 'a11y')
  engine?: 'builtin' | 'axe';  // audit engine (default 'builtin')
  wcagLevel?: 'AA' | 'AAA';    // affects contrast + target-size (default 'AA')
  wcagVersion?: '2.0' | '2.1' | '2.2';      // affects SC citations (default '2.2')
  live?: boolean;              // auto re-audit on changes (default true)
  auditDebounce?: number;      // ms (default 400)
  disableRules?: string[];     // e.g. ['font-size']
  rules?: Rule[];              // custom rules (add or override by id)
  ignoreSelectors?: string[];  // skip matching subtrees during audit
  seo?: { defaults?: Partial<SeoModel>; baseUrl?: string };
  i18n?: Record<string, string>;  // message-key overrides
  showButton?: boolean;        // add ♿ toolbar button (default true)
  mountInDevtools?: boolean;   // mount as a tab inside grapesjs-devtools if present
  locale?: string;             // 'en' | 'ru' | 'es' (shipped bundles; default 'en')
  checkExternalLinks?: boolean;// opt-in network check of external links (default false)
}
```

Most of these are also editable at runtime from the **Settings** tab and persist with the
project (in `projectData.a11ySeoState`).

### Multi-page audit

The Accessibility toolbar has an **All pages** toggle. In this mode the engine
audits every page (selecting each in turn, since only the active page has live
DOM/computed style), tags each finding with its page, and shows a page badge; a
**This page only** filter narrows the list. **Show** on a finding from another
page selects that page first. Live re-audit is suppressed in all-pages mode
(page cycling would otherwise feed back into itself) — re-run on demand with the
**Run audit** button.

### i18n via `editor.I18n`

Our message catalog is registered with GrapesJS' `editor.I18n` under the
`a11ySeo` namespace and resolved through it (falling back to the built-in
catalog), so you can localize centrally with `editor.I18n.addMessages(...)` or
override individual strings inline via `opts.i18n`.

### mountInDevtools

When `mountInDevtools: true` and `grapesjs-devtools` is detected in the DOM, the
UI mounts as an extra tab inside the devtools panel (best-effort, via its DOM
structure). If devtools isn't present the plugin falls back to its own floating
panel. Hosts embedding the UI elsewhere can call `editor.A11ySeo` and reuse the
panes returned by the panel.

## Public API — `editor.A11ySeo` (also returned by the plugin)

```ts
interface A11ySeoApi {
  runAudit(): Violation[];               // synchronous audit
  getResults(): Violation[];             // last results
  addRule(rule: Rule): void;
  disableRule(id: string): void;
  on(evt: 'audit' | 'seo:change', cb): void;
  getSeo(pageId?): SeoModel;
  setSeo(pageId, patch: Partial<SeoModel>): void;
  getHeadHtml(pageId?): string;
  renderPage(pageId?): string;
  getSitemap(baseUrl?): string;
  getBadgeHtml(): string;      // "Powered by" attribution snippet
  getScoreHistory(): number[]; // score at the last N project saves
  open(tab?): void;
  close(): void;
  destroy(): void;
}
```

Events fired on the editor: `a11y:audit` (findings), `a11y:fix` (`component, ruleId,
FixResult`), `seo:change` (`{ pageId, model }`). Subscribe via `api.on('audit'|'fix'|'seo:change', cb)`.

## Quick-fixes

Every fixable finding has a `fix(): FixResult` and a `fixLabel`. Fixes go through
`component.addAttributes`/`setStyle`/`append` (undoable). **Fix all safe** applies them
synchronously so a single Ctrl+Z reverts the batch. `FixResult` = `{ changed, before, after }`.

## Structured data (JSON-LD)

Schemas are added from a row of **icon chips** (one per type). Each added schema is a
**collapsible card** with an emoji icon, the type label, a status **pill** (`✓ Valid` /
`⚠ N missing`), and an actions row: **Auto-fill from page**, **Duplicate**, **Copy JSON**,
**Remove**. The card body renders an editable form for its fields (required + key optional) —
required fields carry a `*` and a live invalid ring until filled — with **repeatable items**
for FAQ questions / breadcrumb steps (numbered sub-cards + a dashed ＋ Add button), and a
per-block **Advanced: JSON** section with **Copy**, **Format**, and a *Test in Google Rich
Results* link. Empty optionals are pruned from the exported `<head>`.

**Auto-fill** prefills only *empty* fields from the current page and SEO model via the pure
helper `autoFillValues(block, { title, h1, image, url })` in `src/seo/jsonld.ts`
(Article/Product name·image, Org/WebSite name·url, Article `datePublished`←today). Field
schemas live on each template (`fields: FieldDef[]`); add a field by appending a `FieldDef`
(`path`, `labelKey`, `kind`). Per-type icons come from the `SCHEMA_ICON` map.

## Baseline (accepted risk)

Mark a finding **Won't fix** to exclude it from the score and default list; it stays under the
*Accepted* filter. Stored by a stable fingerprint in `projectData.a11ySeoState.baseline`.

## CI / headless

```bash
npx grapesjs-a11y-seo-ci ./dist/*.html --fail-on error --level AA --version 2.2 [--json]
```

```ts
import { runAuditHeadless } from 'grapesjs-a11y-seo/ci';
const violations = runAuditHeadless(htmlString, { wcagLevel: 'AA', disableRules: ['lang'] });
```

Layout-dependent rules (`contrast`, `target-size`, `font-size`, `visual-focus-mismatch`) are
skipped headless (linkedom has no layout). Findings carry no `component`. The browser bundle
stays zero-dep; linkedom is only pulled in by the `./ci` entry.

## Writing a custom rule

Rules are pure functions over an `AuditContext`. They only read the canvas — mutations happen through the component API in `fix`.

```ts
editor.A11ySeo.addRule({
  id: 'no-emoji-headings',
  title: 'No emoji in headings',
  severity: 'info',
  wcag: 'WCAG 2.4.6 (AA)',
  run(ctx) {
    return ctx.walk
      .filter(({ el }) => /^H[1-6]$/.test(el.tagName) && /\p{Emoji}/u.test(el.textContent || ''))
      .map(({ component, el }) => ({ message: 'Heading contains emoji', component, el }));
  },
});
```

### `AuditContext`

| Field | Description |
|---|---|
| `walk` | `{ component, el }[]` — every canvas element mapped to its nearest component |
| `doc` / `win` | canvas iframe document / window |
| `getBg(el)` | effective composited background colour (climbs ancestors, resolves alpha) |
| `contrast(fg, bg)` | WCAG contrast ratio (1..21) |
| `style(el)` | cached `getComputedStyle` |
| `zoom` | canvas zoom as a 0..1 factor |
| `elToComp` | element → component map |
| `opts` | resolved options (`wcagLevel`, `wcagVersion`, …) |
| `t(key, params)` | i18n resolver |

A finding (`RuleFinding`) may omit `ruleId`/`severity`/`wcag`/`helpUrl` — the engine fills them from the rule definition.

## SEO model

```ts
interface SeoModel {
  title: string;
  description: string;
  canonical: string;
  robots: { index: boolean; follow: boolean };
  focusKeyword?: string;
  og: { title?; description?; image?; type?; url? };
  twitter: { card?: 'summary' | 'summary_large_image'; site? };
  favicon: string;
  jsonld: Array<{ '@type': string; [k: string]: unknown }>;
}
```

Persistence: stored under a `a11ySeo` key in `projectData`, so it round-trips through `getProjectData()` / `loadProjectData()` (the plugin augments those two methods transparently and restores them on `destroy()`).

## Integrating SEO into your HTML export

GrapesJS `getHtml()` returns the `<body>` only. Use the plugin to generate the head:

```js
const doc =
  '<!doctype html><html><head>' +
  editor.A11ySeo.getHeadHtml(pageId) +
  `<style>${editor.getCss()}</style></head><body>` +
  editor.getHtml() +
  '</body></html>';
```

Or get the whole document in one call: `editor.A11ySeo.renderPage(pageId)`.

## Teardown

`editor.A11ySeo.destroy()` (also runs automatically on the editor's `destroy` event) removes the panel and overlay, detaches every listener via the tracked `EditorBridge`, and restores the patched `getProjectData`/`loadProjectData` — leaving `editor` at its baseline event state.
