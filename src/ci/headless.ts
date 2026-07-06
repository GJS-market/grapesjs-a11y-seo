import { parseHTML } from 'linkedom';
import type { AuditContext, RGBA, ResolvedOptions, Rule, Violation, WalkNode } from '../types';
import { RuleRegistry } from '../a11y/registry';
import { contrastRatio } from '../a11y/contrast';
import { makeT } from '../i18n';

/** Options for a headless (no-editor) audit run. */
export interface HeadlessOptions {
  wcagLevel?: 'AA' | 'AAA';
  wcagVersion?: '2.0' | '2.1' | '2.2';
  disableRules?: string[];
  ignoreSelectors?: string[];
  /** Custom locale message overrides. */
  i18n?: Record<string, string>;
}

const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };

/**
 * Run the builtin rules against a static HTML string, with no live GrapesJS
 * canvas — for CI / pre-deploy checks. Uses linkedom (no layout engine), so
 * layout-dependent rules (`needsLayout`: contrast, target-size, font-size,
 * visual-focus-mismatch) are skipped. Findings carry no `component`.
 */
export function runAuditHeadless(html: string, opts: HeadlessOptions = {}): Violation[] {
  const full = /<html[\s>]/i.test(html) ? html : `<!doctype html><html><body>${html}</body></html>`;
  const { document } = parseHTML(full);
  const win = (document.defaultView ?? {}) as Window;
  const registry = new RuleRegistry([], opts.disableRules ?? []);
  const t = makeT(opts.i18n ?? {});

  const ignore = (opts.ignoreSelectors ?? []).filter(Boolean);
  const nodes: WalkNode[] = [];
  const root = document.body ?? document.documentElement;
  if (root) {
    for (const el of Array.from(root.querySelectorAll('*')) as HTMLElement[]) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      if (ignore.length && ignore.some((sel) => safeMatches(el, sel))) continue;
      nodes.push({ component: null, el });
    }
  }

  const resolvedOpts = {
    wcagLevel: opts.wcagLevel ?? 'AA',
    wcagVersion: opts.wcagVersion ?? '2.2',
    ignoreSelectors: ignore,
  } as unknown as ResolvedOptions;

  const ctx: AuditContext = {
    editor: undefined as never,
    doc: document as unknown as Document,
    win,
    walk: nodes,
    getBg: () => WHITE,
    contrast: contrastRatio,
    // linkedom has no layout/getComputedStyle — expose the inline style object,
    // which is enough for the structural checks (display/visibility).
    style: (el) => el.style as unknown as CSSStyleDeclaration,
    zoom: 1,
    opts: resolvedOpts,
    elToComp: new Map(),
    t,
    headless: true,
  };

  const out: Violation[] = [];
  for (const rule of registry.active()) {
    if (rule.needsLayout) continue; // no layout in headless
    try {
      const found = rule.run(ctx) || [];
      for (const v of found) out.push(normalize(rule, v));
    } catch {
      /* a misbehaving rule must not break the run */
    }
  }
  return out;
}

function normalize(rule: Rule, v: Partial<Violation>): Violation {
  return {
    severity: rule.severity,
    ruleId: rule.id,
    wcag: rule.wcag,
    helpUrl: rule.helpUrl,
    ...v,
    // component/el aren't serializable / meaningful in CI output.
    component: undefined,
    el: undefined,
  } as Violation;
}

function safeMatches(el: HTMLElement, selector: string): boolean {
  try {
    return el.matches(selector) || !!el.closest(selector);
  } catch {
    return false;
  }
}
