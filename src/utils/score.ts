import type { Severity, Violation } from '../types';

/** Per-severity penalty weights used to compute the 0..100 score. */
const WEIGHTS: Record<Severity, number> = {
  error: 10,
  warning: 3,
  info: 1,
};

export interface ScoreBreakdown {
  score: number;
  errors: number;
  warnings: number;
  infos: number;
}

/**
 * Compute an at-a-glance 0..100 score from a set of violations. A page with no
 * findings scores 100; each finding subtracts a severity-weighted amount, with
 * diminishing returns so a very broken page floors at 0 rather than going wild.
 */
export function score(violations: Violation[]): ScoreBreakdown {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  let penalty = 0;
  for (const v of violations) {
    penalty += WEIGHTS[v.severity];
    if (v.severity === 'error') errors++;
    else if (v.severity === 'warning') warnings++;
    else infos++;
  }
  // Saturating curve: 100 - 100 * (penalty / (penalty + K)).
  const K = 40;
  const value = penalty === 0 ? 100 : Math.round(100 * (K / (penalty + K)));
  return { score: Math.max(0, Math.min(100, value)), errors, warnings, infos };
}
