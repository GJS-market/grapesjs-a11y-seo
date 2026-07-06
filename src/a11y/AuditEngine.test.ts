import { describe, it, expect } from 'vitest';
import { getIdleScheduler } from './AuditEngine';

/**
 * Regression for BUG #1 (critical): the idle scheduler must never leave the
 * audit promise unsettled. Before the fix, `requestIdleCallback` was called with
 * no timeout, so a window whose rIC never fires (starvation) wedged the auditor.
 */
describe('getIdleScheduler', () => {
  it('resolves via the timeout fallback when requestIdleCallback never fires', async () => {
    // A window whose rIC accepts the callback but NEVER invokes it.
    const win = { requestIdleCallback: () => {} } as unknown as Window;
    const idle = getIdleScheduler(win);
    // Must still settle (setTimeout race) rather than hang forever.
    await expect(Promise.race([idle(), rejectAfter(2000)])).resolves.toBeUndefined();
  });

  it('resolves when requestIdleCallback is unavailable', async () => {
    const win = {} as unknown as Window;
    const idle = getIdleScheduler(win);
    await expect(Promise.race([idle(), rejectAfter(2000)])).resolves.toBeUndefined();
  });

  it('resolves once even if rIC fires after the timeout already settled it', async () => {
    // rIC fires late; the promise must not double-resolve or throw.
    let cb: (() => void) | undefined;
    const win = { requestIdleCallback: (fn: () => void) => (cb = fn) } as unknown as Window;
    const idle = getIdleScheduler(win);
    await idle();
    expect(() => cb?.()).not.toThrow();
  });
});

function rejectAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('idle() hung')), ms));
}
