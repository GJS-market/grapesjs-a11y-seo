import type { Panel } from './Panel';

/**
 * Best-effort integration with `grapesjs-devtools`: if its panel is present in
 * the DOM, mount our UI as an extra tab inside it. devtools exposes no public
 * mount API, so this relies on its DOM structure and degrades gracefully — if
 * anything is missing we return false and the caller keeps our own floating
 * panel. This path is intentionally untested in CI (no devtools dependency).
 */

interface DevtoolsMount {
  tabsBar: HTMLElement;
  content: HTMLElement;
  root: HTMLElement;
}

const ROOT_SELECTORS = ['.gjs-dt-root', '.gjs-devtools', '[data-gjs-devtools]'];
const TABS_SELECTORS = ['.gjs-dt-tabs', '.gjs-dt-header .gjs-dt-tabs', '[data-dt-tabs]'];
const CONTENT_SELECTORS = ['.gjs-dt-content', '.gjs-dt-body', '.gjs-dt-panes'];

/** Locate the devtools panel's tab bar + content area, or null if absent. */
export function findDevtoolsMount(doc: Document): DevtoolsMount | null {
  const root = queryFirst(doc, ROOT_SELECTORS);
  if (!root) return null;
  const tabsBar = queryFirst(root, TABS_SELECTORS);
  const content = queryFirst(root, CONTENT_SELECTORS);
  if (!tabsBar || !content) return null;
  return { tabsBar, content, root };
}

function queryFirst(scope: Document | HTMLElement, selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = scope.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

/**
 * Try to mount the panel inside devtools. Returns true on success. On success
 * the panel is embedded in a devtools tab; on failure the caller should keep
 * the standalone panel.
 */
export function mountPanelInDevtools(
  doc: Document,
  panel: Panel,
  label: string,
): boolean {
  const mount = findDevtoolsMount(doc);
  if (!mount) return false;
  try {
    const pane = doc.createElement('div');
    pane.className = 'gjs-as-dt-pane';
    mount.content.appendChild(pane);
    panel.setEmbeddedHost(pane);

    const tab = doc.createElement('button');
    tab.className = 'gjs-dt-tab gjs-as-dt-tab';
    tab.textContent = label;
    tab.addEventListener('click', () => panel.show());
    mount.tabsBar.appendChild(tab);
    return true;
  } catch {
    return false;
  }
}
