/*
  Captures every screen of every mockup at 1440 by 900, device scale factor 2,
  plus tight detail crops that carry the gallery.

  Run:  npm run shots
  Out:  assets/shots/<slug>-0N-<name>.png  and  <slug>-detail-<name>.png

  Nothing here touches the network. Pages load from the local file system and
  the script fails loudly if any page tries to reach a remote host.
*/

const { chromium } = require("playwright");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "shots");
const MAX_BYTES = 400 * 1024;

const MOCKUPS = [
  {
    slug: "receivables",
    file: "mockups/receivables.html",
    screens: ["stuck", "chase", "moved"],
    details: [
      { screen: 1, sel: ".headline", name: "split" },
      { screen: 1, sel: ".aging", name: "aging" },
      { screen: 2, sel: "#screen2 .panel", name: "drafted" }
    ]
  },
  {
    slug: "claims",
    file: "mockups/claims.html",
    screens: ["cycle", "attach", "statement"],
    details: [
      { screen: 1, sel: ".cutline", name: "countdown" },
      { screen: 1, sel: ".pattern", name: "pattern" },
      { screen: 2, sel: "#screen2 .panel", name: "photoread" }
    ]
  },
  {
    slug: "credentialing",
    file: "mockups/credentialing.html",
    screens: ["expiring", "packet", "payers"],
    details: [
      { screen: 1, sel: ".horizon", name: "horizon" },
      { screen: 2, sel: ".docread", name: "licenseread" },
      { screen: 3, sel: ".impact", name: "impact" }
    ]
  },
  {
    slug: "draw-control",
    file: "mockups/draw-control.html",
    screens: ["wall", "waivers", "readiness"],
    details: [
      { screen: 1, sel: ".headline", name: "held" },
      { screen: 2, sel: ".docread", name: "certread" },
      { screen: 3, sel: ".gates", name: "gates" }
    ]
  },
  {
    slug: "order-desk",
    file: "mockups/order-desk.html",
    screens: ["blocked", "variance", "reorder"],
    details: [
      { screen: 1, sel: ".blockline", name: "blocked" },
      { screen: 2, sel: ".vpat", name: "pattern" },
      { screen: 3, sel: "#poLines", name: "worksheet" }
    ]
  },
  {
    slug: "dispatch",
    file: "mockups/dispatch.html",
    screens: ["today", "unassigned", "tomorrow"],
    details: [
      { screen: 1, sel: ".board", name: "board" },
      { screen: 2, sel: "#suggList .sugg", name: "suggestion" },
      { screen: 3, sel: "#capList", name: "capacity" }
    ]
  },
  {
    slug: "quality-log",
    file: "mockups/quality-log.html",
    screens: ["open", "cause", "trail"],
    details: [
      { screen: 1, sel: ".queue", name: "stages" },
      { screen: 2, sel: "#whys", name: "fivewhy" },
      { screen: 3, sel: "#ready", name: "readiness" }
    ]
  },
  {
    slug: "spend-desk",
    file: "mockups/spend-desk.html",
    screens: ["approvals", "budget", "renewals"],
    details: [
      { screen: 1, sel: ".flagline", name: "overlap" },
      { screen: 2, sel: "#bud", name: "budget" },
      { screen: 3, sel: ".calgrid", name: "calendar" }
    ]
  }
];

function pad2(n){ return String(n).padStart(2, "0"); }

async function optimize(buffer, file){
  let out = await sharp(buffer).png({ palette: true, effort: 10, colours: 256, dither: 0 }).toBuffer();
  if (out.length > MAX_BYTES){
    out = await sharp(buffer).png({ palette: true, effort: 10, colours: 128, dither: 0 }).toBuffer();
  }
  if (out.length > MAX_BYTES){
    const meta = await sharp(buffer).metadata();
    out = await sharp(buffer).resize(Math.round(meta.width * 0.8))
      .png({ palette: true, effort: 10, colours: 128, dither: 0 }).toBuffer();
  }
  fs.writeFileSync(file, out);
  return out.length;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce"
  });

  const remote = [];
  await context.route("**/*", route => {
    const url = route.request().url();
    if (!url.startsWith("file:") && !url.startsWith("data:")){
      remote.push(url);
      return route.abort();
    }
    return route.continue();
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", e => consoleErrors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });

  let count = 0, biggest = 0, biggestName = "";

  // optional slug filter: node tools/capture.js receivables
  const only = process.argv[2];
  for (const m of (only ? MOCKUPS.filter(x => x.slug === only) : MOCKUPS)){
    const url = "file:///" + path.join(ROOT, m.file).replace(/\\/g, "/");
    await page.goto(url, { waitUntil: "load" });
    // the mockups load a webfont, so measure after it lands
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(350);

    for (let i = 1; i <= 3; i++){
      await page.click("#tab" + i);
      await page.waitForTimeout(140);
      const buf = await page.screenshot({ type: "png" });
      const file = path.join(OUT, `${m.slug}-${pad2(i)}-${m.screens[i - 1]}.png`);
      const size = await optimize(buf, file);
      count++;
      if (size > biggest){ biggest = size; biggestName = path.basename(file); }
      console.log(`  ${path.basename(file)}  ${(size / 1024).toFixed(0)} KB`);
    }

    for (const d of m.details){
      await page.click("#tab" + d.screen);
      await page.waitForTimeout(120);
      const loc = page.locator(d.sel).first();
      await loc.scrollIntoViewIfNeeded();
      await page.waitForTimeout(60);
      const buf = await loc.screenshot({ type: "png" });
      const file = path.join(OUT, `${m.slug}-detail-${d.name}.png`);
      const size = await optimize(buf, file);
      count++;
      if (size > biggest){ biggest = size; biggestName = path.basename(file); }
      console.log(`  ${path.basename(file)}  ${(size / 1024).toFixed(0)} KB`);
    }
    await page.click("#tab1");
  }

  await browser.close();

  console.log(`\n${count} images written to assets/shots`);
  console.log(`largest: ${biggestName} at ${(biggest / 1024).toFixed(0)} KB`);
  if (remote.length){
    console.log(`\nBLOCKED REMOTE REQUESTS (${remote.length}):`);
    [...new Set(remote)].forEach(u => console.log("  " + u));
    process.exitCode = 1;
  } else {
    console.log("no remote requests attempted by any mockup");
  }
  if (consoleErrors.length){
    console.log(`\nCONSOLE ERRORS (${consoleErrors.length}):`);
    consoleErrors.forEach(e => console.log("  " + e));
    process.exitCode = 1;
  } else {
    console.log("no console errors in any mockup");
  }
})();
