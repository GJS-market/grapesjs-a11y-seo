import { describe, it, expect } from 'vitest';
import type { AuditContext, Rule, RuleFinding, WalkNode } from '../../types';
import { contrastRatio } from '../contrast';
import { parseColor } from '../../utils/color';
import { imgAlt } from './img-alt';
import { headings } from './headings';
import { ariaValid } from './aria-valid';
import { duplicateId } from './duplicate-id';
import { linkName } from './link-name';
import { landmarks } from './landmarks';
import { contrast } from './contrast';
import { fontSize } from './font-size';
import { formLabels } from './form-labels';
import { mediaCaptions } from './media-captions';
import { tableStructure } from './table-structure';
import { iframeTitle } from './iframe-title';
import { tabindex } from './tabindex';
import { lang } from './lang';

/**
 * Build a synthetic AuditContext over a jsdom document so rule logic can be
 * tested deterministically, independent of GrapesJS' canvas quirks. The
 * component is a minimal stub — tests assert on messages/counts, not fixes.
 */
function makeCtx(html: string): AuditContext {
  document.body.innerHTML = html;
  const doc = document;
  const win = window;
  const nodes: WalkNode[] = Array.from(doc.body.querySelectorAll<HTMLElement>('*')).map((el) => ({
    el,
    component: stubComponent(el),
  }));
  const white = { r: 255, g: 255, b: 255, a: 1 };
  return {
    editor: {} as never,
    doc,
    win,
    walk: nodes,
    getBg: () => white,
    contrast: contrastRatio,
    style: (el) => win.getComputedStyle(el),
    zoom: 1,
    opts: { wcagLevel: 'AA', wcagVersion: '2.2' } as never,
    elToComp: new Map(),
    t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key),
  };
}

// A minimal Component stand-in — enough for rule bodies and fix helpers not to
// crash in jsdom (the real component API is exercised in e2e).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stubComponent(el: HTMLElement): any {
  const attrs: Record<string, string> = {};
  return {
    addAttributes: (a: Record<string, string>) => {
      Object.assign(attrs, a);
      for (const [k, v] of Object.entries(a)) el.setAttribute(k, v);
    },
    getAttributes: () => ({ ...attrs }),
    getStyle: () => ({}),
    setStyle: () => {},
    append: () => {},
    onAll: () => {},
    set: () => {},
    get: () => '',
  };
}

function run(rule: Rule, ctx: AuditContext): RuleFinding[] {
  return (rule.run(ctx) || []) as RuleFinding[];
}

describe('img-alt', () => {
  it('flags a missing alt and a filename-like alt', () => {
    const ctx = makeCtx('<img src="/a/hero.jpg"><img src="/b/photo.png" alt="photo">');
    const found = run(imgAlt, ctx);
    expect(found.some((f) => f.message.startsWith('img-alt.missing'))).toBe(true);
    expect(found.some((f) => f.message.startsWith('img-alt.filename'))).toBe(true);
  });
  it('passes a well-described image and a decorative one', () => {
    const ctx = makeCtx('<img src="x.jpg" alt="A cat on a sofa"><img src="y.jpg" alt="" role="presentation">');
    expect(run(imgAlt, ctx)).toHaveLength(0);
  });
});

describe('headings', () => {
  it('detects a skipped level and multiple h1', () => {
    const ctx = makeCtx('<h1>a</h1><h3>b</h3><h1>c</h1>');
    const found = run(headings, ctx);
    expect(found.some((f) => f.message.startsWith('headings.skip'))).toBe(true);
    expect(found.some((f) => f.message.startsWith('headings.multipleH1'))).toBe(true);
  });
  it('accepts a clean h1→h2→h3 outline', () => {
    const ctx = makeCtx('<h1>a</h1><h2>b</h2><h3>c</h3>');
    expect(run(headings, ctx)).toHaveLength(0);
  });
});

describe('aria-valid', () => {
  it('flags an invalid role and a dangling idref', () => {
    const ctx = makeCtx('<div role="buton"></div><div aria-labelledby="nope"></div>');
    const found = run(ariaValid, ctx);
    expect(found.some((f) => f.message.startsWith('aria-valid.badRole'))).toBe(true);
    expect(found.some((f) => f.message.startsWith('aria-valid.badRef'))).toBe(true);
  });
  it('accepts a valid role and a resolvable idref', () => {
    const ctx = makeCtx('<h2 id="t">Title</h2><div role="region" aria-labelledby="t"></div>');
    expect(run(ariaValid, ctx)).toHaveLength(0);
  });
});

describe('duplicate-id', () => {
  it('flags a repeated id and cites 1.3.1 under WCAG 2.2', () => {
    const ctx = makeCtx('<div id="x"></div><span id="x"></span><i id="y"></i>');
    const found = run(duplicateId, ctx);
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('x');
    expect(found[0].wcag).toBe('WCAG 1.3.1 (A)');
  });
});

describe('link-name', () => {
  it('flags empty and vague links', () => {
    const ctx = makeCtx('<a href="/x"></a><a href="/y">click here</a><a href="/z">Read our pricing guide</a>');
    const found = run(linkName, ctx);
    expect(found.some((f) => f.message.startsWith('link-name.empty'))).toBe(true);
    expect(found.some((f) => f.message.startsWith('link-name.vague'))).toBe(true);
    // The descriptive link should not be flagged for empty/vague.
    expect(found.filter((f) => f.message.startsWith('link-name.empty'))).toHaveLength(1);
  });
  it('accepts an icon link named by a nested img alt', () => {
    const ctx = makeCtx('<a href="/"><img src="i.svg" alt="Home"></a>');
    expect(run(linkName, ctx).some((f) => f.message.startsWith('link-name.empty'))).toBe(false);
  });
  it('still flags a link wrapping only a decorative (empty-alt) image', () => {
    const ctx = makeCtx('<a href="/"><img src="i.svg" alt=""></a>');
    expect(run(linkName, ctx).some((f) => f.message.startsWith('link-name.empty'))).toBe(true);
  });
});

describe('landmarks', () => {
  it('reports a missing main landmark', () => {
    const ctx = makeCtx('<div><p>content</p></div>');
    expect(run(landmarks, ctx).some((f) => f.message.startsWith('landmarks.noMain'))).toBe(true);
  });
  it('accepts a single main', () => {
    const ctx = makeCtx('<main><p>content</p></main>');
    expect(run(landmarks, ctx).some((f) => f.message.startsWith('landmarks.noMain'))).toBe(false);
  });
  it('flags multiple navs whose only "name" is their link text', () => {
    const ctx = makeCtx(
      '<main></main>' +
        '<nav><a href="/a">A</a><a href="/b">B</a></nav>' +
        '<nav><a href="/c">C</a><a href="/d">D</a></nav>',
    );
    const nav = run(landmarks, ctx).filter((f) => f.message.startsWith('landmarks.unnamedNav'));
    expect(nav).toHaveLength(2);
  });
  it('does not flag navs distinguished by aria-label', () => {
    const ctx = makeCtx(
      '<main></main>' +
        '<nav aria-label="Main"><a href="/a">A</a></nav>' +
        '<nav aria-label="Footer"><a href="/c">C</a></nav>',
    );
    expect(run(landmarks, ctx).some((f) => f.message.startsWith('landmarks.unnamedNav'))).toBe(false);
  });
});

describe('contrast', () => {
  it('flags low-contrast text and passes strong contrast', () => {
    const low = makeCtx('<p style="color:#aaaaaa">faint</p>'); // ~2.3:1 on white
    expect(run(contrast, low).some((f) => f.message.startsWith('contrast.low'))).toBe(true);
    const ok = makeCtx('<p style="color:#111111">bold</p>');
    expect(run(contrast, ok)).toHaveLength(0);
  });
});

describe('font-size', () => {
  it('flags sub-12px text', () => {
    const ctx = makeCtx('<p style="font-size:10px">tiny</p>');
    expect(run(fontSize, ctx).some((f) => f.message.startsWith('font-size.small'))).toBe(true);
  });
});

describe('form-labels', () => {
  it('flags an unlabeled input and accepts an aria-labelled one', () => {
    const bad = makeCtx('<input type="text">');
    expect(run(formLabels, bad).some((f) => f.message.startsWith('form-labels'))).toBe(true);
    const good = makeCtx('<input type="text" name="q" aria-label="Search">');
    expect(run(formLabels, good).some((f) => f.message.startsWith('form-labels.missing'))).toBe(false);
  });
});

describe('media-captions', () => {
  it('flags video/audio without a captions track', () => {
    const ctx = makeCtx('<video src="a.mp4"></video><audio src="b.mp3"></audio>');
    expect(run(mediaCaptions, ctx)).toHaveLength(2);
    const ok = makeCtx('<video src="a.mp4"><track kind="captions"></video>');
    expect(run(mediaCaptions, ok)).toHaveLength(0);
  });
});

describe('table-structure', () => {
  it('flags a data table without headers', () => {
    const ctx = makeCtx('<table><tr><td>a</td></tr><tr><td>b</td></tr></table>');
    expect(run(tableStructure, ctx).some((f) => f.message.startsWith('table-structure.noTh'))).toBe(true);
  });
});

describe('iframe-title', () => {
  it('flags an untitled iframe and accepts a titled one', () => {
    expect(run(iframeTitle, makeCtx('<iframe src="x"></iframe>'))).toHaveLength(1);
    expect(run(iframeTitle, makeCtx('<iframe src="x" title="Map"></iframe>'))).toHaveLength(0);
  });
});

describe('tabindex', () => {
  it('flags positive tabindex only', () => {
    const ctx = makeCtx('<button tabindex="5">a</button><button tabindex="0">b</button>');
    expect(run(tabindex, ctx)).toHaveLength(1);
  });
});

describe('lang', () => {
  it('flags a document without lang', () => {
    document.documentElement.removeAttribute('lang');
    const ctx = makeCtx('<p>hi</p>');
    expect(run(lang, ctx).some((f) => f.message.startsWith('lang.missing'))).toBe(true);
  });
});

// Keep a reference so unused-import lint stays quiet if a rule is trimmed.
export const _fixtures = { parseColor };
