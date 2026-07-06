import type { Editor } from 'grapesjs';
import type { BaselineModel, ProjectState, SettingsModel } from '../types';

const KEY = 'a11ySeoState';
const HISTORY_MAX = 10;

/**
 * Persisted plugin state (Settings + Baseline + score history), stored under a
 * namespaced `a11ySeoState` key in `projectData`. Mirrors {@link SeoStore}'s
 * transparent `getProjectData`/`loadProjectData` augmentation so it round-trips
 * through save/load. Install this BEFORE SeoStore and dispose it AFTER, so the
 * two method patches nest and unwind cleanly.
 */
export class ProjectStore {
  private state: ProjectState = { settings: {}, baseline: {}, history: [] };
  private origGet?: () => object;
  private origLoad?: (data: object, opts?: object) => unknown;

  constructor(private readonly editor: Editor) {
    this.install();
    this.hydrate((this.editor.getProjectData() as Record<string, unknown>)[KEY]);
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  getSettings(): Partial<SettingsModel> {
    return this.state.settings;
  }

  setSettings(patch: Partial<SettingsModel>): void {
    this.state.settings = { ...this.state.settings, ...patch };
    this.editor.trigger('a11y:settings', this.state.settings);
  }

  // ── Baseline (accepted risks) ────────────────────────────────────────────
  isAccepted(fingerprint: string): boolean {
    return this.state.baseline[fingerprint] === true;
  }

  accept(fingerprint: string): void {
    this.state.baseline[fingerprint] = true;
    this.editor.trigger('a11y:baseline', this.state.baseline);
  }

  unaccept(fingerprint: string): void {
    delete this.state.baseline[fingerprint];
    this.editor.trigger('a11y:baseline', this.state.baseline);
  }

  getBaseline(): BaselineModel {
    return this.state.baseline;
  }

  // ── Score history ────────────────────────────────────────────────────────
  pushScore(score: number): void {
    this.state.history = [...this.state.history, score].slice(-HISTORY_MAX);
  }

  getHistory(): number[] {
    return this.state.history;
  }

  // ── Persistence ──────────────────────────────────────────────────────────
  private hydrate(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    const d = data as Partial<ProjectState>;
    this.state = {
      settings: d.settings ?? {},
      baseline: d.baseline ?? {},
      history: Array.isArray(d.history) ? d.history : [],
    };
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
      data[KEY] = this.state;
      return data;
    };
    editor.loadProjectData = (data: object, opts?: object) => {
      this.hydrate((data as Record<string, unknown>)?.[KEY]);
      this.editor.trigger('a11y:stateload', this.state);
      return this.origLoad!(data, opts);
    };
  }

  dispose(): void {
    const editor = this.editor as unknown as Record<string, unknown>;
    if (this.origGet) editor.getProjectData = this.origGet;
    if (this.origLoad) editor.loadProjectData = this.origLoad;
  }
}
