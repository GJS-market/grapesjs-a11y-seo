import type { ResolvedOptions, SettingsModel } from '../types';
import type { RuleRegistry } from './registry';
import type { ProjectStore } from '../core/ProjectStore';
import { h, clear } from '../utils/h';

/**
 * The Settings tab: content-editor-facing controls (per-rule enable/disable,
 * WCAG level/version, theme, live, engine, ignored selectors). Changes persist
 * to {@link ProjectStore} (shared with the project) and apply live via
 * `onChange`.
 */
export class SettingsPanel {
  constructor(
    private readonly root: HTMLElement,
    private readonly registry: RuleRegistry,
    private readonly opts: ResolvedOptions,
    private readonly store: ProjectStore,
    private readonly t: (k: string, p?: Record<string, string | number>) => string,
    private readonly onChange: (patch: Partial<SettingsModel>) => void,
  ) {
    this.build();
  }

  private emit(patch: Partial<SettingsModel>): void {
    this.store.setSettings(patch);
    this.onChange(patch);
  }

  private select(
    label: string,
    value: string,
    options: Array<[string, string]>,
    onSet: (v: string) => void,
  ): HTMLElement {
    const sel = h('select', {
      class: 'gjs-as-select',
      attrs: { 'aria-label': label },
      on: { change: () => onSet((sel as HTMLSelectElement).value) },
    });
    for (const [val, text] of options) sel.appendChild(h('option', { attrs: { value: val }, text }));
    (sel as HTMLSelectElement).value = value;
    return h('div', { class: 'gjs-as-field' }, [h('label', { text: label }), sel]);
  }

  private checkbox(label: string, checked: boolean, onSet: (v: boolean) => void): HTMLElement {
    const input = h('input', { attrs: { type: 'checkbox' }, on: { change: () => onSet((input as HTMLInputElement).checked) } });
    (input as HTMLInputElement).checked = checked;
    return h('label', { class: 'gjs-as-check' }, [input, h('span', { text: label })]);
  }

  private build(): void {
    const form = h('div', { class: 'gjs-as-form' });
    form.appendChild(h('div', { class: 'gjs-as-counter', text: this.t('settings.intro') }));

    // WCAG level / version
    form.appendChild(
      this.select(
        this.t('settings.wcagLevel'),
        this.opts.wcagLevel,
        [['AA', 'AA'], ['AAA', 'AAA']],
        (v) => this.emit({ wcagLevel: v as SettingsModel['wcagLevel'] }),
      ),
    );
    form.appendChild(
      this.select(
        this.t('settings.wcagVersion'),
        this.opts.wcagVersion,
        [['2.0', '2.0'], ['2.1', '2.1'], ['2.2', '2.2']],
        (v) => this.emit({ wcagVersion: v as SettingsModel['wcagVersion'] }),
      ),
    );
    form.appendChild(
      this.select(
        this.t('settings.theme'),
        this.opts.theme,
        [['dark', 'dark'], ['light', 'light'], ['auto', 'auto']],
        (v) => this.emit({ theme: v as SettingsModel['theme'] }),
      ),
    );
    form.appendChild(
      this.select(
        this.t('settings.engine'),
        this.opts.engine,
        [['builtin', 'builtin'], ['axe', 'axe']],
        (v) => this.emit({ engine: v as SettingsModel['engine'] }),
      ),
    );

    form.appendChild(
      h('div', { class: 'gjs-as-field' }, [
        this.checkbox(this.t('settings.live'), this.opts.live, (v) => this.emit({ live: v })),
      ]),
    );

    // Ignore selectors
    const ta = h('textarea', {
      attrs: { 'aria-label': this.t('settings.ignoreSelectors') },
      on: {
        change: () => {
          const list = (ta as HTMLTextAreaElement).value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
          this.emit({ ignoreSelectors: list });
        },
      },
    });
    (ta as HTMLTextAreaElement).value = this.opts.ignoreSelectors.join('\n');
    form.appendChild(h('div', { class: 'gjs-as-field' }, [h('label', { text: this.t('settings.ignoreSelectors') }), ta]));

    // Rules enable/disable
    form.appendChild(h('div', { class: 'gjs-as-section-title', text: this.t('settings.rules') }));
    const rulesBox = h('div', { class: 'gjs-as-rules' });
    for (const rule of this.registry.list()) {
      rulesBox.appendChild(
        h('div', { class: 'gjs-as-field' }, [
          this.checkbox(rule.id, rule.enabled !== false, (v) => {
            if (v) this.registry.enable(rule.id);
            else this.registry.disable(rule.id);
            this.emit({ disabledRules: this.registry.list().filter((r) => r.enabled === false).map((r) => r.id) });
          }),
        ]),
      );
    }
    form.appendChild(rulesBox);

    clear(this.root);
    this.root.appendChild(form);
  }

  /** Rebuild (e.g. after settings load). */
  refresh(): void {
    this.build();
  }
}
