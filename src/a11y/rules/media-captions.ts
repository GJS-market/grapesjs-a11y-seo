import type { Component } from 'grapesjs';
import type { Rule, RuleFinding } from '../../types';
import { applyAppend, resolveTarget } from '../quickfix';

/** 1.2.2 Captions — prerecorded video/audio needs a captions track. */
export const mediaCaptions: Rule = {
  id: 'media-captions',
  title: 'Media captions',
  severity: 'warning',
  wcag: 'WCAG 1.2.2 (A)',
  helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html',
  run(ctx) {
    const out: RuleFinding[] = [];
    for (const { component, el } of ctx.walk) {
      if (el.tagName !== 'VIDEO' && el.tagName !== 'AUDIO') continue;
      // GrapesJS' video view wraps the media in a <div>, so a fixed <track>
      // child may live in the component model but not in the media element's
      // live DOM — check both so the finding clears after the fix.
      const domTrack = !!el.querySelector('track[kind="captions"], track[kind="subtitles"]');
      const modelTrack = componentHasTrack(resolveTarget(el, component));
      if (!domTrack && !modelTrack) {
        out.push({
          message: ctx.t('media-captions.missing', { tag: el.tagName.toLowerCase() }),
          component,
          el,
          fixLabel: '<track>',
          fix: () => applyAppend(el, component, '<track kind="captions" label="Captions">', 'track'),
        });
      }
    }
    return out;
  },
};

function componentHasTrack(target: Component | null): boolean {
  if (!target) return false;
  let found = false;
  target.onAll((c: Component) => {
    if ((c.get('tagName') || '').toLowerCase() === 'track') found = true;
  });
  return found;
}
