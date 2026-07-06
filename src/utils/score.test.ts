import { describe, it, expect } from 'vitest';
import { score } from './score';
import type { Violation } from '../types';

const v = (severity: Violation['severity']): Violation => ({
  ruleId: 'x',
  severity,
  message: 'm',
});

describe('score', () => {
  it('is 100 with no findings', () => {
    expect(score([]).score).toBe(100);
  });
  it('counts by severity', () => {
    const b = score([v('error'), v('error'), v('warning'), v('info')]);
    expect(b.errors).toBe(2);
    expect(b.warnings).toBe(1);
    expect(b.infos).toBe(1);
  });
  it('errors hurt more than warnings which hurt more than info', () => {
    expect(score([v('error')]).score).toBeLessThan(score([v('warning')]).score);
    expect(score([v('warning')]).score).toBeLessThan(score([v('info')]).score);
  });
  it('stays within 0..100 for many findings', () => {
    const many = Array.from({ length: 100 }, () => v('error'));
    const s = score(many).score;
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
