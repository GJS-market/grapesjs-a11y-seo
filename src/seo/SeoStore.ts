import type { Editor } from 'grapesjs';
import type { ResolvedOptions, SeoModel } from '../types';

const KEY = 'a11ySeo';

/** Build a blank SEO model, applying configured defaults. */
export function defaultSeo(opts: ResolvedOptions): SeoModel {
  const d = opts.seo.defaults;
  return {
    title: '',
    description: '',
    canonical: '',
    robots: { index: true, follow: true, ...d.robots },
    focusKeyword: d.focusKeyword,
    og: { type: 'website', ...d.og },
    twitter: { card: 'summary_large_image', ...d.twitter },
    favicon: d.favicon || '',
    jsonld: d.jsonld ? [...d.jsonld] : [],
  };
}

/**
 * Per-page SEO storage. Data lives under a namespaced `a11ySeo` key in
 * `projectData`, so it round-trips through `getProjectData`/`loadProjectData`
 * and survives save/load. Persistence is wired by transparently augmenting
 * those two editor methods (restored on {@link SeoStore.dispose}).
 */
export class SeoStore {
  private byPage = new Map<string, SeoModel>();
  private origGet?: () => object;
  private origLoad?: (data: object, opts?: object) => unknown;

  constructor(
    private readonly editor: Editor,
    private readonly opts: ResolvedOptions,
  ) {
    this.install();
    this.hydrate((this.editor.getProjectData() as Record<string, unknown>)[KEY]);
  }

  private currentPageId(): string {
    return this.editor.Pages?.getSelected?.()?.getId?.() || 'default';
  }

  /** Get the model for a page (defaults to the selected page). */
  get(pageId?: string): SeoModel {
    const id = pageId || this.currentPageId();
    let model = this.byPage.get(id);
    if (!model) {
      model = defaultSeo(this.opts);
      this.byPage.set(id, model);
    }
    return model;
  }

  /** Patch a page's model and emit `seo:change`. */
  set(pageId: string, patch: Partial<SeoModel>): SeoModel {
    const current = this.get(pageId);
    const next: SeoModel = {
      ...current,
      ...patch,
      robots: { ...current.robots, ...patch.robots },
      og: { ...current.og, ...patch.og },
      twitter: { ...current.twitter, ...patch.twitter },
      jsonld: patch.jsonld ?? current.jsonld,
    };
    this.byPage.set(pageId, next);
    this.editor.trigger('seo:change', { pageId, model: next });
    return next;
  }

  /** All page ids that have a model. */
  pageIds(): string[] {
    return [...this.byPage.keys()];
  }

  /** Serialize all page models for persistence. */
  dump(): Record<string, SeoModel> {
    const out: Record<string, SeoModel> = {};
    for (const [id, model] of this.byPage) out[id] = model;
    return out;
  }

  /** Load page models from persisted data. */
  hydrate(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    for (const [id, model] of Object.entries(data as Record<string, SeoModel>)) {
      this.byPage.set(id, { ...defaultSeo(this.opts), ...model });
    }
  }

  private install(): void {
    const editor = this.editor as unknown as {
      getProjectData: () => Record<string, unknown>;
      loadProjectData: (data: object, opts?: object) => unknown;
    };
    this.origGet = editor.getProjectData.bind(editor);
    this.origLoad = editor.loadProjectData.bind(editor);
    editor.getProjectData = () => {
      const data = this.origGet!() as Record<string, unknown>;
      data[KEY] = this.dump();
      return data;
    };
    editor.loadProjectData = (data: object, opts?: object) => {
      this.hydrate((data as Record<string, unknown>)?.[KEY]);
      return this.origLoad!(data, opts);
    };
  }

  /** Restore the patched editor methods. */
  dispose(): void {
    const editor = this.editor as unknown as Record<string, unknown>;
    if (this.origGet) editor.getProjectData = this.origGet;
    if (this.origLoad) editor.loadProjectData = this.origLoad;
  }
}
