import { describe, it, expect, vi, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './cli';

function tmpHtml(html: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'a11yci-'));
  const file = join(dir, 'page.html');
  writeFileSync(file, html);
  return file;
}

afterEach(() => vi.restoreAllMocks());

describe('cli run()', () => {
  it('exits non-zero on a page with errors', () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const file = tmpHtml('<img src="x.jpg">'); // img-alt error
    expect(run([file])).toBe(1);
  });

  it('exits zero on a clean page', () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const file = tmpHtml('<!doctype html><html lang="en"><body><main><h1>Hi</h1></main></body></html>');
    expect(run([file])).toBe(0);
  });

  it('--fail-on warning fails when only warnings exist', () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    // A titled-less iframe is a warning; no errors. lang missing is also a warning.
    const file = tmpHtml('<!doctype html><html lang="en"><body><main><h1>Hi</h1><iframe src="x"></iframe></main></body></html>');
    expect(run([file])).toBe(0); // default fail-on error → passes
    expect(run([file, '--fail-on', 'warning'])).toBe(1);
  });

  it('emits JSON with --json', () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s: string | Uint8Array) => {
      out.push(String(s));
      return true;
    });
    const file = tmpHtml('<img src="x.jpg">');
    run([file, '--json']);
    const parsed = JSON.parse(out.join(''));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].ruleId).toBeDefined();
    expect(parsed[0].file).toBe(file);
  });
});
