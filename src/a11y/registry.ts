import type { Rule } from '../types';
import { imgAlt } from './rules/img-alt';
import { headings } from './rules/headings';
import { contrast } from './rules/contrast';
import { linkName } from './rules/link-name';
import { formLabels } from './rules/form-labels';
import { ariaValid } from './rules/aria-valid';
import { landmarks } from './rules/landmarks';
import { tabindex } from './rules/tabindex';
import { targetSize } from './rules/target-size';
import { mediaCaptions } from './rules/media-captions';
import { duplicateId } from './rules/duplicate-id';
import { iframeTitle } from './rules/iframe-title';
import { tableStructure } from './rules/table-structure';
import { lang } from './rules/lang';
import { fontSize } from './rules/font-size';
import { visualFocusMismatch } from './rules/visual-focus-mismatch';

/** The built-in rule set, in display order. */
export const BUILTIN_RULES: Rule[] = [
  imgAlt,
  contrast,
  headings,
  linkName,
  formLabels,
  ariaValid,
  landmarks,
  tabindex,
  targetSize,
  mediaCaptions,
  iframeTitle,
  duplicateId,
  tableStructure,
  lang,
  fontSize,
  visualFocusMismatch,
];

/**
 * Mutable registry of rules. Seeded with the built-ins, then adjusted by
 * `opts.rules` (add/override), `opts.disableRules`, and `api.addRule`.
 */
export class RuleRegistry {
  private rules = new Map<string, Rule>();

  constructor(custom: Rule[] = [], disabled: string[] = []) {
    for (const r of BUILTIN_RULES) this.rules.set(r.id, { ...r });
    for (const r of custom) this.rules.set(r.id, r); // override or add
    for (const id of disabled) this.disable(id);
  }

  add(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  disable(id: string): void {
    const r = this.rules.get(id);
    if (r) r.enabled = false;
  }

  enable(id: string): void {
    const r = this.rules.get(id);
    if (r) r.enabled = true;
  }

  /** All rules (including disabled), in insertion order. */
  list(): Rule[] {
    return [...this.rules.values()];
  }

  /** Rules that will actually run. */
  active(): Rule[] {
    return this.list().filter((r) => r.enabled !== false);
  }
}
