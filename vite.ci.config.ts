import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// Separate build for the headless / CLI entry (`grapesjs-a11y-seo/ci`). Node
// target, ESM. linkedom + node builtins stay external, so the editor bundle
// (built by vite.config.ts) never pulls them in and remains zero-dep.
export default defineConfig({
  build: {
    outDir: 'dist/ci',
    emptyOutDir: true,
    target: 'node18',
    sourcemap: true,
    lib: {
      entry: { index: 'src/ci/index.ts', cli: 'src/ci/cli.ts' },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['linkedom', /^node:/],
      output: {
        entryFileNames: '[name].js',
        banner: (chunk) => (chunk.name === 'cli' ? '#!/usr/bin/env node' : ''),
      },
    },
  },
  plugins: [
    dts({
      rollupTypes: true,
      include: ['src/ci', 'src/types.ts'],
      exclude: ['src/**/*.test.ts'],
    }),
  ],
});
