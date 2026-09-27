/*
  Two checks that are easy to get wrong by eye.

  1. Contrast. Every text colour in the site and in all eight mockups is
     measured against the surfaces it actually sits on, using the WCAG
     relative luminance formula. Body text needs 4.5:1, large text 3:1.
  2. Vocabulary. The old government technology site is gone. This greps the
     whole folder for anything that survived, and for singular first person.

  Run:  node tools/audit.js
*/

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

/* ---------------- contrast ---------------- */
function lum(hex){
  const h = hex.replace("#","");
  const v = [0,2,4].map(i => parseInt(h.slice(i,i+2),16) / 255)
    .map(c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4));
  return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2];
}
function ratio(a, b){
  const l1 = lum(a), l2 = lum(b);
  return ((Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05));
}
function vars(file){
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  const block = src.match(/:root\{([\s\S]*?)\}/);
  const out = {};
  if (!block) return out;
  block[1].replace(/--([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g, (_, k, v) => { out[k] = v; return ""; });
  return out;
}

const CHECKS = [];
function check(where, label, fg, bg, min){
  if (!fg || !bg) return;
  const r = ratio(fg, bg);
  CHECKS.push({ where, label, fg, bg, r, min, pass: r >= min });
}

/* the site */
{
  const v = vars("css/site.css");
  check("site","body text on white", v.ink, v.paper, 4.5);
  check("site","secondary text on white", v["ink-2"], v.paper, 4.5);
  check("site","captions on white", v["ink-3"], v.paper, 4.5);
  check("site","secondary text on the grey band", v["ink-2"], v.band, 4.5);
  check("site","captions on the grey band", v["ink-3"], v.band, 4.5);
  check("site","form placeholder text", "#6E7789", v.paper, 4.5);
  check("site","accent links on white", v.accent, v.paper, 4.5);
  check("site","accent links on the grey band", v.accent, v.band, 4.5);
  /* accent text is never placed on accent-tint: that pair measures 4.42:1,
     so the tinted band uses brand for links and chips instead */
  check("site","inverted button label on its hover tint", v["brand-2"], v["accent-tint"], 4.5);
  check("site","body text on the tinted CTA band", v.ink, v["accent-tint"], 4.5);
  check("site","secondary text on the tinted CTA band", v["ink-2"], v["accent-tint"], 4.5);
  check("site","white on the primary button", v.paper, v.brand, 4.5);
  check("site","white on the button hover", v.paper, v["brand-2"], 4.5);
  check("site","brand text on a chip", v.brand, v["accent-tint"], 4.5);
  check("site","white text on the green section", v["on-dark"], v.brand, 4.5);
  check("site","secondary text on the green section", v["on-dark-2"], v.brand, 4.5);
  check("site","mint accent on the green section", v.mint, v.brand, 4.5);
  check("site","footer text on the footer", v["on-dark-2"], v.brand, 4.5);
  check("site","footer bottom text", v["on-dark-2"], v["brand-2"], 4.5);
  check("site","secondary link on the tinted CTA band", v.brand, v["accent-tint"], 4.5);
  check("site","placeholder text on its tint", "#7A5210", v["warn-tint"], 4.5);
  check("site","amber chip text in the dashboard", "#8A5B12", v["warn-tint"], 4.5);
}

/* the mockups */
const MOCKS = fs.readdirSync(path.join(ROOT,"mockups")).filter(f => f.endsWith(".html"));
MOCKS.forEach(f => {
  const v = vars("mockups/" + f);
  const name = f.replace(".html","");
  check(name,"body text on the ground", v.fg, v.ground, 4.5);
  check(name,"body text on a panel", v.fg, v.panel, 4.5);
  check(name,"secondary text on a panel", v["fg-2"], v.panel, 4.5);
  check(name,"secondary text on the tinted panel", v["fg-2"], v["panel-2"], 4.5);
  check(name,"labels on a panel", v["fg-3"], v.panel, 4.5);
  check(name,"labels on the tinted panel", v["fg-3"], v["panel-2"], 4.5);
  check(name,"labels on the ground", v["fg-3"], v.ground, 4.5);
  check(name,"accent figure on a panel, large", v.accent, v.panel, 3);
  check(name,"accent text on its tint", v["accent-ink"] || v.accent, v["accent-tint"], 4.5);
  check(name,"button label on the accent", "#FFFFFF", v.accent, 4.5);
});

/* ---------------- vocabulary ---------------- */
const SKIP = new Set(["_archive_old_site","node_modules",".git",".netlify","assets","tradingbot","wardrobe"]);
function walk(dir, out = []){
  for (const e of fs.readdirSync(dir, { withFileTypes:true })){
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(html|css|js|txt|xml|md|json)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const OLD = ["government","counties","county","CalFresh","CalSAWS","Medi-Cal","CalWORKs","SAR-7","PBIF",
             "Outreach Tracker","Mosaic","Sentinel","benefits","agency","agencies","charcoal","public benefits"];
const SINGULAR = [" I ","I'm","I am"," my "," me ","founder","sole proprietor","solo","one man","independent consultant"];

const files = walk(ROOT).filter(f =>
  !/tools[\\/]/.test(f) && !/waymarklab-rebuild-prompt\.md$/.test(f) && !/package(-lock)?\.json$/.test(f));

/* only what a visitor can actually read: no tags, no script, no style, no comments */
function visible(src, file){
  if (!/\.html$/i.test(file)) return "";
  return src
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ");
}

const hits = [];
files.forEach(f => {
  const src = visible(fs.readFileSync(f, "utf8"), f);
  const rel = path.relative(ROOT, f);
  src.split(/\r?\n/).forEach((line, i) => {
    OLD.forEach(w => {
      const re = new RegExp("\\b" + w.replace(/[-/]/g, "\\$&") + "\\b", "i");
      if (re.test(line)) hits.push(["old vocabulary", w, rel + ":" + (i+1), line.trim().slice(0,110)]);
    });
    SINGULAR.forEach(w => {
      if (line.toLowerCase().includes(w.toLowerCase())) hits.push(["singular first person", w.trim(), rel + ":" + (i+1), line.trim().slice(0,110)]);
    });
  });
});

/* the old vocabulary must not survive anywhere, including class names,
   file names and comments, so that pass reads the raw bytes */
const rawHits = [];
files.forEach(f => {
  const src = fs.readFileSync(f, "utf8");
  const rel = path.relative(ROOT, f);
  src.split(/\r?\n/).forEach((line, i) => {
    OLD.forEach(w => {
      const re = new RegExp("\\b" + w.replace(/[-/]/g, "\\$&") + "\\b", "i");
      if (re.test(line)) rawHits.push([w, rel + ":" + (i+1), line.trim().slice(0,110)]);
    });
  });
});
walk(ROOT).forEach(f => {
  const rel = path.relative(ROOT, f);
  OLD.forEach(w => { if (new RegExp(w, "i").test(path.basename(f))) rawHits.push([w, "file name: " + rel, ""]); });
});

/* ---------------- report ---------------- */
const fails = CHECKS.filter(c => !c.pass);
console.log("CONTRAST, measured\n");
let cur = "";
CHECKS.forEach(c => {
  if (c.where !== cur){ cur = c.where; console.log("  " + cur); }
  console.log(`    ${c.r.toFixed(2).padStart(6)}:1  min ${c.min}   ${c.fg} on ${c.bg}   ${c.label}${c.pass ? "" : "   FAILS"}`);
});
console.log(`\n  ${CHECKS.length} pairs measured, ${fails.length} below the minimum`);

console.log("\nVOCABULARY\n");
if (hits.length){
  hits.forEach(h => console.log(`  ${h[0]}: "${h[1]}"  ${h[2]}\n      ${h[3]}`));
  console.log(`\n  ${hits.length} hits`);
} else {
  console.log("  visible copy: no hits for old vocabulary or singular first person on any page");
}
if (rawHits.length){
  console.log("\n  raw scan, including class names, comments and file names:");
  rawHits.forEach(h => console.log(`    "${h[0]}"  ${h[1]}\n        ${h[2]}`));
} else {
  console.log("  raw scan of every file, class name and file name: no old vocabulary anywhere");
}
if (fails.length || hits.length) process.exitCode = 1;
