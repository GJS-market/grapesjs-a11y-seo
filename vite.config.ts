import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'grapesjsA11ySeo',
      formats: ['es', 'umd'],
      // ESM for `import`, UMD (.umd.cjs) for `require`. The browser UMD (.umd.js,
      // with axe-core inlined) is emitted by a second pass — vite.browser.config.ts.
      fileName: (format) =>
        format === 'es' ? 'grapesjs-a11y-seo.js' : 'grapesjs-a11y-seo.umd.cjs',
    },
    sourcemap: true,
    cssCodeSplit: false,
    rollupOptions: {
      // axe-core is an optional peer, dynamically imported — never bundle it.
      external: ['grapesjs', 'axe-core'],
      output: {
        globals: { grapesjs: 'grapesjs', 'axe-core': 'axe' },
        assetFileNames: 'grapesjs-a11y-seo.[ext]',
      },
    },
  },
  plugins: [
    dts({
      rollupTypes: true,
      insertTypesEntry: true,
      include: ['src'],
      exclude: ['src/**/*.test.ts', 'src/ci/**'],
    }),
  ],
});
