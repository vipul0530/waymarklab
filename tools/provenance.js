/* =========================================================
   Provenance check.

   Two questions, answered separately:

   1. Does anything a visitor can see carry vocabulary traceable to
      public sector or benefits administration work?
   2. Does the folder Netlify would publish contain anything that is
      not meant to be public?

   Run before any deploy:  node tools/provenance.js
   Exit code 1 means do not deploy.
   ========================================================= */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

/* Vocabulary that would tie this site to public sector or benefits work.
   Kept deliberately wide. False positives are cheap, a miss is not. */
const TERMS = [
  // sector
  "government", "public sector", "municipal", "civic", "\\bagenc(y|ies)\\b",
  "\\bcount(y|ies)\\b", "department of", "\\bstate of\\b",
  // programs and systems
  "CalSAWS", "CalFresh", "CalWORKs", "Medi-Cal", "Medicaid", "\\bSNAP\\b",
  "\\bTANF\\b", "\\bWIC\\b", "\\bEBT\\b", "\\bIHSS\\b", "\\bCDSS\\b",
  "\\bDPSS\\b", "\\bHHSA\\b", "\\bMEDS\\b", "\\bIEVS\\b", "SAR-?7", "QR-?7",
  // casework vocabulary
  "eligibility", "case ?worker", "caseload", "redetermin", "public assistance",
  "social services", "\\bwelfare\\b", "entitlement", "overpayment",
  "program integrity", "general relief", "general assistance", "child welfare",
  "foster care", "\\bclaimant\\b", "\\bbenefits\\b",
  // prior product names
  "PBIF", "Outreach Tracker", "Mosaic", "Sentinel", "Continuum",
];

/* Terms that are legitimate commercial vocabulary and would otherwise
   trip the scan. Each one needs a reason. */
const ALLOWED = [
  // board recertification of a physician, standard private credentialing
  { term: "recertificat", where: "mockups/credentialing.html" },
];

const RX = new RegExp(TERMS.join("|"), "i");

/* Folders a visitor should never be able to fetch. */
const PRIVATE = ["_archive_old_site", "node_modules", "tools", ".git", ".claude", ".netlify"];

const TEXT = /\.(html|css|js|json|svg|txt|xml|md)$/i;

function walk(dir, skip, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (skip.some(s => rel === s || rel.startsWith(s + "/"))) continue;
    if (e.isDirectory()) walk(full, skip, out);
    else if (TEXT.test(e.name)) out.push(rel);
  }
  return out;
}

let problems = 0;

/* ---------- 1. what a visitor reads ---------- */
console.log("\n--- vocabulary in everything a visitor can reach ---");
const visible = walk(ROOT, PRIVATE);
let dirty = 0;
for (const rel of visible) {
  const body = fs.readFileSync(path.join(ROOT, rel), "utf8");
  body.split("\n").forEach((line, n) => {
    const m = line.match(RX);
    if (!m) return;
    if (ALLOWED.some(a => new RegExp(a.term, "i").test(m[0]) && rel === a.where)) return;
    console.log(`  HIT  ${rel}:${n + 1}  "${m[0]}"`);
    dirty++;
  });
  // a file name can leak as loudly as its contents
  if (RX.test(path.basename(rel))) {
    console.log(`  HIT  file name: ${rel}`);
    dirty++;
  }
}
console.log(dirty
  ? `  ${dirty} hit(s). Every one has to be explained or removed.`
  : `  clean: ${visible.length} files, nothing traceable to public sector work`);
problems += dirty;

for (const a of ALLOWED) {
  console.log(`  allowed: "${a.term}" in ${a.where}`);
}

/* ---------- 2. what would actually ship ---------- */
console.log("\n--- what Netlify would publish ---");
let cfg = "";
try { cfg = fs.readFileSync(path.join(ROOT, "netlify.toml"), "utf8"); } catch (e) { /* none */ }
const pub = (cfg.match(/publish\s*=\s*"([^"]+)"/) || [, "."])[1];
console.log(`  publish directory: "${pub}"`);

if (pub === "." || pub === "./") {
  for (const d of PRIVATE) {
    const full = path.join(ROOT, d);
    if (!fs.existsSync(full)) continue;
    const hits = d === "_archive_old_site"
      ? walk(full, []).filter(f => RX.test(fs.readFileSync(path.join(ROOT, f), "utf8"))).length
      : 0;
    const note = hits ? `  <-- contains ${hits} file(s) with public sector vocabulary` : "";
    console.log(`  EXPOSED  ${d}/${note}`);
    problems += hits ? 1 : 0;
  }
  console.log("  A redirect hides a path. It does not stop the files being uploaded.");
  console.log("  Anything not meant to be public belongs outside the publish directory.");
}

console.log(problems ? `\n${problems} problem(s). Do not deploy.\n` : "\nNothing blocking.\n");
process.exit(problems ? 1 : 0);
