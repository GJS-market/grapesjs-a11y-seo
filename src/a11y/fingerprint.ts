import type { Violation } from '../types';

/**
 * Stable identity for a finding, used to persist "won't fix" (baseline)
 * decisions across audits. Keyed by rule + page + the owning component's id or
 * selector (NOT the message, which can vary, e.g. a contrast ratio).
 */
export function fingerprint(v: Violation): string {
  const comp = v.component as unknown as
    | { getId?: () => string; getSelectorsString?: () => string }
    | undefined
    | null;
  const sel = comp?.getId?.() || comp?.getSelectorsString?.() || v.el?.tagName || '';
  return `${v.ruleId}::${v.pageId || ''}::${sel}`;
}
