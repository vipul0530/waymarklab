/* =========================================================
   SEO and structure audit.

   Titles, descriptions, canonicals, heading order, image
   attributes and asset weight, for every public page.

   Run:  node tools/seo.js
   Exit 1 if anything fails.
   ========================================================= */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://waymarklab.com";
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith(".html")).sort();

const one = (s, re) => { const m = s.match(re); return m ? m[1].trim() : null; };
const all = (s, re) => [...s.matchAll(re)].map(m => m[1].trim());

let problems = [];
const seenTitle = {}, seenDesc = {};

console.log("\n--- titles and descriptions ---");
for (const f of pages) {
  const s = fs.readFileSync(path.join(ROOT, f), "utf8");
  const title = one(s, /<title>([\s\S]*?)<\/title>/);
  const desc = one(s, /<meta name="description" content="([^"]*)"/);
  const ogT = one(s, /<meta property="og:title" content="([^"]*)"/);
  const ogD = one(s, /<meta property="og:description" content="([^"]*)"/);
  const canon = one(s, /<link rel="canonical" href="([^"]*)"/);

  if (!title) problems.push(`${f}: no title`);
  if (!desc) problems.push(`${f}: no meta description`);
  if (title && title.length > 60) problems.push(`${f}: title ${title.length} chars, over 60`);
  if (desc && desc.length > 155) problems.push(`${f}: description ${desc.length} chars, over 155`);
  if (title && seenTitle[title]) problems.push(`${f}: title duplicates ${seenTitle[title]}`);
  if (desc && seenDesc[desc]) problems.push(`${f}: description duplicates ${seenDesc[desc]}`);
  if (title) seenTitle[title] = f;
  if (desc) seenDesc[desc] = f;
  if (ogT && ogT !== title) problems.push(`${f}: og:title does not match title`);
  if (ogD && desc && ogD.length > 155) problems.push(`${f}: og:description over 155`);

  // the home page is served at the bare domain, not /index.html
  const want = f === "index.html" ? `${SITE}/` : `${SITE}/${f}`;
  if (!canon) problems.push(`${f}: no canonical`);
  else if (canon !== want) problems.push(`${f}: canonical is ${canon}, expected ${want}`);

  console.log(`  ${f.padEnd(26)} title ${String(title ? title.length : 0).padStart(3)}  desc ${String(desc ? desc.length : 0).padStart(3)}`);
}

console.log("\n--- headings ---");
for (const f of pages) {
  const s = fs.readFileSync(path.join(ROOT, f), "utf8");
  const body = s.slice(s.indexOf("<body"));
  const hs = all(body, /<h([1-4])[\s>]/g).map(Number);
  const h1 = hs.filter(n => n === 1).length;
  if (h1 !== 1) problems.push(`${f}: ${h1} h1 elements, expected exactly 1`);
  let prev = 0, jumps = 0;
  for (const n of hs) { if (prev && n > prev + 1) jumps++; prev = n; }
  if (jumps) problems.push(`${f}: ${jumps} heading level jump(s)`);
  console.log(`  ${f.padEnd(26)} h1 ${h1}  levels ${hs.join("")}`.slice(0, 96));
}

console.log("\n--- images ---");
let imgs = 0, bad = 0;
for (const f of pages) {
  const s = fs.readFileSync(path.join(ROOT, f), "utf8");
  for (const tag of s.match(/<img\b[^>]*>/g) || []) {
    imgs++;
    const missing = [];
    if (!/\salt="[^"]+"/.test(tag)) missing.push("alt");
    if (!/\swidth="\d+"/.test(tag)) missing.push("width");
    if (!/\sheight="\d+"/.test(tag)) missing.push("height");
    if (missing.length) { problems.push(`${f}: img missing ${missing.join(", ")} -> ${tag.slice(0, 70)}`); bad++; }
  }
}
console.log(`  ${imgs} image tag(s), ${bad} with missing attributes`);

console.log("\n--- asset weight ---");
// checks and review hold verification captures, not site assets
const SCRATCH = new Set(["checks", "review"]);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (SCRATCH.has(e.name) ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const A = path.join(ROOT, "assets");
if (fs.existsSync(A)) {
  const heavy = walk(A).map(p => ({ p: path.relative(ROOT, p).replace(/\\/g, "/"), kb: Math.round(fs.statSync(p).size / 1024) }))
    .filter(o => o.kb > 300).sort((a, b) => b.kb - a.kb);
  if (!heavy.length) console.log("  nothing in assets over 300 KB");
  for (const h of heavy) {
    const isVideo = /\.(mp4|webm|mov)$/i.test(h.p);
    console.log(`  ${isVideo ? "VIDEO " : "IMAGE "} ${h.p.padEnd(46)} ${h.kb} KB`);
    if (!isVideo) problems.push(`${h.p} is ${h.kb} KB, over 300`);
  }
}

console.log("\n--- sitemap ---");
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
// the bare domain entry is the home page
const locs = all(sm, /<loc>([^<]+)<\/loc>/g).map(u => u.replace(SITE + "/", "") || "index.html");
for (const f of pages) {
  const noindex = /content="noindex/.test(fs.readFileSync(path.join(ROOT, f), "utf8"));
  if (!locs.includes(f) && !noindex) problems.push(`sitemap: missing ${f}`);
  if (locs.includes(f) && noindex) problems.push(`sitemap: lists ${f}, which is noindex`);
}
for (const l of locs) if (!pages.includes(l)) problems.push(`sitemap: lists ${l}, which does not exist`);
const dates = [...new Set(all(sm, /<lastmod>([^<]+)<\/lastmod>/g))];
console.log(`  ${locs.length} url(s), lastmod ${dates.join(", ")}`);

console.log("\n--- problems ---");
if (!problems.length) console.log("  none\n");
else { problems.forEach(p => console.log("  " + p)); console.log(`\n  ${problems.length} problem(s)\n`); }
process.exit(problems.length ? 1 : 0);
