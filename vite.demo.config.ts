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
  },
});
