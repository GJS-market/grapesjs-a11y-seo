import type { Editor } from 'grapesjs';
import type { PanelPosition, ResolvedOptions, Tab, Theme } from '../types';
import { h, link, clear } from '../utils/h';

const LS_KEY = 'gjs-a11y-seo:panel';
const MIN_SIZE = 240;

interface PersistedState {
  position: PanelPosition;
  width: number;
  height: number;
  tab: Tab;
}

/**
 * Dockable, resizable panel with Accessibility / SEO tabs. A `position:fixed`
 * root is appended to the top document — it never touches the canvas iframe.
 * State (dock, size, active tab) persists to localStorage. Theme supports
 * light / dark / auto. Mirrors `grapesjs-devtools`' DevtoolsPanel shell.
 */
export class Panel {
  readonly a11yPane: HTMLElement;
  readonly seoPane: HTMLElement;
  readonly settingsPane: HTMLElement;

  private root!: HTMLElement;
  private bodyEl!: HTMLElement;
  private liveRegion!: HTMLElement;
  private tabButtons: Record<Tab, HTMLButtonElement> = {} as never;
  private state: PersistedState;
  private visible = false;
  private built = false;
  private embeddedHost: HTMLElement | null = null;
  private mqListener?: (e: MediaQueryListEvent) => void;
  private mql?: MediaQueryList;

  /** Called after a dock/tab change so the host can react (e.g. re-audit). */
  onTabChange?: (tab: Tab) => void;

  constructor(
    _editor: Editor,
    private readonly opts: ResolvedOptions,
    private readonly t: (k: string, p?: Record<string, string | number>) => string,
  ) {
    this.a11yPane = h('div', { class: 'gjs-as-pane', attrs: { 'data-tab': 'a11y' } });
    this.seoPane = h('div', { class: 'gjs-as-pane', attrs: { 'data-tab': 'seo' } });
    this.settingsPane = h('div', { class: 'gjs-as-pane', attrs: { 'data-tab': 'settings' } });
    this.state = {
      position: opts.position,
      width: 380,
      height: 300,
      tab: opts.open,
      ...this.load(),
    };
  }

  private load(): Partial<PersistedState> {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as Partial<PersistedState>) : {};
    } catch {
      return {};
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.state));
    } catch {
      /* storage may be unavailable */
    }
  }

  private build(): void {
    if (this.built) return;

    const tab = (id: Tab, key: string) =>
      h(
        'button',
        {
          class: 'gjs-as-tab',
          attrs: { role: 'tab', type: 'button' },
          on: { click: () => this.setTab(id) },
        },
        [this.t(key)],
      );
    this.tabButtons.a11y = tab('a11y', 'tab.a11y');
    this.tabButtons.seo = tab('seo', 'tab.seo');
    this.tabButtons.settings = tab('settings', 'tab.settings');

    const embedded = !!this.embeddedHost;

    const dock = (pos: PanelPosition, glyph: string) =>
      h('button', {
        class: 'gjs-as-iconbtn',
        title: this.t('dock.' + pos),
        text: glyph,
        attrs: { 'aria-label': this.t('dock.' + pos), type: 'button' },
        on: { click: () => this.setPosition(pos) },
      });

    // In embedded mode (mounted inside another panel, e.g. grapesjs-devtools)
    // we drop our own chrome — the host provides docking/close.
    const headerChildren = [
      h('div', { class: 'gjs-as-tabs' }, [
        this.tabButtons.a11y,
        this.tabButtons.seo,
        this.tabButtons.settings,
      ]),
      h('div', { class: 'gjs-as-spacer' }),
      ...(embedded
        ? []
        : [
            dock('left', '⤙'),
            dock('bottom', '⤓'),
            dock('right', '⤚'),
            h('button', {
              class: 'gjs-as-iconbtn',
              title: this.t('action.close'),
              text: '✕',
              attrs: { 'aria-label': this.t('action.close'), type: 'button' },
              on: { click: () => this.hide() },
            }),
          ]),
    ];
    (headerChildren[0] as HTMLElement).setAttribute('role', 'tablist');
    const header = h('div', { class: 'gjs-as-header' }, headerChildren);

    this.a11yPane.setAttribute('role', 'tabpanel');
    this.seoPane.setAttribute('role', 'tabpanel');
    this.settingsPane.setAttribute('role', 'tabpanel');
    this.bodyEl = h('div', { class: 'gjs-as-body' }, [this.a11yPane, this.seoPane, this.settingsPane]);

    // Screen-reader announcements (audit completion, counts).
    this.liveRegion = h('div', {
      class: 'gjs-as-sr-only',
      attrs: { 'aria-live': 'polite', 'aria-atomic': 'true', role: 'status' },
    });

    const footer = h('div', { class: 'gjs-as-footer' }, [
      h('span', { text: this.t('footer.tagline') }),
      link('https://github.com/GJS-market/grapesjs-a11y-seo', 'GitHub'),
      link('https://gjs.market', 'gjs.market'),
      link('https://gjs.market/services', this.t('footer.services')),
    ]);

    const children = embedded
      ? [header, this.bodyEl, this.liveRegion, footer]
      : [
          h('div', { class: 'gjs-as-resize', on: { mousedown: (e) => this.startResize(e as MouseEvent) } }),
          header,
          this.bodyEl,
          this.liveRegion,
          footer,
        ];

    this.root = h('div', {
      class: `gjs-as-root${embedded ? ' gjs-as-embedded' : ''}`,
      attrs: { role: 'region', 'aria-label': this.t('panel.label') },
      on: {
        keydown: (e) => {
          if ((e as KeyboardEvent).key === 'Escape' && !embedded) this.hide();
        },
      },
    }, children);
    (this.embeddedHost || document.body).appendChild(this.root);
    this.built = true;

    if (!embedded) this.applyPosition();
    this.applyTheme();
    this.setTab(this.state.tab, true);
  }

  /**
   * Render inside a host container (e.g. a grapesjs-devtools tab) instead of a
   * floating dock. Must be called before the first {@link Panel.show}.
   */
  setEmbeddedHost(host: HTMLElement): void {
    this.embeddedHost = host;
  }

  /** The two content panes, for hosts that embed our UI. */
  getPanes(): { a11y: HTMLElement; seo: HTMLElement } {
    return { a11y: this.a11yPane, seo: this.seoPane };
  }

  private setTab(tab: Tab, silent = false): void {
    this.state.tab = tab;
    (['a11y', 'seo', 'settings'] as Tab[]).forEach((t) => {
      this.tabButtons[t]?.classList.toggle('gjs-as-active', t === tab);
    });
    (['a11y', 'seo', 'settings'] as Tab[]).forEach((tb) => {
      this.tabButtons[tb]?.setAttribute('aria-selected', String(tb === tab));
    });
    this.a11yPane.classList.toggle('gjs-as-active', tab === 'a11y');
    this.seoPane.classList.toggle('gjs-as-active', tab === 'seo');
    this.settingsPane.classList.toggle('gjs-as-active', tab === 'settings');
    this.persist();
    if (!silent) this.onTabChange?.(tab);
  }

  /** Programmatically switch tab (used by the public API). */
  showTab(tab: Tab): void {
    if (this.built) this.setTab(tab);
    else this.state.tab = tab;
  }

  private setPosition(pos: PanelPosition): void {
    this.state.position = pos;
    this.persist();
    this.applyPosition();
  }

  private applyPosition(): void {
    const p = this.state.position;
    this.root.classList.remove('gjs-as-pos-left', 'gjs-as-pos-right', 'gjs-as-pos-bottom');
    this.root.classList.add(`gjs-as-pos-${p}`);
    if (p === 'bottom') {
      this.root.style.height = `${this.state.height}px`;
      this.root.style.width = '';
    } else {
      this.root.style.width = `${this.state.width}px`;
      this.root.style.height = '';
    }
  }

  private startResize(e: MouseEvent): void {
    e.preventDefault();
    const p = this.state.position;
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = this.state.width;
    const startH = this.state.height;
    const move = (ev: MouseEvent) => {
      if (p === 'right') this.state.width = clamp(startW - (ev.clientX - startX));
      else if (p === 'left') this.state.width = clamp(startW + (ev.clientX - startX));
      else this.state.height = clamp(startH - (ev.clientY - startY));
      this.applyPosition();
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      this.persist();
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  private resolveTheme(): Exclude<Theme, 'auto'> {
    if (this.opts.theme !== 'auto') return this.opts.theme;
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  }

  private applyTheme(): void {
    // Detach any previous auto listener (theme can change at runtime via Settings).
    if (this.mql && this.mqListener) {
      this.mql.removeEventListener('change', this.mqListener);
      this.mqListener = undefined;
    }
    const apply = () => {
      this.root.classList.toggle('gjs-as-light', this.resolveTheme() === 'light');
    };
    apply();
    if (this.opts.theme === 'auto' && window.matchMedia) {
      this.mql = window.matchMedia('(prefers-color-scheme: light)');
      this.mqListener = () => apply();
      this.mql.addEventListener('change', this.mqListener);
    }
  }

  show(tab?: Tab): void {
    this.build();
    if (tab) this.setTab(tab);
    this.root.classList.remove('gjs-as-hidden');
    this.visible = true;
    this.onTabChange?.(this.state.tab);
  }

  hide(): void {
    if (!this.built) return;
    this.root.classList.add('gjs-as-hidden');
    this.visible = false;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  get activeTab(): Tab {
    return this.state.tab;
  }

  /** Announce a message to screen readers via the polite live region. */
  announce(message: string): void {
    if (this.liveRegion) this.liveRegion.textContent = message;
  }

  /** Runtime theme override (from the Settings tab). */
  setTheme(theme: Theme): void {
    this.opts.theme = theme;
    if (this.built) this.applyTheme();
  }

  destroy(): void {
    if (this.mql && this.mqListener) this.mql.removeEventListener('change', this.mqListener);
    if (this.built) {
      clear(this.a11yPane);
      clear(this.seoPane);
      clear(this.settingsPane);
      this.root.remove();
    }
    this.built = false;
    this.visible = false;
  }
}

function clamp(size: number): number {
  const max = Math.max(MIN_SIZE, Math.min(window.innerWidth, window.innerHeight) - 100);
  return Math.max(MIN_SIZE, Math.min(size, max));
}
