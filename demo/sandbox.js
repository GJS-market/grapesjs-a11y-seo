// Demo entry / router. Renders the top switcher state and boots the selected
// editor mode. Reload-based so the two very different editors never coexist.
//
//   ?mode=studio → GrapesJS Studio SDK   (default: plain GrapesJS)
import { params } from './shared.js';

const mode = params.get('mode') === 'studio' ? 'studio' : 'plain';

// Reflect the active mode on the top switcher and wire the buttons to reload
// with ?mode=… while preserving the other demo params (engine/stress/pages/…).
for (const btn of document.querySelectorAll('[data-mode]')) {
  const target = btn.getAttribute('data-mode');
  btn.classList.toggle('is-active', target === mode);
  btn.setAttribute('aria-pressed', String(target === mode));
  btn.addEventListener('click', () => {
    if (target === mode) return;
    const next = new URLSearchParams(location.search);
    next.set('mode', target);
    location.assign(`${location.pathname}?${next.toString()}`);
  });
}

// Boot the chosen mode. Dynamic import keeps the other editor's bundle out of
// the page entirely.
if (mode === 'studio') {
  import('./studio.js');
} else {
  import('./plain.js');
}
