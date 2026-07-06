import type { Editor, Page } from 'grapesjs';
import type { AuditContext, RGBA, ResolvedOptions, Rule, Violation } from '../types';
import { RuleRegistry } from './registry';
import { walkComponents } from '../core/walk';
import { contrastRatio } from './contrast';
import { parseColor, flatten, isImageOrGradient } from '../utils/color';
import { runAxe } from './axe-adapter';

const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };

/**
 * Orchestrates an audit pass: builds the shared {@link AuditContext} (component
 * walk + cached computed-style + effective-background resolver), runs each
 * active rule, and returns the flattened findings. Large trees are handled
 * without blocking via {@link AuditEngine.runAsync} (chunked idle callbacks);
 * {@link AuditEngine.run} stays synchronous for the public API and tests.
 * {@link AuditEngine.runAllAsync} audits every page by selecting each in turn
 * (rules need a rendered canvas), tagging findings with their page.
 */
export class AuditEngine {
  private results: Violation[] = [];

  constructor(
    private readonly editor: Editor,
    private readonly opts: ResolvedOptions,
    readonly registry: RuleRegistry,
    private readonly t: (k: string, p?: Record<string, string | number>) => string,
  ) {}

  private buildContext(page?: Page): AuditContext | null {
    const canvas = this.editor.Canvas;
    let doc = canvas.getDocument();
    let win = canvas.getWindow();

    // For a specific page, read from ITS OWN frame document/window (computed
    // style needs the element's own window) — this lets us audit pages that
    // aren't the active canvas frame.
    if (page) {
      const rootEl = page.getMainComponent?.()?.getEl?.() as HTMLElement | undefined;
      const ownerDoc = rootEl?.ownerDocument;
      if (ownerDoc?.defaultView) {
        doc = ownerDoc;
        win = ownerDoc.defaultView;
      }
    }
    if (!doc || !win) return null;

    const target = page ?? this.editor.Pages?.getSelected?.() ?? undefined;
    const { nodes, elToComp } = walkComponents(this.editor, this.opts.ignoreSelectors, target);

    const styleCache = new Map<HTMLElement, CSSStyleDeclaration>();
    const style = (el: HTMLElement): CSSStyleDeclaration => {
      let s = styleCache.get(el);
      if (!s) {
        s = win.getComputedStyle(el);
        styleCache.set(el, s);
      }
      return s;
    };

    const bgCache = new Map<HTMLElement, RGBA>();
    const getBg = (el: HTMLElement): RGBA => {
      const cached = bgCache.get(el);
      if (cached) return cached;
      let node: HTMLElement | null = el;
      let acc: RGBA | null = null;
      while (node) {
        const s = style(node);
        // A background image/gradient makes contrast unverifiable — mark the
        // node so the contrast rule can report it as such.
        if (isImageOrGradient(s.backgroundImage)) {
          (node as unknown as { __asBgImage?: boolean }).__asBgImage = true;
        }
        const c = parseColor(s.backgroundColor);
        if (c && c.a > 0) {
          acc = acc ? flatten(acc, c) : c;
          if (c.a >= 1) break; // fully opaque — stop climbing
        }
        node = node.parentElement;
      }
      const result = acc ? (acc.a >= 1 ? acc : flatten(acc, WHITE)) : WHITE;
      bgCache.set(el, result);
      return result;
    };

    const zoom = (canvas.getZoom() || 100) / 100;

    return {
      editor: this.editor,
      doc,
      win,
      walk: nodes,
      getBg,
      style,
      contrast: contrastRatio,
      zoom,
      opts: this.opts,
      elToComp,
      t: this.t,
    };
  }

  /** Apply one rule and normalize its findings (fills rule defaults + page tag). */
  private applyRule(rule: Rule, ctx: AuditContext, page?: Page): Violation[] {
    const out: Violation[] = [];
    // Layout-dependent rules can't run without real computed style/layout.
    if (ctx.headless && rule.needsLayout) return out;
    try {
      const found = rule.run(ctx);
      if (found) {
        for (const v of found) {
          out.push({
            severity: rule.severity,
            ruleId: rule.id,
            wcag: rule.wcag,
            helpUrl: rule.helpUrl,
            pageId: page?.getId(),
            pageName: page?.getName?.() || undefined,
            ...v,
          });
        }
      }
    } catch (err) {
      // A misbehaving rule must not break the whole audit.
      // eslint-disable-next-line no-console
      console.warn(`[a11y-seo] rule "${rule.id}" threw`, err);
    }
    return out;
  }

  private selectedPage(): Page | undefined {
    return this.editor.Pages?.getSelected?.() ?? undefined;
  }

  /** Run all active rules synchronously against the selected page. */
  run(): Violation[] {
    const page = this.selectedPage();
    const ctx = this.buildContext(page);
    if (!ctx) return (this.results = []);
    const out: Violation[] = [];
    for (const rule of this.registry.active()) out.push(...this.applyRule(rule, ctx, page));
    return this.finish(out);
  }

  /**
   * Run asynchronously, chunking rule execution across idle callbacks so a
   * 1000+ component tree never freezes the UI. Falls back to `setTimeout`
   * where `requestIdleCallback` is unavailable (Safari).
   */
  async runAsync(): Promise<Violation[]> {
    if (this.opts.engine === 'axe') {
      const axeResults = await this.tryAxe();
      if (axeResults) return this.finish(axeResults);
    }
    const page = this.selectedPage();
    const ctx = this.buildContext(page);
    if (!ctx) return (this.results = []);
    const idle = getIdleScheduler(ctx.win);
    const out: Violation[] = [];
    for (const rule of this.registry.active()) {
      await idle();
      out.push(...this.applyRule(rule, ctx, page));
    }
    return this.finish(out);
  }

  /**
   * Audit every page. Rules need a rendered canvas, so each page is selected in
   * turn (with a frame to let the canvas paint), audited, and the original
   * selection is restored at the end.
   */
  async runAllAsync(): Promise<Violation[]> {
    const Pages = this.editor.Pages;
    const pages = Pages?.getAll?.() ?? [];
    if (pages.length <= 1) return this.runAsync();

    const original = Pages.getSelected?.();
    const useAxe = this.opts.engine === 'axe';
    const all: Violation[] = [];

    // Only the active page has live DOM/computed style, so audit each page while
    // it is selected, then restore the original selection.
    for (const page of pages) {
      Pages.select(page);
      await this.waitForPageRender(page);
      await nextFrame(this.mainWindow());
      if (useAxe) {
        const axeResults = (await this.tryAxe()) ?? [];
        all.push(
          ...axeResults.map((v) => ({ ...v, pageId: page.getId(), pageName: page.getName?.() || undefined })),
        );
        continue;
      }
      const ctx = this.buildContext(page);
      if (!ctx) continue;
      for (const rule of this.registry.active()) all.push(...this.applyRule(rule, ctx, page));
    }

    if (original) Pages.select(original);
    return this.finish(all);
  }

  /**
   * Wait until a freshly-selected page's root is mounted in the canvas doc.
   * GrapesJS lazily creates each page's iframe on first select (async load), so
   * we poll for up to ~3s rather than a fixed number of frames.
   */
  private waitForPageRender(page: Page): Promise<void> {
    const ready = (): boolean => {
      const el = page.getMainComponent?.()?.getEl?.() as HTMLElement | undefined;
      // The page must be the *active* canvas frame (rendered & visible), so its
      // computed style and layout are valid.
      const doc = this.editor.Canvas.getDocument();
      return !!(el && doc && doc.contains(el));
    };
    return new Promise((resolve) => {
      const start = now();
      const check = (): void => {
        if (ready() || now() - start > 3000) {
          setTimeout(resolve, 32); // let styles/layout settle
          return;
        }
        setTimeout(check, 32);
      };
      check();
    });
  }

  private async tryAxe(): Promise<Violation[] | null> {
    return runAxe(this.editor, this.opts).catch((e) => {
      // eslint-disable-next-line no-console
      console.warn('[a11y-seo] axe engine failed, falling back to builtin', e);
      return null;
    });
  }

  private finish(out: Violation[]): Violation[] {
    this.results = out;
    this.editor.trigger('a11y:audit', out);
    return out;
  }

  private mainWindow(): Window {
    return typeof window !== 'undefined' ? window : this.editor.Canvas.getWindow();
  }

  getResults(): Violation[] {
    return this.results;
  }
}

type IdleFn = () => Promise<void>;

/**
 * Build the idle-yield used to chunk the audit. Exported for testing: the key
 * guarantee is that the returned `idle()` ALWAYS resolves, even if the window's
 * `requestIdleCallback` never fires its callback (main-thread starvation).
 */
export function getIdleScheduler(win: Window): IdleFn {
  const ric = (win as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  }).requestIdleCallback;
  if (typeof ric === 'function') {
    // Pass a deadline to requestIdleCallback AND race it against a setTimeout
    // fallback: under sustained main-thread pressure rIC in the canvas window
    // can starve indefinitely, which would leave the audit promise unsettled
    // and wedge the auditor. The race guarantees idle() always resolves.
    return () =>
      new Promise<void>((resolve) => {
        let done = false;
        const settle = (): void => {
          if (done) return;
          done = true;
          resolve();
        };
        ric(settle, { timeout: 300 });
        setTimeout(settle, 200);
      });
  }
  return () => new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** Monotonic-ish clock, falling back to Date.now where needed. */
function now(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/** Wait one paint (two rAFs) so a freshly selected page has rendered. */
function nextFrame(win: Window): Promise<void> {
  const raf = (win as unknown as { requestAnimationFrame?: (cb: () => void) => void }).requestAnimationFrame;
  if (typeof raf !== 'function') return new Promise((r) => setTimeout(r, 16));
  return new Promise((resolve) => raf(() => raf(() => resolve())));
}
