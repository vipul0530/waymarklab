/* Strips tags, comments, scripts, styles and attribute values, then looks for
   the characters and words that must never appear in visible copy. */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const BAD = [["hyphen","-"],["en dash","–"],["em dash","—"],["minus","−"],
             ["government",/government/i],["public sector",/public sector/i],
             ["county",/\bcount(y|ies)\b/i],["case study",/case stud(y|ies)/i]];
let hits = 0;
for (const f of fs.readdirSync(ROOT).filter(x => x.endsWith(".html"))){
  let s = fs.readFileSync(path.join(ROOT,f),"utf8");
  s = s.replace(/<!--[\s\S]*?-->/g,"").replace(/<(script|style)[\s\S]*?<\/\1>/gi,"");
  const alts = [...s.matchAll(/\salt="([^"]*)"/g)].map(m=>m[1]).join(" ");
  const visible = s.replace(/<[^>]+>/g," ") + " " + alts;
  for (const [name, pat] of BAD){
    const found = typeof pat === "string" ? visible.split(pat).length - 1 : (visible.match(new RegExp(pat.source,"gi"))||[]).length;
    if (found){ console.log(`  ${f}: ${found} x ${name}`); hits += found; }
  }
}
console.log(hits ? `  ${hits} total` : "  none: no dashes, no old vocabulary, no case study language in visible copy");
