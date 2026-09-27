/* Full page captures at 375 and 1440 for a human look. Run: node tools/review.js */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname,"..");
const OUT = path.join(ROOT,"assets","review");
fs.mkdirSync(OUT,{recursive:true});
const pages = fs.readdirSync(ROOT).filter(f=>f.endsWith(".html"));
(async () => {
  const b = await chromium.launch();
  for (const w of [1440, 375]){
    const c = await b.newContext({ viewport:{width:w,height:900}, deviceScaleFactor:1, reducedMotion:"reduce" });
    const p = await c.newPage();
    for (const f of pages){
      await p.goto(`http://localhost:4321/${f}`, { waitUntil:"networkidle" });
      // fullPage capture will not trigger lazy images, so force them in
      await p.evaluate(async () => {
        document.querySelectorAll("img[loading=lazy]").forEach(i => i.loading = "eager");
        await document.fonts.ready;
      });
      await p.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
      await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(OUT, `${f.replace(".html","")}-${w}.png`), fullPage:true });
    }
    await c.close();
  }
  await b.close();
  console.log(`captured ${pages.length*2} full page shots in assets/review`);
})();
