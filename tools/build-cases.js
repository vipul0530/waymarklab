/* =========================================================
   Writes the eight work-<slug>.html concept pages from tools/cases.js,
   the card grid on index.html and the list on work.html.

   Run:  node tools/build-cases.js

   The generated HTML is the artifact. If you start editing the
   concept pages by hand, stop running this script.
   ========================================================= */

const fs = require("fs");
const path = require("path");
const CASES = require("./cases.js");

const ROOT = path.resolve(__dirname, "..");

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const first = s => { const m = String(s).match(/^[^.]+\./); return m ? m[0] : s; };
const pad = n => String(n).padStart(2, "0");

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
const GLYPH = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="17.4" width="18" height="4.2" rx="1.5"/><rect x="5.9" y="11.5" width="12.8" height="4.1" rx="1.5"/><rect x="8.4" y="5.8" width="8.8" height="3.9" rx="1.4"/></svg>';
const DOTS = '<span class="bar" aria-hidden="true"><i></i><i></i><i></i></span>';

function head(title, desc, canonical){
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="https://waymarklab.com/${canonical}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://waymarklab.com/${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="https://waymarklab.com/assets/graphics/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/graphics/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/graphics/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="assets/graphics/apple-touch-icon.png">
<link rel="stylesheet" href="css/fonts.css">
<link rel="stylesheet" href="css/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>`;
}

function header(active){
  const item = (href, label) =>
    `<a href="${href}"${active === label ? ' aria-current="page"' : ""}>${label}</a>`;
  const mob = (href, label) => `      <li><a href="${href}">${label}</a></li>`;
  return `
<header class="site-head">
  <div class="wrap">
    <a class="mark" href="index.html" aria-label="Waymark Lab, home">
      ${GLYPH}<b>Waymark Lab</b>
    </a>
    <nav class="site-nav" aria-label="Main">
      ${item("index.html#solutions", "Solutions")}
      ${item("index.html#how", "How it works")}
      ${item("work.html", "Examples")}
      ${item("index.html#pricing", "Pricing")}
      ${item("about.html", "About")}
    </nav>
    <a class="btn btn-head" href="contact.html">Book a free Process Review</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="navPanel">
      <svg class="open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      <svg class="close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      Menu
    </button>
  </div>
  <div class="nav-panel" id="navPanel">
    <ul>
${mob("index.html#solutions", "Solutions")}
${mob("index.html#how", "How it works")}
${mob("work.html", "Examples")}
${mob("index.html#pricing", "Pricing")}
${mob("about.html", "About")}
    </ul>
    <div class="wrap" style="padding-bottom:24px;"><a class="btn" href="contact.html">Book a free Process Review</a></div>
  </div>
</header>`;
}

function ctaBlock(){
  return `
<section class="cta" id="start">
  <div class="wrap">
    <h2>Before you hire another person to do it, talk to us.</h2>
    <p>Twenty minutes on a call. You will know what we would automate first, what it would cost and how long it would take.</p>
    <div class="actions">
      <a class="btn" href="contact.html">Book a free Process Review ${ARROW}</a>
      <a class="arrowlink" href="work.html">See example software ${ARROW}</a>
    </div>
  </div>
</section>`;
}

function footer(){
  return `
<footer class="site-foot">
  <div class="wrap">
    <div>
      <span class="mark">${GLYPH}<b>Waymark Lab</b></span>
      <p class="blurb">Custom business software and AI for growing companies.</p>
    </div>
    <div>
      <p class="foot-h">Solutions</p>
      <ul>
        <li><a href="capabilities.html#scheduling">Scheduling and dispatch</a></li>
        <li><a href="capabilities.html#billing">Billing and invoicing</a></li>
        <li><a href="capabilities.html#compliance">Compliance tracking</a></li>
        <li><a href="capabilities.html#inventory">Inventory and purchasing</a></li>
        <li><a href="capabilities.html#credentialing">Credentialing and records</a></li>
        <li><a href="capabilities.html#insights">AI process insights</a></li>
      </ul>
    </div>
    <div>
      <p class="foot-h">Company</p>
      <ul>
        <li><a href="work.html">Example software</a></li>
        <li><a href="index.html#how">How it works</a></li>
        <li><a href="index.html#pricing">Pricing</a></li>
        <li><a href="about.html">About</a></li>
      </ul>
    </div>
    <div>
      <p class="foot-h">Contact</p>
      <ul>
        <li><a href="contact.html">Book a free Process Review</a></li>
        <li><a href="mailto:info@waymarklab.com">info@waymarklab.com</a></li>
      </ul>
    </div>
  </div>
  <div class="foot-bottom">
    <div class="wrap">
      <p>&copy; 2026 Waymark Lab. Every screenshot on this site is an illustrative concept using invented sample data. No company shown is a client.</p>
      <p><a href="privacy.html">Privacy</a></p>
    </div>
  </div>
</footer>
<script src="js/site.js"></script>
</body>
</html>`;
}

/* ---------- a full width screen on a concept page ---------- */
function plate(c, s, i){
  return `
        <figure class="plate">
          <div class="shot-frame">
            ${DOTS}
            <img src="assets/shots/${s.img}.png" width="2880" height="1800" loading="lazy" decoding="async"
                 alt="${esc(c.tool + " software for " + c.company + ", screen " + i + " of three, " + s.name.toLowerCase() + ". " + first(s.cap))}">
          </div>
          <div class="plate-bar">
            <span class="num">${pad(i)} of 03</span>
            <span class="nm">${esc(s.name)}</span>
          </div>
          <figcaption>${esc(s.cap)}</figcaption>
        </figure>`;
}

/* ---------- card, used on index.html ---------- */
function card(c){
  const s = c.screens[0];
  return `        <article class="work-card">
          <a class="shot-frame" href="work-${c.slug}.html" tabindex="-1" aria-hidden="true">
            ${DOTS}
            <img src="assets/shots/${s.img}.png" width="2880" height="1800" loading="lazy" decoding="async"
                 alt="${esc(c.tool + " software for " + c.company + ", first screen, " + s.name.toLowerCase() + ". " + first(s.cap))}">
          </a>
          <div class="body">
            <h3><a href="work-${c.slug}.html">${esc(c.headline)}</a></h3>
            <p>${esc(c.cardThesis)}</p>
            <div class="foot">
              <span class="chip">Example: ${esc(c.sector)}</span>
              <a class="arrowlink" href="work-${c.slug}.html">See the concept ${ARROW}</a>
            </div>
          </div>
        </article>`;
}

/* ---------- featured row, used on work.html ---------- */
function feature(c){
  const s = c.screens[0];
  return `      <article class="feature">
        <a class="shot-frame" href="work-${c.slug}.html" tabindex="-1">
          ${DOTS}
          <img src="assets/shots/${s.img}.png" width="2880" height="1800" loading="lazy" decoding="async"
               alt="${esc(c.tool + " software for " + c.company + ", first screen, " + s.name.toLowerCase() + ". " + first(s.cap))}">
        </a>
        <div>
          <span class="lab">Example: ${esc(c.sector)}</span>
          <h2><a href="work-${c.slug}.html">${esc(c.headline)}</a></h2>
          <p class="stat num">${esc(c.stat)}</p>
          <p class="statcap">${esc(c.statcap)}</p>
          <p>${esc(c.cardThesis)}</p>
          <div class="acts">
            <a class="arrowlink" href="work-${c.slug}.html">See the concept ${ARROW}</a>
            <a class="arrowlink" href="${c.mockup}">Open the software ${ARROW}</a>
          </div>
        </div>
      </article>`;
}

/* ---------- a concept page ---------- */
function casePage(c, next){
  const title = `${c.headline} | Example Software | Waymark Lab`;
  return `${head(title, c.cardThesis, "work-" + c.slug + ".html")}
${header(null)}

<main id="main">
  <div class="wrap pagehead">
    <p class="crumb"><a href="work.html">${BACK} All examples</a></p>
    <p class="badge-note"><i></i>Concept, built to show the software behind a manual role. Not delivered client work.</p>
    <h1>${esc(c.headline)}.</h1>
    <p class="sub" style="margin-top:24px;">${esc(c.cardThesis)}</p>

    <div class="case-meta">
      <div><span class="k">The role</span><div class="v">${esc(c.role)}</div></div>
      <div><span class="k">Sector</span><div class="v">${esc(c.sector)}</div></div>
      <div><span class="k">Company in the software</span><div class="v">${esc(c.company)}</div></div>
      <div><span class="k">Their internal tool</span><div class="v">${esc(c.tool)}</div></div>
    </div>
  </div>

  <section class="section">
    <div class="wrap two-col">
      <div>
        <h2 style="font-size:24px;margin-bottom:16px;">The role you would hire for</h2>
        <p>${esc(c.posting)}</p>
      </div>
      <div>
        <h2 style="font-size:24px;margin-bottom:16px;">The manual process that implies</h2>
        <p>${esc(c.manual)}</p>
      </div>
    </div>
  </section>

  <section class="section brand on-dark">
    <div class="wrap two-col">
      <div>
        <span class="eyebrow">What the screens argue</span>
        <p class="stat num" style="font-size:52px;font-weight:700;color:#fff;line-height:1;margin-bottom:12px;">${esc(c.stat)}</p>
        <p style="max-width:34ch;">${esc(c.statcap)}</p>
      </div>
      <div>
        <p style="font-size:20px;line-height:1.55;color:#fff;">${esc(c.thesis)}</p>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="head-row">
        <div class="section-head">
          <h2>Three screens</h2>
          <p class="sub">Built to be read in a screenshot, then clicked through by whoever it lands with.</p>
        </div>
        <a class="btn" href="${c.mockup}">Open the working software ${ARROW}</a>
      </div>
      <div class="screens">
${c.screens.map((s, i) => plate(c, s, i + 1)).join("\n")}
      </div>
    </div>
  </section>

  <section class="section band">
    <div class="wrap">
      <div class="section-head">
        <h2>Detail</h2>
        <p class="sub">The three places where this stops being a report and starts being a tool.</p>
      </div>
      <div class="details-grid">
${c.details.map(d => `        <figure>
          <div class="shot-frame">
            ${DOTS}
            <img src="assets/shots/${d.img}.png" loading="lazy" decoding="async"
                 alt="${esc("Detail from the " + c.tool + " software. " + d.cap)}">
          </div>
          <figcaption>${esc(d.cap)}</figcaption>
        </figure>`).join("\n")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <h2>What it would take to build for real</h2>
        <p class="sub">The concept is a proposal about the shape of the work. This is the honest version of the rest.</p>
      </div>
      <div class="build">
${c.build.map(b => `        <div>
          <h3>${esc(b.h)}</h3>
          <p>${esc(b.p)}</p>
        </div>`).join("\n")}
      </div>
      <p class="small" style="margin-top:32px;max-width:72ch;">Every engagement is staffed with a dedicated team and a named project lead who works directly with the person who owns the process. The software above was built before anyone paid for anything, which is the point.</p>
      <p style="margin-top:24px;"><a class="arrowlink" href="work-${next.slug}.html">See another example ${ARROW}</a></p>
    </div>
  </section>
</main>
${ctaBlock()}
${footer()}
`;
}

/* ---------- write everything ---------- */
let written = 0;
CASES.forEach((c, i) => {
  const next = CASES[(i + 1) % CASES.length];
  fs.writeFileSync(path.join(ROOT, `work-${c.slug}.html`), casePage(c, next), "utf8");
  written++;
});

function inject(file, markup){
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return console.log(`  (skipped ${file}, not written yet)`);
  const src = fs.readFileSync(p, "utf8");
  const out = src.replace(
    /<!-- gallery:start -->[\s\S]*?<!-- gallery:end -->/,
    `<!-- gallery:start -->\n${markup}\n    <!-- gallery:end -->`
  );
  fs.writeFileSync(p, out, "utf8");
  console.log(`  injected into ${file}`);
}

inject("index.html", CASES.slice(0, 6).map(card).join("\n"));
inject("work.html", CASES.map(feature).join("\n"));

console.log(`${written} concept pages written`);
