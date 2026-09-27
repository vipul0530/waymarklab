/* Every internal href on the site must resolve to a file, and every
   #fragment must resolve to an id inside that file. Run: node tools/links.js */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith(".html"));
const ids = {};
for (const p of pages){
  const s = fs.readFileSync(path.join(ROOT,p),"utf8");
  ids[p] = new Set([...s.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
}
let bad = 0, checked = 0;
for (const p of pages){
  const s = fs.readFileSync(path.join(ROOT,p),"utf8");
  for (const m of s.matchAll(/href="([^"]+)"/g)){
    const h = m[1];
    if (/^(https?:|mailto:|tel:)/.test(h)) continue;
    checked++;
    const [file, frag] = h.split("#");
    const target = file || p;
    if (!fs.existsSync(path.join(ROOT, target))) { console.log(`BROKEN  ${p} -> ${h} (no such file)`); bad++; continue; }
    if (frag && target.endsWith(".html") && !ids[target].has(frag)) { console.log(`BROKEN  ${p} -> ${h} (no such id)`); bad++; }
  }
}
console.log(`${checked} internal links across ${pages.length} pages, ${bad} broken`);
