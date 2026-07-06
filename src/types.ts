import type { Editor, Component } from 'grapesjs';

/** Severity of an audit finding, ordered error > warning > info. */
export type Severity = 'error' | 'warning' | 'info';

/** Which conformance level thresholds to apply (affects contrast & target-size). */
export type WcagLevel = 'AA' | 'AAA';

/** Which WCAG version to map success criteria against (affects e.g. 4.1.1). */
export type WcagVersion = '2.0' | '2.1' | '2.2';

/** Panel dock position. */
export type PanelPosition = 'left' | 'right' | 'bottom';

/** Colour theme. `auto` follows `prefers-color-scheme`. */
export type Theme = 'dark' | 'light' | 'auto';

/** Active tab. */
export type Tab = 'a11y' | 'seo' | 'settings';

/** Audit engine: the built-in zero-dep engine, or an optional axe-core adapter. */
export type Engine = 'builtin' | 'axe';

/** An RGBA colour with channels in 0..255 and alpha 0..1. */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * A single accessibility (or SEO) finding produced by a {@link Rule}.
 * Every violation that maps to the DOM carries a live `component`/`el` so the
 * UI can select, scroll to, highlight and optionally quick-fix it.
 */
export interface Violation {
  /** Id of the rule that produced this finding. */
  ruleId: string;
  severity: Severity;
  /** Human-readable, already i18n-resolved message. */
  message: string;
  /** WCAG success criterion label, e.g. `'WCAG 1.1.1 (A)'`. */
  wcag?: string;
  /** Link to a "learn more" resource. */
  helpUrl?: string;
  /** The GrapesJS component this finding belongs to (for select / scroll). `null` in headless. */
  component?: Component | null;
  /** Id of the page this finding belongs to (set on multi-page audits). */
  pageId?: string;
  /** Name of the page this finding belongs to (for the UI badge). */
  pageName?: string;
  /** The live element inside the canvas iframe. */
  el?: HTMLElement;
  /** Bounding rect (canvas coords) for overlay drawing. */
  rect?: DOMRect;
  /**
   * A deterministic, safe auto-fix applied via the component API. Returns a
   * {@link FixResult} describing what changed (for the UI mini-diff and the
   * `a11y:fix` event). Absent when no unambiguous fix exists.
   */
  fix?: () => FixResult;
  /** Short label for the fix action (e.g. `Add alt=""`, `Use #747474`). */
  fixLabel?: string;
}

/**
 * The outcome of a quick-fix. `before`/`after` are attribute/style key→value
 * maps so the UI can show a mini-diff (`title: "" → "Company logo"`).
 */
export interface FixResult {
  changed: boolean;
  before: Record<string, string>;
  after: Record<string, string>;
}

/**
 * Context passed to every {@link Rule.run}. Built once per audit pass so that
 * expensive work (the component walk, computed-style reads) is shared.
 */
export interface AuditContext {
  editor: Editor;
  /** Canvas iframe document. */
  doc: Document;
  /** Canvas iframe window. */
  win: Window;
  /** Cached recursive walk of the audited page's components. */
  walk: WalkNode[];
  /** Effective (composited) background colour behind an element. */
  getBg: (el: HTMLElement) => RGBA;
  /** WCAG contrast ratio between two colours (1..21). */
  contrast: (fg: RGBA, bg: RGBA) => number;
  /** Cached `getComputedStyle`. */
  style: (el: HTMLElement) => CSSStyleDeclaration;
  /** Canvas zoom as a 0..1 factor (GrapesJS reports 0..100). */
  zoom: number;
  /** Resolved plugin options. */
  opts: ResolvedOptions;
  /** Reverse lookup from live element to owning component. */
  elToComp: Map<HTMLElement, Component>;
  /** Translate a message key. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /**
   * True when running outside a live editor (CLI / `runAuditHeadless`), where
   * there is no layout or real computed style. Rules that need layout should
   * check `Rule.needsLayout` (the engine skips them) — this flag lets a rule
   * degrade gracefully if it partially depends on layout.
   */
  headless?: boolean;
}

/** One node of the cached component walk: a component and its live element. */
export interface WalkNode {
  /** Owning component, or `null` in headless mode (no editor). */
  component: Component | null;
  el: HTMLElement;
}

/**
 * A finding as returned from a rule. `ruleId`, `severity`, `wcag` and `helpUrl`
 * are filled in by the engine from the {@link Rule} definition when omitted, so
 * rules only have to supply what differs.
 */
export type RuleFinding = Omit<Violation, 'ruleId' | 'severity'> & {
  severity?: Severity;
};

/**
 * A pluggable audit rule. Rules are pure functions over {@link AuditContext},
 * which makes them unit-testable and lets hosts add/override/disable them.
 */
export interface Rule {
  /** Stable id, e.g. `'img-alt'`. */
  id: string;
  /** Short human title. */
  title: string;
  /** Default severity for findings from this rule. */
  severity: Severity;
  /** WCAG success criterion label. */
  wcag?: string;
  helpUrl?: string;
  /** Whether the rule runs. Defaults to `true`. */
  enabled?: boolean;
  /**
   * True if the rule needs real layout / computed style (contrast, target-size,
   * font-size). The headless engine skips these, since linkedom/jsdom have no
   * layout.
   */
  needsLayout?: boolean;
  /** Runs once per audit pass. */
  run(ctx: AuditContext): RuleFinding[] | void;
}

/** robots meta directives. */
export interface RobotsModel {
  index: boolean;
  follow: boolean;
}

/** Open Graph metadata. */
export interface OpenGraphModel {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  url?: string;
}

/** Twitter card metadata. */
export interface TwitterModel {
  card?: 'summary' | 'summary_large_image';
  site?: string;
}

/** A JSON-LD block: a schema type plus arbitrary fields. */
export interface JsonLdBlock {
  '@type': string;
  [key: string]: unknown;
}

/** Per-page SEO model persisted under `projectData.a11ySeo`. */
export interface SeoModel {
  title: string;
  description: string;
  canonical: string;
  robots: RobotsModel;
  focusKeyword?: string;
  og: OpenGraphModel;
  twitter: TwitterModel;
  favicon: string;
  jsonld: JsonLdBlock[];
}

/** SEO-related options. */
export interface SeoOptions {
  defaults?: Partial<SeoModel>;
  /** Base URL used for canonical/sitemap generation. */
  baseUrl?: string;
}

/** Public plugin options (all optional — merged over defaults). */
export interface A11ySeoOptions {
  /** Open the panel immediately on init. */
  enabled?: boolean;
  /** Toggle hotkey (auto-expanded with a `⌘` variant on macOS). */
  hotkey?: string;
  position?: PanelPosition;
  theme?: Theme;
  /** Initial tab. */
  open?: Tab;
  engine?: Engine;
  wcagLevel?: WcagLevel;
  wcagVersion?: WcagVersion;
  /** Re-audit automatically on canvas changes. */
  live?: boolean;
  /** Debounce (ms) for live audits. */
  auditDebounce?: number;
  /** Rule ids to disable. */
  disableRules?: string[];
  /** Custom rules to add. */
  rules?: Rule[];
  /** CSS selectors to skip during audit (e.g. third-party widgets). */
  ignoreSelectors?: string[];
  seo?: SeoOptions;
  /** Message key overrides for i18n. */
  i18n?: Record<string, string>;
  /** Add a toolbar button to the GrapesJS options panel. */
  showButton?: boolean;
  /** If `grapesjs-devtools` is present, mount as a tab inside it. */
  mountInDevtools?: boolean;
  /** Initial UI locale for the shipped bundles (`en` | `ru` | `es`). */
  locale?: string;
  /** Opt-in: check external links for reachability (makes network requests). */
  checkExternalLinks?: boolean;
}

/**
 * User-editable settings persisted per project (Settings tab). Override the
 * developer-supplied {@link A11ySeoOptions} at runtime so content editors can
 * silence false positives without touching code.
 */
export interface SettingsModel {
  disabledRules: string[];
  wcagLevel: WcagLevel;
  wcagVersion: WcagVersion;
  theme: Theme;
  live: boolean;
  auditDebounce: number;
  ignoreSelectors: string[];
  engine: Engine;
}

/** Accepted-risk baseline: a set of finding fingerprints marked "won't fix". */
export type BaselineModel = Record<string, true>;

/** Persisted plugin state (settings + baseline + score history). */
export interface ProjectState {
  settings: Partial<SettingsModel>;
  baseline: BaselineModel;
  history: number[];
}

/** Fully-resolved options (defaults applied). */
export interface ResolvedOptions extends Required<Omit<A11ySeoOptions, 'seo' | 'i18n' | 'rules' | 'disableRules' | 'ignoreSelectors'>> {
  seo: Required<SeoOptions>;
  i18n: Record<string, string>;
  rules: Rule[];
  disableRules: string[];
  ignoreSelectors: string[];
}

/** The public API returned from the plugin and exposed as `editor.A11ySeo`. */
export interface A11ySeoApi {
  /** Run an audit synchronously and return the findings. */
  runAudit(): Violation[];
  /** Get the findings from the last audit. */
  getResults(): Violation[];
  /** Register a custom rule. */
  addRule(rule: Rule): void;
  /** Disable a rule by id. */
  disableRule(id: string): void;
  /** Subscribe to plugin events. */
  on(evt: 'audit' | 'fix' | 'seo:change', cb: (...args: unknown[]) => void): void;
  /** Get the SEO model for a page (defaults to the selected page). */
  getSeo(pageId?: string): SeoModel;
  /** Patch the SEO model for a page. */
  setSeo(pageId: string, patch: Partial<SeoModel>): void;
  /** Render the `<head>` markup (title + meta + JSON-LD) for a page. */
  getHeadHtml(pageId?: string): string;
  /** Render a full standalone HTML document for a page. */
  renderPage(pageId?: string): string;
  /** Build a sitemap.xml for all indexable pages. */
  getSitemap(baseUrl?: string): string;
  /** A "Powered by grapesjs-a11y-seo" attribution badge (HTML snippet). */
  getBadgeHtml(): string;
  /** The score history (last N project saves). */
  getScoreHistory(): number[];
  /** Open the panel. */
  open(tab?: Tab): void;
  /** Close the panel. */
  close(): void;
  /** Tear down the plugin (removes DOM + all listeners). */
  destroy(): void;
}
