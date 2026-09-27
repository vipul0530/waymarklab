/*
  Records the hero background video: our own software being used.

  No stock footage, no external service. Playwright drives the mockups and
  records the screen to a webm that ships in assets/video/.

  Run:  npm run video
*/
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "video");
const TMP = path.join(ROOT, "assets", "video", "_raw");
const SIZE = { width: 1280, height: 800 };

const file = f => "file:///" + path.join(ROOT, "mockups", f).replace(/\\/g, "/");

/* a short pass through three of the eight, in the order they read best */
const SCRIPT = [
  { f:"dispatch.html",    steps:[["#tab1",2600],["#tab2",2400],["#tab3",2000]] },
  { f:"receivables.html", steps:[["#tab1",2400],["#tab2",2400]] },
  { f:"claims.html",      steps:[["#tab1",2600],["#tab2",2200]] },
  { f:"draw-control.html",steps:[["#tab1",2400]] }
];

(async () => {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: TMP, size: SIZE }
  });
  const page = await context.newPage();

  for (const m of SCRIPT){
    await page.goto(file(m.f), { waitUntil: "load" });
    for (const [sel, hold] of m.steps){
      await page.click(sel);
      /* a slow drift down the screen so the frame is never completely still */
      await page.evaluate(async ms => {
        const start = performance.now();
        const dist = 260;
        return new Promise(done => {
          const step = () => {
            const t = Math.min(1, (performance.now() - start) / ms);
            window.scrollTo(0, dist * t);
            t < 1 ? requestAnimationFrame(step) : done();
          };
          step();
        });
      }, hold);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(120);
    }
  }

  await page.close();
  await context.close();
  await browser.close();

  const raw = fs.readdirSync(TMP).filter(f => f.endsWith(".webm"))[0];
  if (!raw){ console.log("no video was produced"); process.exitCode = 1; return; }
  const dest = path.join(OUT, "software.webm");
  fs.copyFileSync(path.join(TMP, raw), dest);
  fs.rmSync(TMP, { recursive: true, force: true });
  const kb = fs.statSync(dest).size / 1024;
  console.log(`assets/video/software.webm  ${(kb / 1024).toFixed(2)} MB`);
  if (kb > 6000) console.log("  that is large for a background video, consider trimming the script");
})();
