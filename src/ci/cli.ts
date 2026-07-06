import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { runAuditHeadless, type HeadlessOptions } from './headless';
import type { Severity, Violation } from '../types';

/**
 * `grapesjs-a11y-seo-ci <files...>` — audit exported HTML in CI / pre-deploy.
 * Flags: `--json` (machine output), `--fail-on <error|warning|info>` (exit-code
 * threshold, default `error`), `--level AA|AAA`, `--version 2.0|2.1|2.2`.
 * Exits non-zero when a finding at or above the threshold is found.
 */
export function run(argv: string[]): number {
  const files: string[] = [];
  const opts: HeadlessOptions = {};
  let json = false;
  let failOn: Severity = 'error';

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--fail-on') failOn = argv[++i] as Severity;
    else if (a === '--level') opts.wcagLevel = argv[++i] as HeadlessOptions['wcagLevel'];
    else if (a === '--version') opts.wcagVersion = argv[++i] as HeadlessOptions['wcagVersion'];
    else if (a === '--help' || a === '-h') {
      printUsage();
      return 0;
    } else files.push(a);
  }

  if (!files.length) {
    printUsage();
    return 2;
  }

  const rank: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  const all: Array<Violation & { file: string }> = [];
  for (const file of files) {
    let html = '';
    try {
      html = readFileSync(file, 'utf8');
    } catch {
      process.stderr.write(`Cannot read ${file}\n`);
      return 2;
    }
    for (const v of runAuditHeadless(html, opts)) all.push({ ...v, file });
  }

  if (json) {
    process.stdout.write(JSON.stringify(all, null, 2) + '\n');
  } else {
    printHuman(all);
  }

  const failed = all.some((v) => rank[v.severity] <= rank[failOn]);
  return failed ? 1 : 0;
}

function printHuman(all: Array<Violation & { file: string }>): void {
  const byFile = new Map<string, Array<Violation & { file: string }>>();
  for (const v of all) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }
  for (const [file, list] of byFile) {
    process.stdout.write(`\n${file}\n`);
    for (const v of list) {
      process.stdout.write(`  [${v.severity}] ${v.ruleId}${v.wcag ? ` (${v.wcag})` : ''}: ${v.message}\n`);
    }
  }
  const errors = all.filter((v) => v.severity === 'error').length;
  const warnings = all.filter((v) => v.severity === 'warning').length;
  const infos = all.filter((v) => v.severity === 'info').length;
  process.stdout.write(`\n${errors} errors · ${warnings} warnings · ${infos} info across ${byFile.size} file(s)\n`);
}

function printUsage(): void {
  process.stdout.write(
    'Usage: grapesjs-a11y-seo-ci <files...> [--json] [--fail-on error|warning|info] [--level AA|AAA] [--version 2.0|2.1|2.2]\n',
  );
}

// Auto-run only when executed as the bin (not when imported by a test).
function isMain(): boolean {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
  } catch {
    return false;
  }
}
if (isMain()) process.exit(run(process.argv.slice(2)));
