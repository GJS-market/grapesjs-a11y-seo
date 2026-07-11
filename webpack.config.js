/**
 * grapesjs-cli webpack override.
 *
 * grapesjs-cli builds a single UMD bundle (dist/index.js) with `grapesjs`
 * externalized. It calls this module with `{ config, webpack, pkg }` and uses
 * the returned config. We extend it to:
 *   1. Inject the plugin's CSS into the JS at runtime (style-loader) so the
 *      output is one self-contained file — no separate .css to link.
 *   2. Expose the UMD global as `window.grapesjsA11ySeo`, the name the GJS
 *      Market catalog and the WordPress builder resolve.
 *   3. Keep everything (including the bundled axe-core, pulled in via a dynamic
 *      import) in a single chunk, so `dist/` stays at exactly 3 files.
 *
 * (The single bundled dist/index.d.ts is produced by grapesjs-cli's
 * dts-bundle-generator; tsconfig.json uses noEmit so ts-loader emits no
 * per-module declaration tree.)
 */
module.exports = ({ config, webpack }) => {
  config.module.rules.push({
    test: /\.css$/,
    use: ['style-loader', 'css-loader'],
  });

  config.output.library = 'grapesjsA11ySeo';
  // Expose the default export (the plugin function) as the UMD global itself, so
  // `window.grapesjsA11ySeo` IS the function — not a { default } namespace object.
  config.output.libraryExport = 'default';

  config.plugins.push(new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }));

  return config;
};
