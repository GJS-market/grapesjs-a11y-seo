// GrapesJS Studio demo mode: the same auditor attached to Studio SDK's editor.
//
// Studio needs a license key. Any key works on localhost, so we default to 'DEV'
// and allow ?studioLicense=KEY. On a public domain a real free SDK license
// (app.grapesjs.com) registered for that domain is required.
import createStudioEditor from '@grapesjs/studio-sdk';
import '@grapesjs/studio-sdk/style';
import a11ySeo from '../src/index.ts';
import { params, seedPages, assetList, a11yOpts } from './shared.js';

createStudioEditor({
  root: '#gjs',
  licenseKey: params.get('studioLicense') || 'DEV',
  project: {
    type: 'web',
    default: {
      pages: seedPages().map((p) => ({ name: p.name, component: p.component })),
    },
  },
  onReady: (editor) => {
    // Seed the same offline assets, then attach the auditor to Studio's editor.
    editor.AssetManager.add(assetList());
    a11ySeo(editor, a11yOpts);
    // Expose for tinkering / parity with the plain mode.
    window.editor = editor;
  },
});
