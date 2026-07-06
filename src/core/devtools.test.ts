import { describe, it, expect } from 'vitest';
import { findDevtoolsMount } from './devtools';

describe('findDevtoolsMount', () => {
  it('returns null when no devtools panel is present', () => {
    document.body.innerHTML = '<div class="something-else"></div>';
    expect(findDevtoolsMount(document)).toBeNull();
  });

  it('returns null when the root exists but tabs/content are missing', () => {
    document.body.innerHTML = '<div class="gjs-dt-root"></div>';
    expect(findDevtoolsMount(document)).toBeNull();
  });

  it('locates the tab bar and content when devtools is present', () => {
    document.body.innerHTML =
      '<div class="gjs-dt-root"><div class="gjs-dt-tabs"></div><div class="gjs-dt-content"></div></div>';
    const mount = findDevtoolsMount(document);
    expect(mount).not.toBeNull();
    expect(mount!.tabsBar.className).toContain('gjs-dt-tabs');
    expect(mount!.content.className).toContain('gjs-dt-content');
  });
});
