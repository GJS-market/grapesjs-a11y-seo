import { defineConfig } from 'vite';

// Second build pass: the browser / CDN UMD bundle.
//
// Emits dist/grapesjs-a11y-seo.umd.js — the file marketplaces and the WordPress
// builder load as a single <script>, resolving `window.grapesjsA11ySeo`. Unlike
// the npm ESM/CJS builds (vite.config.ts), axe-core is NOT externalized here: it
// is inlined so a plain <script> is self-contained with no bare `require`/import
// of a missing dep. Only GrapesJS stays external (read from `window.grapesjs`).
export default defineConfig({
  build: {
    // Do NOT empty dist — pass 1 (vite.config.ts) already produced the ESM/CJS
    // entries, CSS, and types; this pass only adds the browser UMD file.
    emptyOutDir: false,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/index.ts',
      name: 'grapesjsA11ySeo',
      formats: ['umd'],
      fileName: () => 'grapesjs-a11y-seo.umd.js',
    },
    rollupOptions: {
      external: ['grapesjs'],
      output: {
        globals: { grapesjs: 'grapesjs' },
        assetFileNames: 'grapesjs-a11y-seo.[ext]',
        // Required for UMD: it cannot code-split, so the dynamic import('axe-core')
        // must be inlined into the single output file.
        inlineDynamicImports: true,
      },
    },
  },
});
