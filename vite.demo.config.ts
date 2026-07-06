import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Build the demo as a static site (for Netlify), separate from the library build
// in vite.config.ts. Root is the demo/ folder so index.html is served at "/";
// env files (e.g. VITE_STUDIO_LICENSE) are loaded from the repo root.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: 'demo',
  envDir: repoRoot,
  build: {
    outDir: fileURLToPath(new URL('./demo-dist', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    // Bundle ALL CSS into one upfront file. With code-splitting on, Vite
    // mis-injects the async chunks' CSS (the 1 MB Studio SDK stylesheet never
    // loads, leaving Studio mode unstyled). One file is simplest and correct
    // for a demo; both modes get every style regardless of which one boots.
    cssCodeSplit: false,
  },
});
