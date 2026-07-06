// Plain GrapesJS demo mode: the auditor running inside a bare grapesjs.init().
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import a11ySeo from '../src/index.ts';
import { seedPages, assetList, a11yOpts } from './shared.js';

const editor = grapesjs.init({
  container: '#gjs',
  height: '100%',
  fromElement: false,
  storageManager: false,
  // Keep the canvas offline so page frames load instantly (no external CDN).
  canvas: { styles: [], scripts: [] },
  assetManager: { assets: assetList() },
  pageManager: { pages: seedPages() },
  plugins: [(ed) => a11ySeo(ed, a11yOpts)],
});

// Expose for tinkering / e2e.
window.editor = editor;
