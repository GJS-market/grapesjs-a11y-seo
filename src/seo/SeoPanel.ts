import type { Editor } from 'grapesjs';
import type { ResolvedOptions, SeoModel } from '../types';
import type { SeoStore } from './SeoStore';
import { h, clear, link } from '../utils/h';
import { downloadFile, escapeHtml } from '../utils/format';
import { truncateTitle, truncateDescription, displayUrl } from './previews';
import { runSeoChecks, duplicateSeo } from './checks';
import { externalLinks, checkExternalLinks } from './links';
import { getHeadHtml, renderPage } from './head';
import { getSitemap } from './sitemap';
import { JSONLD_TEMPLATES, templateFor, validateBlock, richResultsHints, SCHEMA_ICON, autoFillValues } from './jsonld';
import { renderJsonLdFields } from './jsonldForm';
import type { JsonLdBlock } from '../types';

/** The SEO tab: metadata editor + live previews + checklist + JSON-LD + export. */
export class SeoPanel {
  private previewsEl!: HTMLElement;
  private checklistEl!: HTMLElement;
  private jsonldEl!: HTMLElement;
  private inputs: Record<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = {};

  constructor(
    private readonly root: HTMLElement,
    private readonly editor: Editor,
    private readonly store: SeoStore,
    private readonly opts: ResolvedOptions,
    private readonly t: (k: string, p?: Record<string, string | number>) => string,
  ) {
    this.build();
  }

  private model(): SeoModel {
    return this.store.get();
  }

  private pageId(): string | undefined {
    return this.editor.Pages?.getSelected?.()?.getId?.();
  }

  private commit(patch: Partial<SeoModel>): void {
    const id = this.pageId() || 'default';
    this.store.set(id, patch);
    this.renderPreviews();
    this.renderChecklist();
  }

  private field(
    key: string,
    label: string,
    value: string,
    opts: {
      textarea?: boolean;
      asset?: boolean;
      onInput: (v: string) => void;
      counter?: (v: string) => void;
    } = { onInput: () => {} },
  ): HTMLElement {
    const input = opts.textarea
      ? h('textarea', { attrs: { 'aria-label': label }, on: { input: () => handle() } })
      : h('input', { attrs: { type: 'text', 'aria-label': label }, on: { input: () => handle() } });
    (input as HTMLInputElement).value = value;
    this.inputs[key] = input;
    const counter = h('div', { class: 'gjs-as-counter' });
    const handle = () => {
      const v = (input as HTMLInputElement).value;
      opts.onInput(v);
      if (opts.counter) opts.counter(v);
    };
    const control = opts.asset
      ? h('div', { class: 'gjs-as-input-row' }, [input, this.assetButton(input, () => handle())])
      : input;
    const wrap = h('div', { class: 'gjs-as-field' }, [
      h('label', { text: label }),
      control,
      opts.counter ? counter : null,
    ]);
    // Expose the counter node so onInput handlers can colour it.
    (input as unknown as { _counter?: HTMLElement })._counter = counter;
    if (opts.counter) opts.counter(value);
    return wrap;
  }

  private counterFor(input: HTMLElement): HTMLElement | undefined {
    return (input as unknown as { _counter?: HTMLElement })._counter;
  }

  /**
   * Open the GrapesJS Asset Manager to pick an image, calling `onPick` with the
   * chosen URL. Falls back silently if the host has no Asset Manager.
   */
  private openAssetPicker(onPick: (url: string) => void): void {
    const am = this.editor.AssetManager;
    if (!am?.open) return;
    am.open({
      types: ['image'],
      select: (asset: { get?: (k: string) => unknown } | string, complete?: boolean) => {
        const src = typeof asset === 'string' ? asset : String(asset?.get?.('src') ?? '');
        if (src) onPick(src);
        // `complete` is true on double-click / explicit add — close the manager.
        if (complete !== false) am.close?.();
      },
    });
  }

  /** A small "browse assets" button that fills `input` with the picked URL. */
  private assetButton(input: HTMLElement, onSet: (url: string) => void): HTMLElement {
    return h('button', {
      class: 'gjs-as-asset-btn',
      text: '🖼',
      title: this.t('seo.ld.chooseImage'),
      attrs: { type: 'button', 'aria-label': this.t('seo.ld.chooseImage') },
      on: {
        click: () =>
          this.openAssetPicker((url) => {
            (input as HTMLInputElement).value = url;
            onSet(url);
          }),
      },
    });
  }

  private setCounter(key: string, text: string, cls: 'good' | 'warn' | 'bad' | ''): void {
    const c = this.counterFor(this.inputs[key]);
    if (!c) return;
    c.textContent = text;
    c.className = `gjs-as-counter ${cls ? 'gjs-as-' + cls : ''}`;
  }

  private build(): void {
    const m = this.model();
    const form = h('div', { class: 'gjs-as-form' });

    form.appendChild(
      this.field('title', this.t('seo.title'), m.title, {
        onInput: (v) => {
          this.commit({ title: v });
          this.titleCounter(v);
        },
        counter: (v) => this.titleCounter(v),
      }),
    );
    form.appendChild(
      this.field('description', this.t('seo.description'), m.description, {
        textarea: true,
        onInput: (v) => {
          this.commit({ description: v });
          this.descCounter(v);
        },
        counter: (v) => this.descCounter(v),
      }),
    );
    form.appendChild(
      this.field('canonical', this.t('seo.canonical'), m.canonical, {
        onInput: (v) => this.commit({ canonical: v }),
      }),
    );
    form.appendChild(
      this.field('focusKeyword', this.t('seo.focusKeyword'), m.focusKeyword || '', {
        onInput: (v) => this.commit({ focusKeyword: v }),
      }),
    );

    // Robots
    const robotsRow = h('div', { class: 'gjs-as-row' }, [
      this.checkbox('index', this.t('seo.index'), m.robots.index, (checked) =>
        this.commit({ robots: { ...this.model().robots, index: checked } }),
      ),
      this.checkbox('follow', this.t('seo.follow'), m.robots.follow, (checked) =>
        this.commit({ robots: { ...this.model().robots, follow: checked } }),
      ),
    ]);
    form.appendChild(robotsRow);

    // Social section
    form.appendChild(h('div', { class: 'gjs-as-section-title', text: this.t('seo.social') }));
    form.appendChild(
      this.field('ogImage', this.t('seo.ogImage'), m.og.image || '', {
        asset: true,
        onInput: (v) => this.commit({ og: { ...this.model().og, image: v } }),
      }),
    );
    form.appendChild(
      this.field('ogTitle', this.t('seo.ogTitle'), m.og.title || '', {
        onInput: (v) => this.commit({ og: { ...this.model().og, title: v } }),
      }),
    );

    // Previews
    form.appendChild(h('div', { class: 'gjs-as-section-title', text: this.t('seo.previews') }));
    this.previewsEl = h('div');
    form.appendChild(this.previewsEl);

    // Checklist
    form.appendChild(h('div', { class: 'gjs-as-section-title', text: this.t('seo.checklist') }));
    this.checklistEl = h('div');
    form.appendChild(this.checklistEl);

    // JSON-LD
    form.appendChild(h('div', { class: 'gjs-as-section-title', text: this.t('seo.jsonld') }));
    this.jsonldEl = h('div');
    form.appendChild(this.jsonldEl);

    // Export
    form.appendChild(h('div', { class: 'gjs-as-section-title', text: this.t('seo.export') }));
    form.appendChild(
      h('div', { class: 'gjs-as-row' }, [
        h('button', { class: 'gjs-as-btn gjs-as-ghost', text: this.t('seo.exportHead'), on: { click: () => this.exportHead() } }),
        h('button', { class: 'gjs-as-btn gjs-as-ghost', text: this.t('seo.exportPage'), on: { click: () => this.exportPage() } }),
        h('button', { class: 'gjs-as-btn gjs-as-ghost', text: this.t('seo.exportSitemap'), on: { click: () => this.exportSitemap() } }),
      ]),
    );

    clear(this.root);
    this.root.appendChild(form);
    this.renderPreviews();
    this.renderChecklist();
    this.renderJsonLd();
  }

  private checkbox(key: string, label: string, checked: boolean, onChange: (v: boolean) => void): HTMLElement {
    const input = h('input', { attrs: { type: 'checkbox' }, on: { change: () => onChange((input as HTMLInputElement).checked) } });
    (input as HTMLInputElement).checked = checked;
    this.inputs[key] = input;
    return h('div', { class: 'gjs-as-field' }, [
      h('label', { class: 'gjs-as-check' }, [input, h('span', { text: label })]),
    ]);
  }

  private titleCounter(v: string): void {
    const len = v.trim().length;
    const cls = len === 0 ? 'bad' : len >= 30 && len <= 60 ? 'good' : 'warn';
    this.setCounter('title', this.t('seo.counter.title', { len }), cls);
  }

  private descCounter(v: string): void {
    const len = v.trim().length;
    const cls = len === 0 ? 'warn' : len >= 50 && len <= 160 ? 'good' : 'warn';
    this.setCounter('description', this.t('seo.counter.desc', { len }), cls);
  }

  private renderPreviews(): void {
    const m = this.model();
    const tt = truncateTitle(m.title || this.t('seo.previewTitle'));
    const td = truncateDescription(m.description || this.t('seo.previewDesc'));
    const url = displayUrl(m.canonical || this.opts.seo.baseUrl);

    clear(this.previewsEl);
    // Google SERP
    this.previewsEl.appendChild(
      h('div', { class: 'gjs-as-preview' }, [
        h('div', { class: 'gjs-as-serp-url', text: url }),
        h('div', { class: 'gjs-as-serp-title', text: tt.text }),
        h('div', { class: 'gjs-as-serp-desc', text: td.text }),
      ]),
    );
    const img = m.og.image;
    const title = m.og.title || m.title || this.t('seo.previewTitle');
    const desc = m.og.description || m.description || this.t('seo.previewDesc');
    const card = (label: string, twitter: boolean) =>
      h('div', { class: 'gjs-as-preview' }, [
        h('div', { class: 'gjs-as-counter', text: label }),
        h('div', { class: 'gjs-as-card' }, [
          h('div', {
            class: 'gjs-as-card-img',
            style: img ? { backgroundImage: `url("${escapeHtml(img)}")` } : {},
            text: img ? '' : this.t('seo.noImage'),
          }),
          h('div', { class: 'gjs-as-card-body' }, [
            twitter && m.twitter.site
              ? h('div', { class: 'gjs-as-card-desc', text: m.twitter.site })
              : null,
            h('div', { class: 'gjs-as-card-title', text: title }),
            h('div', { class: 'gjs-as-card-desc', text: desc }),
          ]),
        ]),
      ]);
    // Separate Open Graph and Twitter cards.
    this.previewsEl.appendChild(card(this.t('seo.ogCard'), false));
    this.previewsEl.appendChild(card(this.t('seo.twitterCard', { card: m.twitter.card || 'summary_large_image' }), true));
  }

  private renderChecklist(): void {
    const checks = runSeoChecks({ editor: this.editor, store: this.store, opts: this.opts, t: this.t, pageId: this.pageId() });
    // Cross-page duplicate title/description when the project has several pages.
    const pageIds = this.editor.Pages?.getAll?.().map((p) => p.getId()) ?? [];
    if (pageIds.length > 1) checks.push(...duplicateSeo(this.store, pageIds, this.t));
    clear(this.checklistEl);
    const list = h('ul', { class: 'gjs-as-list' });
    for (const c of checks) {
      list.appendChild(
        h('li', { class: 'gjs-as-item' }, [
          h('div', { class: `gjs-as-sev gjs-as-sev-${c.ok ? 'info' : c.severity}`, style: c.ok ? { background: 'var(--as-ok)' } : {} }),
          h('div', { class: 'gjs-as-item-main' }, [
            h('div', { class: 'gjs-as-item-msg', text: `${c.ok ? '✓' : '✕'} ${c.message}` }),
          ]),
        ]),
      );
    }
    this.checklistEl.appendChild(list);

    // Opt-in external-link check (network requests; off by default).
    if (this.opts.checkExternalLinks) {
      const doc = this.editor.Canvas?.getDocument?.();
      if (doc) {
        const urls = externalLinks(doc);
        void checkExternalLinks(urls).then((broken) => {
          list.appendChild(
            h('li', { class: 'gjs-as-item' }, [
              h('div', {
                class: `gjs-as-sev gjs-as-sev-${broken.length ? 'warning' : 'info'}`,
                style: broken.length ? {} : { background: 'var(--as-ok)' },
              }),
              h('div', { class: 'gjs-as-item-main' }, [
                h('div', {
                  class: 'gjs-as-item-msg',
                  text: `${broken.length ? '✕' : '✓'} ${this.t('seo.check.extLinks', { count: broken.length })}`,
                }),
              ]),
            ]),
          );
        });
      }
    }
  }

  private renderJsonLd(): void {
    clear(this.jsonldEl);
    const m = this.model();

    // Schema picker — one icon chip per type.
    const picker = h('div', { class: 'gjs-as-ld-picker' });
    for (const tpl of JSONLD_TEMPLATES) {
      picker.appendChild(
        h('button', {
          class: 'gjs-as-chip gjs-as-ld-chip',
          attrs: { type: 'button', 'aria-label': this.t('seo.addSchemaOf', { type: tpl.label }) },
          on: {
            click: () => {
              this.commit({ jsonld: [...this.model().jsonld, tpl.create()] });
              this.renderJsonLd();
            },
          },
        }, [
          h('span', { class: 'gjs-as-ld-chip-icon', text: SCHEMA_ICON[tpl.type] || '＋', attrs: { 'aria-hidden': 'true' } }),
          h('span', { text: tpl.label }),
        ]),
      );
    }
    this.jsonldEl.appendChild(picker);

    if (!m.jsonld.length) {
      this.jsonldEl.appendChild(h('div', { class: 'gjs-as-ld-empty', text: this.t('seo.ld.empty') }));
      return;
    }

    m.jsonld.forEach((block, i) => this.jsonldEl.appendChild(this.renderSchemaCard(block, i)));
  }

  /** One refined, collapsible schema card. */
  private renderSchemaCard(block: JsonLdBlock, index: number): HTMLElement {
    const tpl = templateFor(block['@type']);
    const pill = h('span', { class: 'gjs-as-ld-pill' });
    const hintLine = h('div', { class: 'gjs-as-counter gjs-as-warn', style: { display: 'none' } });

    const refreshStatus = () => {
      const missing = validateBlock(block);
      const hints = richResultsHints(block);
      pill.className = `gjs-as-ld-pill ${missing.length ? 'gjs-as-ld-pill-warn' : 'gjs-as-ld-pill-ok'}`;
      pill.textContent = missing.length ? this.t('seo.ld.pillMissing', { n: missing.length }) : this.t('seo.ld.pillValid');
      if (!missing.length && hints.length) {
        hintLine.textContent = this.t('seo.jsonldHints', { fields: hints.join(', ') });
        hintLine.style.display = '';
      } else {
        hintLine.style.display = 'none';
      }
    };

    const onEdit = () => {
      this.commit({ jsonld: [...this.model().jsonld] }); // persist (block mutated in place)
      refreshStatus();
    };

    // Collapsible body.
    const body = h('div', { class: 'gjs-as-ld-body' }, [
      hintLine,
      tpl ? renderJsonLdFields(block, tpl, onEdit, this.t, (onPick) => this.openAssetPicker(onPick)) : null,
      this.renderAdvancedJson(block, onEdit),
    ]);

    const chevron = h('span', { class: 'gjs-as-ld-chevron', text: '▾', attrs: { 'aria-hidden': 'true' } });
    const header = h('button', {
      class: 'gjs-as-ld-header',
      attrs: { type: 'button', 'aria-expanded': 'true' },
      on: {
        click: () => {
          const open = body.style.display !== 'none';
          body.style.display = open ? 'none' : '';
          header.setAttribute('aria-expanded', String(!open));
          chevron.classList.toggle('gjs-as-collapsed', open);
        },
      },
    }, [
      h('span', { class: 'gjs-as-ld-icon', text: SCHEMA_ICON[block['@type']] || '📦', attrs: { 'aria-hidden': 'true' } }),
      h('span', { class: 'gjs-as-ld-type', text: block['@type'] }),
      pill,
      chevron,
    ]);

    const iconBtn = (glyph: string, key: string, onClick: () => void) =>
      h('button', {
        class: 'gjs-as-iconbtn',
        text: glyph,
        title: this.t(key),
        attrs: { type: 'button', 'aria-label': this.t(key) },
        on: { click: onClick },
      });

    const actions = h('div', { class: 'gjs-as-ld-actions' }, [
      iconBtn('✨', 'seo.ld.autoFill', () => {
        this.autoFillCard(block);
        this.renderJsonLd();
      }),
      iconBtn('⧉', 'seo.ld.duplicate', () => {
        const next = [...this.model().jsonld];
        next.splice(index + 1, 0, JSON.parse(JSON.stringify(block)));
        this.commit({ jsonld: next });
        this.renderJsonLd();
      }),
      iconBtn('📋', 'seo.ld.copyJson', () => this.copyText(JSON.stringify(block, null, 2))),
      iconBtn('🗑', 'action.remove', () => {
        const next = [...this.model().jsonld];
        next.splice(index, 1);
        this.commit({ jsonld: next });
        this.renderJsonLd();
      }),
    ]);

    const card = h('div', { class: 'gjs-as-ld-card' }, [header, actions, body]);
    refreshStatus();
    return card;
  }

  /** Prefill a schema's empty fields from the current page + SEO model. */
  private autoFillCard(block: JsonLdBlock): void {
    const doc = this.editor.Canvas?.getDocument?.();
    const m = this.model();
    autoFillValues(block, {
      title: m.title || m.og.title,
      h1: doc?.querySelector('h1')?.textContent?.trim(),
      image: m.og.image || doc?.querySelector('img')?.getAttribute('src') || undefined,
      url: m.canonical || this.opts.seo.baseUrl,
      today: new Date().toISOString().slice(0, 10),
    });
    this.commit({ jsonld: [...this.model().jsonld] });
  }

  private copyText(text: string): void {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  /** Collapsible raw-JSON editor for a block (advanced / complex fields). */
  private renderAdvancedJson(block: JsonLdBlock, onReplace: () => void): HTMLElement {
    const ta = h('textarea', {
      class: 'gjs-as-ld-json',
      attrs: { 'aria-label': this.t('seo.ld.advanced'), spellcheck: 'false' },
    });
    ta.value = JSON.stringify(block, null, 2);
    const err = h('div', { class: 'gjs-as-counter gjs-as-bad', style: { display: 'none' } });

    const applyIfValid = (raw: string): boolean => {
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object required');
        err.style.display = 'none';
        for (const k of Object.keys(block)) delete (block as Record<string, unknown>)[k];
        Object.assign(block, parsed);
        onReplace();
        return true;
      } catch {
        err.textContent = this.t('seo.ld.jsonInvalid');
        err.style.display = '';
        return false;
      }
    };
    ta.addEventListener('input', () => applyIfValid(ta.value));

    const toolbar = h('div', { class: 'gjs-as-ld-json-tools' }, [
      h('button', {
        class: 'gjs-as-link',
        text: this.t('seo.ld.formatJson'),
        attrs: { type: 'button' },
        on: {
          click: () => {
            if (applyIfValid(ta.value)) ta.value = JSON.stringify(block, null, 2);
          },
        },
      }),
      h('button', {
        class: 'gjs-as-link',
        text: this.t('seo.ld.copyJson'),
        attrs: { type: 'button' },
        on: { click: () => this.copyText(ta.value) },
      }),
      link('https://search.google.com/test/rich-results', this.t('seo.ld.testGoogle'), 'gjs-as-link'),
    ]);

    return h('details', { class: 'gjs-as-ld-advanced' }, [
      h('summary', { text: this.t('seo.ld.advanced') }),
      toolbar,
      ta,
      err,
    ]);
  }

  private exportHead(): void {
    downloadFile('head.html', getHeadHtml(this.store, this.pageId()), 'text/html');
  }

  private exportPage(): void {
    downloadFile('page.html', renderPage(this.editor, this.store, this.opts, this.pageId()), 'text/html');
  }

  private exportSitemap(): void {
    downloadFile('sitemap.xml', getSitemap(this.editor, this.store, this.opts.seo.baseUrl), 'application/xml');
  }

  /** Rebuild the form for the currently selected page (called on page:select). */
  refresh(): void {
    this.build();
  }
}
