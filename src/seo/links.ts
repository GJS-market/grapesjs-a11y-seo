/**
 * Opt-in external-link checker. Makes network requests, so it's off by default
 * (`seo.checkExternalLinks`). Requests are throttled (bounded concurrency) with
 * a per-request timeout. The link *collection* is pure and unit-tested; the
 * fetching is isolated so it can be skipped or mocked.
 */

/** Collect unique absolute http(s) links from a document. */
export function externalLinks(doc: Document): string[] {
  const out = new Set<string>();
  for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
    const href = a.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) out.add(href);
  }
  return [...out];
}

export interface LinkResult {
  url: string;
  ok: boolean;
  status?: number;
}

/** Check a single URL with a timeout, treating network errors as broken. */
async function checkOne(url: string, timeoutMs: number): Promise<LinkResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // HEAD is cheapest; many servers reject it, so fall back to GET.
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal }).catch(() => null);
    if (!res || res.status >= 400) {
      res = await fetch(url, { method: 'GET', signal: controller.signal }).catch(() => null);
    }
    return { url, ok: !!res && res.status < 400, status: res?.status };
  } catch {
    return { url, ok: false };
  } finally {
    clearTimeout(timer);
  }
}

/** Check all URLs with bounded concurrency. Returns only the broken ones. */
export async function checkExternalLinks(
  urls: string[],
  opts: { concurrency?: number; timeoutMs?: number } = {},
): Promise<LinkResult[]> {
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const timeoutMs = opts.timeoutMs ?? 5000;
  const broken: LinkResult[] = [];
  let i = 0;
  async function worker(): Promise<void> {
    while (i < urls.length) {
      const url = urls[i++];
      const r = await checkOne(url, timeoutMs);
      if (!r.ok) broken.push(r);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()));
  return broken;
}
