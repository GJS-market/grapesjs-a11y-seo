import type { Editor } from 'grapesjs';
import type { FixResult, ResolvedOptions, Severity, Violation } from '../types';
import type { Overlay } from '../core/Overlay';
import { h, clear, link } from '../utils/h';
import { score } from '../utils/score';
import { downloadFile } from '../utils/format';
import { focusableElements, tabOrder } from './focus-order';
import { fingerprint } from './fingerprint';
import { describeElement } from './a11yTree';

const SEVERITIES: Severity[] = ['error', 'warning', 'info'];

/** Baseline (accepted-risk) hooks, backed by ProjectStore. */
export interface BaselineApi {
  isAccepted(fp: string): boolean;
  accept(fp: string): void;
  unaccept(fp: string): void;
}

/**
 * The Accessibility tab: run/live controls, score, severity/rule filters, and
 * the component-linked violation list (Show / Fix / Learn + hover highlight).
 */
export class AccessibilityPanel {
  private listEl!: HTMLElement;
  private scoreEl!: HTMLElement;
  private filtersEl!: HTMLElement;
  private ruleSelect!: HTMLSelectElement;
  private liveBtn!: HTMLButtonElement;

  private violations: Violation[] = [];
  private activeSeverities = new Set<Severity>(SEVERITIES);
  private activeRule = 'all';
  private live: boolean;
  private allPages = false;
  private currentPageOnly = false;
  private allPagesBtn!: HTMLButtonElement;
  private fixAllBtn!: HTMLButtonElement;
  private highlightBtn!: HTMLButtonElement;
  private tabOrderBtn!: HTMLButtonElement;
  private treeEl!: HTMLElement;
  private highlightAll = false;
  private tabOrderShown = false;
  private showAccepted = false;
  private acceptedChip!: HTMLButtonElement;
  private currentPageChip!: HTMLButtonElement;

  /** Set by the host to trigger a fresh audit (async, non-blocking). */
  onRun?: () => void;
  /** Set by the host when the Live toggle flips. */
  onLiveChange?: (live: boolean) => void;
  /** Set by the host when the All-pages toggle flips. */
  onAllPagesChange?: (allPages: boolean) => void;
  /** Set by the host when a quick-fix is applied (for `a11y:fix` + announce). */
  onFix?: (v: Violation, result: FixResult) => void;
  /** Set by the host to apply all deterministic fixes as one undo group. */
  onFixAll?: () => void;

  constructor(
    private readonly root: HTMLElement,
    private readonly editor: Editor,
    private readonly overlay: Overlay,
    opts: ResolvedOptions,
    private readonly t: (k: string, p?: Record<string, string | number>) => string,
    private readonly baseline: BaselineApi,
    private readonly getHistory: () => number[] = () => [],
  ) {
    this.live = opts.live;
    this.build();
  }

  private build(): void {
    const runBtn = h('button', {
      class: 'gjs-as-btn',
      text: this.t('a11y.run'),
      on: { click: () => this.onRun?.() },
    });
    this.liveBtn = h('button', {
      class: 'gjs-as-btn gjs-as-ghost',
      on: { click: () => this.toggleLive() },
    });
    this.allPagesBtn = h('button', {
      class: 'gjs-as-btn gjs-as-ghost',
      on: { click: () => this.toggleAllPages() },
    });
    this.fixAllBtn = h('button', {
      class: 'gjs-as-btn gjs-as-ghost',
      text: this.t('a11y.fixAll'),
      on: { click: () => this.onFixAll?.() },
    });
    this.highlightBtn = h('button', {
      class: 'gjs-as-btn gjs-as-ghost',
      text: this.t('a11y.highlightAll'),
      on: { click: () => this.toggleHighlightAll() },
    });
    this.tabOrderBtn = h('button', {
      class: 'gjs-as-btn gjs-as-ghost',
      text: this.t('a11y.tabOrder'),
      on: { click: () => this.toggleTabOrder() },
    });
    const exportBtn = h('button', {
      class: 'gjs-as-btn gjs-as-ghost',
      text: this.t('a11y.export'),
      on: { click: () => this.exportReport() },
    });
    const toolbar = h('div', { class: 'gjs-as-toolbar' }, [
      runBtn,
      this.liveBtn,
      this.allPagesBtn,
      this.fixAllBtn,
      this.highlightBtn,
      this.tabOrderBtn,
      exportBtn,
    ]);

    this.scoreEl = h('div', { class: 'gjs-as-score' });
    this.filtersEl = h('div', { class: 'gjs-as-filters' });
    this.ruleSelect = h('select', {
      class: 'gjs-as-select',
      attrs: { 'aria-label': this.t('a11y.allRules') },
      on: {
        change: () => {
          this.activeRule = this.ruleSelect.value;
          this.render();
        },
      },
    });
    this.listEl = h('ul', { class: 'gjs-as-list' });
    this.treeEl = h('div', { class: 'gjs-as-tree', style: { display: 'none' } });

    this.root.append(toolbar, this.scoreEl, this.treeEl, this.filtersEl, this.listEl);
    this.updateLiveButton();
    this.updateAllPagesButton();
    this.buildFilters();
    this.renderScore();
    this.renderEmpty(this.t('a11y.notRun'));
  }

  private toggleLive(): void {
    this.live = !this.live;
    this.updateLiveButton();
    this.onLiveChange?.(this.live);
  }

  private toggleAllPages(): void {
    this.allPages = !this.allPages;
    this.updateAllPagesButton();
    this.onAllPagesChange?.(this.allPages);
    this.onRun?.();
  }

  private updateLiveButton(): void {
    this.liveBtn.textContent = `${this.t('a11y.live')}: ${this.live ? this.t('common.on') : this.t('common.off')}`;
    this.liveBtn.classList.toggle('gjs-as-active', this.live);
  }

  private updateAllPagesButton(): void {
    this.allPagesBtn.textContent = `${this.t('a11y.allPages')}: ${this.allPages ? this.t('common.on') : this.t('common.off')}`;
    this.allPagesBtn.classList.toggle('gjs-as-active', this.allPages);
    // The "current page only" filter only makes sense in all-pages mode.
    if (this.currentPageChip) this.currentPageChip.style.display = this.allPages ? '' : 'none';
  }

  /** Whether the last/next audit should cover all pages. */
  get isAllPages(): boolean {
    return this.allPages;
  }

  private buildFilters(): void {
    clear(this.filtersEl);
    for (const sev of SEVERITIES) {
      const chip = h('button', {
        class: `gjs-as-chip ${this.activeSeverities.has(sev) ? 'gjs-as-on' : ''}`,
        text: this.t(`severity.${sev}`),
        on: {
          click: () => {
            if (this.activeSeverities.has(sev)) this.activeSeverities.delete(sev);
            else this.activeSeverities.add(sev);
            this.buildFilters();
            this.render();
          },
        },
      });
      this.filtersEl.appendChild(chip);
    }
    this.currentPageChip = h('button', {
      class: `gjs-as-chip ${this.currentPageOnly ? 'gjs-as-on' : ''}`,
      text: this.t('a11y.currentPageOnly'),
      style: { display: this.allPages ? '' : 'none' },
      on: {
        click: () => {
          this.currentPageOnly = !this.currentPageOnly;
          this.buildFilters();
          this.render();
        },
      },
    });
    this.filtersEl.appendChild(this.currentPageChip);
    this.acceptedChip = h('button', {
      class: `gjs-as-chip ${this.showAccepted ? 'gjs-as-on' : ''}`,
      text: this.t('a11y.accepted'),
      on: {
        click: () => {
          this.showAccepted = !this.showAccepted;
          this.buildFilters();
          this.render();
        },
      },
    });
    this.filtersEl.appendChild(this.acceptedChip);
    this.filtersEl.appendChild(this.ruleSelect);
  }

  private currentPageId(): string | undefined {
    return this.editor.Pages?.getSelected?.()?.getId?.();
  }

  private populateRuleSelect(): void {
    const prev = this.activeRule;
    clear(this.ruleSelect);
    const ids = [...new Set(this.violations.map((v) => v.ruleId))].sort();
    this.ruleSelect.appendChild(h('option', { attrs: { value: 'all' }, text: this.t('a11y.allRules') }));
    for (const id of ids) {
      this.ruleSelect.appendChild(h('option', { attrs: { value: id }, text: id }));
    }
    this.activeRule = ids.includes(prev) ? prev : 'all';
    this.ruleSelect.value = this.activeRule;
  }

  /** Push a fresh result set into the panel and re-render. */
  update(violations: Violation[]): void {
    this.violations = violations;
    this.populateRuleSelect();
    this.renderScore();
    this.render();
    const fixable = violations.filter((v) => v.fix).length;
    this.fixAllBtn.disabled = fixable === 0;
    this.fixAllBtn.textContent = fixable ? this.t('a11y.fixAllN', { n: fixable }) : this.t('a11y.fixAll');
    if (this.highlightAll) this.renderHighlightAll();
    if (this.tabOrderShown) this.renderTabOrder();
  }

  private toggleHighlightAll(): void {
    this.highlightAll = !this.highlightAll;
    this.highlightBtn.classList.toggle('gjs-as-active', this.highlightAll);
    if (this.highlightAll) this.renderHighlightAll();
    else this.overlay.clearPersistent();
  }

  private renderHighlightAll(): void {
    const items = this.violations
      .filter((v) => v.el && v.severity !== 'info')
      .map((v) => ({ el: v.el as HTMLElement, severity: v.severity }));
    this.overlay.drawPersistent(items);
  }

  private toggleTabOrder(): void {
    this.tabOrderShown = !this.tabOrderShown;
    this.tabOrderBtn.classList.toggle('gjs-as-active', this.tabOrderShown);
    if (this.tabOrderShown) {
      this.highlightAll = false; // the two persistent overlays are mutually exclusive
      this.highlightBtn.classList.remove('gjs-as-active');
      this.renderTabOrder();
    } else {
      this.overlay.clearPersistent();
    }
  }

  private renderTabOrder(): void {
    const doc = this.editor.Canvas?.getDocument?.();
    if (!doc) return;
    this.overlay.drawSequence(tabOrder(focusableElements(doc)));
  }

  /** Active (non-accepted) findings — the basis for the score. */
  private active(): Violation[] {
    return this.violations.filter((v) => !this.baseline.isAccepted(fingerprint(v)));
  }

  private renderScore(): void {
    // Accepted (won't-fix) findings don't count against the score.
    const { score: value, errors, warnings, infos } = score(this.active());
    const color = value >= 90 ? 'var(--as-ok)' : value >= 60 ? 'var(--as-warning)' : 'var(--as-error)';
    clear(this.scoreEl);
    this.scoreEl.append(
      h('div', { class: 'gjs-as-score-ring', style: { background: color }, text: String(value) }),
      h('div', { class: 'gjs-as-counts' }, [
        count('error', errors, this.t('severity.error')),
        count('warning', warnings, this.t('severity.warning')),
        count('info', infos, this.t('severity.info')),
      ]),
    );
    // Score-history sparkline (last N saves).
    const history = this.getHistory();
    if (history.length >= 2) this.scoreEl.appendChild(sparkline(history));
  }

  private filtered(): Violation[] {
    const pageId = this.currentPageId();
    return this.violations.filter((v) => {
      const accepted = this.baseline.isAccepted(fingerprint(v));
      if (this.showAccepted !== accepted) return false; // Accepted view shows only accepted
      return (
        this.activeSeverities.has(v.severity) &&
        (this.activeRule === 'all' || v.ruleId === this.activeRule) &&
        (!this.currentPageOnly || !v.pageId || v.pageId === pageId)
      );
    });
  }

  private render(): void {
    const items = this.filtered();
    clear(this.listEl);
    if (!this.violations.length) {
      this.renderEmpty(this.t('a11y.clean'));
      return;
    }
    if (!items.length) {
      this.renderEmpty(this.t('a11y.noneMatch'));
      return;
    }
    const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
    items.sort((a, b) => order[a.severity] - order[b.severity]);
    for (const v of items) this.listEl.appendChild(this.renderItem(v));
  }

  private renderEmpty(msg: string): void {
    clear(this.listEl);
    this.listEl.appendChild(h('li', { class: 'gjs-as-empty', text: msg }));
  }

  /** Accessibility Tree preview for the selected component (Chrome-DevTools-like). */
  showA11yTree(el: HTMLElement | null): void {
    if (!el) {
      this.treeEl.style.display = 'none';
      return;
    }
    const info = describeElement(el);
    clear(this.treeEl);
    this.treeEl.style.display = '';
    this.treeEl.append(
      h('div', { class: 'gjs-as-tree-title', text: this.t('a11y.tree') }),
      row(this.t('a11y.treeName'), info.name || '—'),
      row(this.t('a11y.treeRole'), info.role),
      row(this.t('a11y.treeStates'), info.states.length ? info.states.join(', ') : '—'),
    );
  }

  private setAccepted(fp: string, accepted: boolean): void {
    if (accepted) this.baseline.accept(fp);
    else this.baseline.unaccept(fp);
    // Re-filter/score in place (no re-audit needed — the findings are unchanged).
    this.renderScore();
    this.render();
  }

  private renderItem(v: Violation): HTMLElement {
    const actions: HTMLElement[] = [];
    if (v.component || v.el) {
      actions.push(
        h('button', { class: 'gjs-as-link', text: this.t('action.show'), on: { click: () => this.show(v) } }),
      );
    }
    if (v.fix) {
      actions.push(
        h('button', {
          class: 'gjs-as-link',
          text: v.fixLabel ? this.t('action.fixWith', { what: v.fixLabel }) : this.t('action.fix'),
          title: v.fixLabel || this.t('action.fix'),
          on: { click: () => this.applyFix(v) },
        }),
      );
    }
    if (v.helpUrl) actions.push(link(v.helpUrl, this.t('action.learn'), 'gjs-as-link'));
    // Baseline: accept ("won't fix") / restore.
    const fp = fingerprint(v);
    if (this.baseline.isAccepted(fp)) {
      actions.push(
        h('button', { class: 'gjs-as-link', text: this.t('action.restore'), on: { click: () => this.setAccepted(fp, false) } }),
      );
    } else {
      actions.push(
        h('button', { class: 'gjs-as-link', text: this.t('action.wontFix'), on: { click: () => this.setAccepted(fp, true) } }),
      );
    }

    const showPage = this.allPages && v.pageName;
    const meta = h('div', { class: 'gjs-as-item-meta' }, [
      h('span', { text: v.ruleId }),
      v.wcag ? h('span', { text: v.wcag }) : null,
      showPage ? h('span', { class: 'gjs-as-badge', text: v.pageName }) : null,
    ]);

    const item = h('li', {
      class: 'gjs-as-item',
      on: {
        mouseenter: () => v.el && this.overlay.highlight(v.el, v.severity),
        mouseleave: () => this.overlay.clear(),
      },
    }, [
      h('div', { class: `gjs-as-sev gjs-as-sev-${v.severity}` }),
      h('div', { class: 'gjs-as-item-main' }, [
        h('div', { class: 'gjs-as-item-msg', text: v.message }),
        meta,
        h('div', { class: 'gjs-as-item-actions' }, actions),
      ]),
    ]);
    return item;
  }

  private show(v: Violation): void {
    // On a multi-page audit the finding may live on another page — select it
    // first so the component is rendered before we scroll/highlight.
    if (v.pageId && v.pageId !== this.currentPageId()) {
      const page = this.editor.Pages?.get?.(v.pageId);
      if (page) this.editor.Pages.select(page);
    }
    if (v.component) this.editor.select(v.component, { scroll: true });
    if (v.el) {
      this.overlay.highlight(v.el, v.severity, v.ruleId);
      setTimeout(() => this.overlay.clear(), 1600);
    }
  }

  private applyFix(v: Violation): void {
    const result = v.fix?.();
    if (result) this.onFix?.(v, result);
    // Re-audit immediately so the fixed finding disappears without a manual Run.
    this.onRun?.();
  }

  private exportReport(): void {
    const json = JSON.stringify(
      this.violations.map((v) => ({
        ruleId: v.ruleId,
        severity: v.severity,
        message: v.message,
        wcag: v.wcag,
        helpUrl: v.helpUrl,
        pageId: v.pageId,
        pageName: v.pageName,
        selector: v.component?.getSelectorsString?.() || undefined,
      })),
      null,
      2,
    );
    downloadFile('a11y-report.json', json, 'application/json');
    downloadFile('a11y-report.md', this.toMarkdown(), 'text/markdown');
  }

  private toMarkdown(): string {
    const { score: value, errors, warnings, infos } = score(this.violations);
    const lines = [
      `# Accessibility report`,
      ``,
      `**Score:** ${value}/100 — ${errors} errors · ${warnings} warnings · ${infos} info`,
      ``,
      `| Severity | Rule | WCAG | Page | Message |`,
      `| --- | --- | --- | --- | --- |`,
    ];
    for (const v of this.violations) {
      lines.push(
        `| ${v.severity} | ${v.ruleId} | ${v.wcag || ''} | ${v.pageName || ''} | ${v.message.replace(/\|/g, '\\|')} |`,
      );
    }
    return lines.join('\n') + '\n';
  }
}

function count(sev: Severity, n: number, label: string): HTMLElement {
  return h('span', { class: 'gjs-as-count' }, [
    h('span', { class: `gjs-as-dot gjs-as-dot-${sev}` }),
    h('span', { text: `${n} ${label}` }),
  ]);
}

/** A tiny inline-SVG sparkline of the score history (0..100, no dependency). */
function sparkline(values: number[]): SVGElement {
  const w = 80;
  const hgt = 24;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = hgt - (Math.max(0, Math.min(100, v)) / 100) * hgt;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(hgt));
  svg.setAttribute('class', 'gjs-as-sparkline');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Score trend: ${values.join(', ')}`);
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  poly.setAttribute('points', pts);
  poly.setAttribute('fill', 'none');
  poly.setAttribute('stroke', 'var(--as-accent)');
  poly.setAttribute('stroke-width', '1.5');
  svg.appendChild(poly);
  return svg;
}

function row(label: string, value: string): HTMLElement {
  return h('div', { class: 'gjs-as-tree-row' }, [
    h('span', { class: 'gjs-as-tree-key', text: label }),
    h('span', { class: 'gjs-as-tree-val', text: value }),
  ]);
}
