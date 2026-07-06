import type { Editor } from 'grapesjs';
import type {
  A11ySeoApi,
  A11ySeoOptions,
  ResolvedOptions,
  Rule,
  SeoModel,
  SettingsModel,
  Tab,
} from './types';
import { makeT, buildNested, DEFAULT_MESSAGES } from './i18n';
import { ru } from './i18n/ru';
import { es } from './i18n/es';
import { EditorBridge } from './core/EditorBridge';
import { Overlay } from './core/Overlay';
import { Panel } from './core/Panel';
import { ProjectStore } from './core/ProjectStore';
import { LayerBadges } from './core/LayerBadges';
import { mountPanelInDevtools } from './core/devtools';
import { RuleRegistry } from './a11y/registry';
import { AuditEngine } from './a11y/AuditEngine';
import { AccessibilityPanel } from './a11y/AccessibilityPanel';
import { SettingsPanel } from './a11y/SettingsPanel';
import { SeoStore } from './seo/SeoStore';
import { SeoPanel } from './seo/SeoPanel';
import { getHeadHtml, renderPage } from './seo/head';
import { getSitemap } from './seo/sitemap';
import { debounce } from './utils/debounce';
import { score as scoreOf } from './utils/score';
import './core/theme.css';

const TOGGLE_CMD = 'a11y-seo:toggle';

const DEFAULTS: ResolvedOptions = {
  enabled: false,
  hotkey: 'ctrl+shift+a',
  position: 'right',
  theme: 'dark',
  open: 'a11y',
  engine: 'builtin',
  wcagLevel: 'AA',
  wcagVersion: '2.2',
  live: true,
  auditDebounce: 400,
  showButton: true,
  mountInDevtools: false,
  locale: 'en',
  checkExternalLinks: false,
  disableRules: [],
  rules: [],
  ignoreSelectors: [],
  seo: { defaults: {}, baseUrl: '' },
  i18n: {},
};

function resolveOptions(opts: A11ySeoOptions): ResolvedOptions {
  return {
    ...DEFAULTS,
    ...opts,
    seo: {
      defaults: opts.seo?.defaults ?? {},
      baseUrl: opts.seo?.baseUrl ?? '',
    },
    i18n: opts.i18n ?? {},
    rules: opts.rules ?? [],
    disableRules: opts.disableRules ?? [],
    ignoreSelectors: opts.ignoreSelectors ?? [],
  };
}

/** Expand a hotkey with a `⌘` variant so the same binding works on macOS. */
function withMacHotkey(hotkey: string): string {
  if (hotkey.includes('⌘') || hotkey.includes('cmd')) return hotkey;
  const mac = hotkey.replace(/\bctrl\b/gi, '⌘');
  return mac === hotkey ? hotkey : `${hotkey}, ${mac}`;
}

/**
 * grapesjs-a11y-seo — an in-editor accessibility auditor and SEO metadata
 * manager. Returns the public {@link A11ySeoApi}, also exposed as
 * `editor.A11ySeo`.
 */
export default function grapesjsA11ySeo(editor: Editor, opts: A11ySeoOptions = {}): A11ySeoApi {
  const options = resolveOptions(opts);
  // Shipped locale bundles (ru/es) layer over the English base; explicit
  // opts.i18n overrides win on top.
  const BUNDLES: Record<string, Record<string, string>> = { ru, es };
  const localT = makeT({ ...(BUNDLES[options.locale] ?? {}), ...options.i18n });

  // Register our catalog with editor.I18n so hosts can localize/override
  // centrally, then resolve through it (falling back to our own catalog).
  try {
    editor.I18n?.addMessages?.({ en: { a11ySeo: buildNested({ ...DEFAULT_MESSAGES, ...options.i18n }) } });
  } catch {
    /* I18n may be unavailable in a stripped build */
  }
  const t = (key: string, params?: Record<string, string | number>): string => {
    try {
      const full = `a11ySeo.${key}`;
      const res = editor.I18n?.t?.(full, { params });
      if (res && res !== full && res !== key) return res;
    } catch {
      /* fall through to local catalog */
    }
    return localT(key, params);
  };

  const bridge = new EditorBridge(editor);
  const overlay = new Overlay(editor);
  const registry = new RuleRegistry(options.rules, options.disableRules);
  const engine = new AuditEngine(editor, options, registry, t);
  // ProjectStore is installed BEFORE SeoStore so their getProjectData patches
  // nest and unwind cleanly (SeoStore disposed first on teardown).
  const projectStore = new ProjectStore(editor);
  const store = new SeoStore(editor, options);
  const panel = new Panel(editor, options, t);

  const a11yPanel = new AccessibilityPanel(
    panel.a11yPane,
    editor,
    overlay,
    options,
    t,
    {
      isAccepted: (fp) => projectStore.isAccepted(fp),
      accept: (fp) => projectStore.accept(fp),
      unaccept: (fp) => projectStore.unaccept(fp),
    },
    () => projectStore.getHistory(),
  );
  const seoPanel = new SeoPanel(panel.seoPane, editor, store, options, t);
  const layerBadges = new LayerBadges(bridge);

  let live = options.live;
  let allPages = false;
  let auditing = false;
  let pending = false;

  /** Apply persisted / edited settings to the running plugin, then re-audit. */
  const applySettings = (s: Partial<SettingsModel>): void => {
    if (s.wcagLevel) options.wcagLevel = s.wcagLevel;
    if (s.wcagVersion) options.wcagVersion = s.wcagVersion;
    if (s.engine) options.engine = s.engine;
    if (s.ignoreSelectors) options.ignoreSelectors = s.ignoreSelectors;
    if (s.theme) {
      options.theme = s.theme;
      panel.setTheme(s.theme);
    }
    if (typeof s.live === 'boolean') {
      live = s.live;
      options.live = s.live;
    }
    if (s.disabledRules) {
      for (const r of registry.list()) {
        if (s.disabledRules.includes(r.id)) registry.disable(r.id);
        else registry.enable(r.id);
      }
    }
    if (panel.isVisible) runAuditAsync();
  };

  const settingsPanel = new SettingsPanel(panel.settingsPane, registry, options, projectStore, t, applySettings);

  // Apply any settings persisted with the project (now + after a project load).
  applySettings(projectStore.getSettings());
  bridge.on('a11y:stateload', () => {
    applySettings(projectStore.getSettings());
    settingsPanel.refresh();
  });

  const runAuditAsync = (): void => {
    // If a run is already in flight, remember to run again when it finishes so
    // the latest request (e.g. a mode toggle) is never dropped.
    if (auditing) {
      pending = true;
      return;
    }
    auditing = true;
    const p = allPages ? engine.runAllAsync() : engine.runAsync();
    void p
      .then((v) => {
        a11yPanel.update(v);
        layerBadges.update(v);
        const s = scoreOf(v);
        panel.announce(
          t('a11y.announce', { errors: s.errors, warnings: s.warnings, infos: s.infos, score: s.score }),
        );
      })
      .catch((err) => {
        // A failed run must never leave the auditor wedged: swallow the rejection
        // (the `.finally` below still resets state) but surface it in dev.
        // eslint-disable-next-line no-console
        console.warn('[a11y-seo] audit run failed', err);
      })
      .finally(() => {
        auditing = false;
        if (pending) {
          pending = false;
          runAuditAsync();
        }
      });
  };
  a11yPanel.onRun = runAuditAsync;
  a11yPanel.onLiveChange = (v) => {
    live = v;
  };
  a11yPanel.onAllPagesChange = (v) => {
    allPages = v;
  };
  a11yPanel.onFix = (v, result) => {
    editor.trigger('a11y:fix', v.component ?? null, v.ruleId, result);
  };
  a11yPanel.onFixAll = () => {
    // Apply every deterministic fix synchronously so GrapesJS coalesces them
    // into a single undo group (one Ctrl+Z reverts the whole batch).
    let count = 0;
    for (const v of engine.getResults()) {
      if (!v.fix) continue;
      const result = v.fix();
      if (result.changed) {
        editor.trigger('a11y:fix', v.component ?? null, v.ruleId, result);
        count++;
      }
    }
    if (count) runAuditAsync();
  };

  const debouncedAudit = debounce(() => {
    // Suppress live re-audit in all-pages mode: cycling pages would itself fire
    // component/page events and create an audit feedback loop. All-pages runs
    // on demand (Run button / toggle) instead.
    if (live && !allPages && panel.isVisible && panel.activeTab === 'a11y') runAuditAsync();
  }, options.auditDebounce);

  // Live re-audit on canvas mutations.
  const LIVE_EVENTS = ['component:add', 'component:remove', 'component:update', 'component:styleUpdate'];
  for (const ev of LIVE_EVENTS) bridge.on(ev, debouncedAudit);

  // Record the score on each project save, for the history sparkline.
  bridge.on('storage:store', () => {
    projectStore.pushScore(scoreOf(engine.getResults()).score);
  });

  // Refresh SEO form + re-audit when the page changes (but not during an
  // all-pages audit, which selects pages itself).
  bridge.on('page:select', () => {
    if (auditing) return;
    seoPanel.refresh();
    if (panel.isVisible) runAuditAsync();
  });

  // Re-run when a tab is shown.
  panel.onTabChange = (tab: Tab) => {
    if (tab === 'a11y' && panel.isVisible) runAuditAsync();
    if (tab === 'seo') seoPanel.refresh();
    if (tab === 'settings') settingsPanel.refresh();
  };

  // Accessibility Tree preview for the selected component.
  const onSelect = () => {
    const el = (editor.getSelected?.()?.getEl?.() as HTMLElement | undefined) || null;
    a11yPanel.showA11yTree(el);
  };
  bridge.on('component:selected', onSelect);
  bridge.on('component:deselected', () => a11yPanel.showA11yTree(null));

  // Optional: mount inside grapesjs-devtools if present (best-effort). Try now
  // and once more after the editor loads, since devtools may init after us.
  if (options.mountInDevtools) {
    const tryMount = () => mountPanelInDevtools(document, panel, 'A11y/SEO');
    if (!tryMount()) bridge.once('load', () => tryMount());
  }

  // Command + hotkey + optional toolbar button.
  editor.Commands.add(TOGGLE_CMD, {
    run: () => {
      panel.show();
      runAuditAsync();
      return true;
    },
    stop: () => {
      panel.hide();
      return false;
    },
  });

  editor.Keymaps.add(TOGGLE_CMD, withMacHotkey(options.hotkey), () => {
    if (panel.isVisible) editor.stopCommand(TOGGLE_CMD);
    else editor.runCommand(TOGGLE_CMD);
  });

  if (options.showButton) {
    try {
      editor.Panels.addButton('options', {
        id: 'a11y-seo-toggle',
        className: 'fa fa-universal-access',
        command: TOGGLE_CMD,
        attributes: { title: 'Accessibility & SEO (a11y-seo)' },
        togglable: true,
      } as Parameters<typeof editor.Panels.addButton>[1]);
    } catch {
      /* options panel may be absent in a headless setup */
    }
  }

  // Build the public API.
  const api: A11ySeoApi = {
    runAudit: () => {
      const v = engine.run();
      a11yPanel.update(v);
      return v;
    },
    getResults: () => engine.getResults(),
    addRule: (rule: Rule) => registry.add(rule),
    disableRule: (id: string) => registry.disable(id),
    on: (evt, cb) => {
      const name = evt === 'audit' ? 'a11y:audit' : evt === 'fix' ? 'a11y:fix' : 'seo:change';
      bridge.on(name, cb as (...a: unknown[]) => void);
    },
    getSeo: (pageId?: string): SeoModel => store.get(pageId),
    setSeo: (pageId: string, patch: Partial<SeoModel>) => {
      store.set(pageId, patch);
      seoPanel.refresh();
    },
    getHeadHtml: (pageId?: string) => getHeadHtml(store, pageId),
    renderPage: (pageId?: string) => renderPage(editor, store, options, pageId),
    getSitemap: (baseUrl?: string) => getSitemap(editor, store, baseUrl ?? options.seo.baseUrl),
    getBadgeHtml: () =>
      '<a href="https://gjs.market" target="_blank" rel="noopener noreferrer" ' +
      'style="font:12px sans-serif;color:#5b8cff;text-decoration:none">♿ Accessible &amp; SEO-ready · grapesjs-a11y-seo</a>',
    getScoreHistory: () => projectStore.getHistory(),
    open: (tab?: Tab) => {
      panel.show(tab);
      runAuditAsync();
    },
    close: () => panel.hide(),
    destroy: () => teardown(),
  };

  function teardown(): void {
    debouncedAudit.cancel();
    bridge.disposeAll();
    overlay.destroy();
    panel.destroy();
    layerBadges.clear();
    // Dispose in reverse install order: SeoStore first, then ProjectStore, so
    // the nested getProjectData patches unwind cleanly.
    store.dispose();
    projectStore.dispose();
    delete (editor as unknown as { A11ySeo?: A11ySeoApi }).A11ySeo;
  }

  bridge.once('destroy', teardown);

  (editor as unknown as { A11ySeo: A11ySeoApi }).A11ySeo = api;

  if (options.enabled) {
    // Auto-open THROUGH the command so GrapesJS' active-state (and the ♿
    // toolbar button) stay in sync with the panel — otherwise the first
    // hotkey/button toggle is a no-op.
    editor.onReady(() => editor.runCommand(TOGGLE_CMD));
  }

  return api;
}

export type {
  A11ySeoOptions,
  A11ySeoApi,
  Rule,
  RuleFinding,
  Violation,
  SeoModel,
  Severity,
  AuditContext,
} from './types';
