import type { Component, Editor } from 'grapesjs';
import type { ResolvedOptions, Severity, Violation } from '../types';
import { walkComponents } from '../core/walk';

/**
 * Optional axe-core adapter. axe-core (~500KB, MPL-2.0) is a peer dependency,
 * dynamically imported only when `engine: 'axe'`, so the plugin's own bundle
 * stays tiny and MIT. Results are mapped back to GrapesJS components via an
 * element→component lookup built from the component walk.
 */
export async function runAxe(editor: Editor, opts: ResolvedOptions): Promise<Violation[]> {
  const axe = await loadAxe();
  const doc = editor.Canvas.getDocument();
  if (!doc) return [];

  const { elToComp } = walkComponents(editor, opts.ignoreSelectors, editor.Pages?.getSelected?.() ?? undefined);
  const bySelector = buildSelectorMap(elToComp);

  const results = await axe.run(doc as unknown as Element, {
    resultTypes: ['violations'],
  });

  const out: Violation[] = [];
  for (const v of results.violations) {
    const severity = impactToSeverity(v.impact);
    for (const node of v.nodes) {
      // `target` is an array; nested iframe entries prefix the real selector.
      // GrapesJS already runs inside one frame, so the last string is ours.
      const target = node.target;
      const selector = normalizeTarget(target);
      const el = selector ? (doc.querySelector(selector) as HTMLElement | null) : null;
      const component: Component | undefined =
        (el && (elToComp.get(el) || bySelector.get(selector))) || undefined;
      out.push({
        ruleId: v.id,
        severity,
        message: node.failureSummary || v.help,
        wcag: mapAxeTags(v.tags),
        helpUrl: v.helpUrl,
        component,
        el: el || undefined,
      });
    }
  }
  return out;
}

interface AxeLike {
  run(
    context: Element,
    options: { resultTypes?: string[] },
  ): Promise<{
    violations: Array<{
      id: string;
      impact: string | null;
      help: string;
      helpUrl: string;
      tags: string[];
      nodes: Array<{ target: unknown[]; failureSummary?: string }>;
    }>;
  }>;
}

async function loadAxe(): Promise<AxeLike> {
  try {
    // Dynamic import: externalized in the npm ESM/CJS builds (kept lazy + tiny),
    // but inlined into the browser UMD build so a plain <script> is self-contained.
    const mod = (await import('axe-core')) as unknown as {
      default?: AxeLike;
      run?: AxeLike['run'];
    };
    const axe = (mod.default ?? mod) as AxeLike;
    if (typeof axe.run !== 'function') throw new Error('axe.run missing');
    return axe;
  } catch (e) {
    throw new Error(
      "engine:'axe' requires the optional peer dependency 'axe-core'. Install it: npm i axe-core. (" +
        String(e) +
        ')',
    );
  }
}

/** Flatten axe's `target` (which may nest for frames/shadow DOM) to one selector. */
function normalizeTarget(target: unknown[]): string {
  if (!target.length) return '';
  const last = target[target.length - 1];
  // Shadow-DOM entries are themselves arrays of selectors.
  if (Array.isArray(last)) return (last[last.length - 1] as string) || '';
  return String(last);
}

function buildSelectorMap(elToComp: Map<HTMLElement, Component>): Map<string, Component> {
  const map = new Map<string, Component>();
  for (const [el, comp] of elToComp) {
    const id = el.getAttribute('id');
    if (id) map.set(`#${id}`, comp);
  }
  return map;
}

function impactToSeverity(impact: string | null): Severity {
  switch (impact) {
    case 'critical':
    case 'serious':
      return 'error';
    case 'moderate':
      return 'warning';
    default:
      return 'info';
  }
}

/** Turn axe wcag tags (e.g. `wcag111`) into a display label. */
function mapAxeTags(tags: string[]): string | undefined {
  const tag = tags.find((t) => /^wcag\d{3,4}$/.test(t));
  if (!tag) return undefined;
  const digits = tag.slice(4);
  const parts = digits.split('').join('.');
  return `WCAG ${parts}`;
}
