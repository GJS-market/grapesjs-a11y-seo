// Shared demo fixtures + plugin options, used by both the plain-GrapesJS and the
// GrapesJS Studio demo modes so they exercise the auditor on identical content.
//
// Query params (honoured in both modes):
//   ?engine=axe        → use the optional axe-core engine
//   ?stress=1500       → generate N extra components (perf / chunked-audit check)
//   ?pages=12          → generate N extra pages (multi-page / All-pages audit check)
//   ?studioLicense=KEY → Studio SDK license key (mode=studio only)

export const params = new URLSearchParams(location.search);
export const engine = params.get('engine') === 'axe' ? 'axe' : 'builtin';
export const stress = Math.max(0, parseInt(params.get('stress') || '0', 10) || 0);
export const extraPages = Math.min(50, Math.max(0, parseInt(params.get('pages') || '0', 10) || 0));

// A page seeded with accessibility problems on purpose, covering every rule:
//  - <img> with no alt, and one whose alt duplicates the filename
//  - heading level jump (h1 -> h3) and a second h1
//  - low-contrast text, tiny 10px text
//  - empty link and a "click here" link
//  - unlabeled input (placeholder only), input with no name
//  - positive tabindex, iframe with no title
//  - <video>/<audio> without captions, a bad ARIA role
//  - a data <table> without <th>/<caption>, a too-small icon button
export const BAD_PAGE = `
  <div style="padding:24px;font-family:sans-serif">
    <h1>Welcome</h1>
    <h3>Sub-heading that skips h2</h3>
    <h1>Second top-level heading</h1>

    <p style="color:#aaa">This paragraph has poor contrast against the white background.</p>
    <p style="font-size:10px">This microscopic legal text is only 10px.</p>

    <img src="/photos/hero-banner.jpg" />
    <img src="/photos/team.jpg" alt="team" />

    <p>
      <a href="#">click here</a> to learn nothing, or use this
      <a href="#"></a> empty link.
    </p>

    <div role="buton">Typo'd ARIA role</div>

    <nav>
      <a href="/">Home</a> <a href="/products">Products</a> <a href="/pricing">Pricing</a>
    </nav>
    <nav>
      <a href="/terms">Terms</a> <a href="/privacy">Privacy</a>
    </nav>

    <form>
      <input type="text" placeholder="Your email" />
      <input type="text" id="firstname" />
      <button tabindex="5">Submit</button>
      <button style="width:16px;height:16px;padding:0" aria-label="x">×</button>
    </form>

    <video src="/media/clip.mp4" width="320" height="180"></video>
    <audio src="/media/podcast.mp3"></audio>

    <table>
      <tr><td>Q1</td><td>100</td></tr>
      <tr><td>Q2</td><td>200</td></tr>
    </table>

    <iframe src="about:blank" width="300" height="150"></iframe>
  </div>
`;

export const GOOD_PAGE = `
  <main style="padding:24px;font-family:sans-serif">
    <h1>About us</h1>
    <p>We build accessible websites.</p>
    <img src="/photos/office.jpg" alt="Our office in Berlin" />
    <a href="/contact">Contact the team</a>
  </main>
`;

// Each generated page carries a couple of page-level issues (missing alt, an
// unnamed nav) so every page yields at least one finding — used to exercise the
// multi-page "All pages" audit (and its race handling) with many pages.
function generatedPages(n) {
  const pages = [];
  for (let i = 1; i <= n; i++) {
    pages.push({
      id: `gen-${i}`,
      name: `Page ${i}`,
      component: `
        <div style="padding:24px;font-family:sans-serif">
          <h1>Generated page ${i}</h1>
          <img src="/gen/${i}.jpg" />
          <nav><a href="/a">A</a> <a href="/b">B</a></nav>
        </div>`,
    });
  }
  return pages;
}

function stressMarkup(n) {
  let s = '<div style="padding:24px">';
  for (let i = 0; i < n; i++) {
    // Alternate a couple of violations so the audit has real work to do.
    s += i % 3 === 0 ? `<img src="/g/${i}.jpg">` : `<p style="color:#bbb">Row ${i}</p>`;
  }
  return s + '</div>';
}

// The full page set (Home + About + generated), with the stress markup folded
// into Home when ?stress is set. Shape: [{ id, name, component }].
export function seedPages() {
  return [
    { id: 'home', name: 'Home', component: stress ? BAD_PAGE + stressMarkup(stress) : BAD_PAGE },
    { id: 'about', name: 'About', component: GOOD_PAGE },
    ...generatedPages(extraPages),
  ];
}

// A self-contained SVG data-URI image, so the demo Asset Manager works offline.
function swatch(color, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="${color}"/><text x="160" y="100" font-family="sans-serif" font-size="28" fill="#fff" text-anchor="middle">${label}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// Offline images so the SEO tab's image pickers (JSON-LD image/logo, OG image)
// have something to choose in both modes.
export function assetList() {
  return [
    swatch('#5b8cff', 'Hero'),
    swatch('#22c55e', 'Team'),
    swatch('#f59e0b', 'Logo'),
    swatch('#ec4899', 'Banner'),
  ];
}

// Plugin options shared by both demo modes.
export const a11yOpts = {
  enabled: true,
  theme: 'dark',
  engine,
  wcagVersion: '2.2',
  seo: { baseUrl: 'https://example.com' },
};
