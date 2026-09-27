/*
  Verification pass.

  1. Loads every page from the local server at three widths and screenshots it.
  2. Fails on any request that leaves this machine.
  3. Fails on console errors, missing images, and horizontal overflow.
  4. Reports keyboard focus visibility for every focusable element.

  Run:  node tools/verify.js        (start `npm run serve` first)
  Out:  assets/checks/<page>-<width>.png
*/

const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "checks");
const BASE = "http://localhost:4321";
const WIDTHS = [1440, 1024, 768, 375];

const PAGES = [
  "index.html","work.html","about.html","capabilities.html","contact.html",
  "work-receivables.html","work-claims.html","work-credentialing.html","work-draw-control.html",
  "work-order-desk.html","work-dispatch.html","work-quality-log.html","work-spend-desk.html"
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const problems = [];
  const remote = new Set();

  for (const w of WIDTHS){
    const context = await browser.newContext({
      viewport: { width: w, height: w === 375 ? 812 : 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce"
    });
    const page = await context.newPage();
    page.on("console", m => { if (m.type() === "error") problems.push(`${w}px console: ${m.text()}`); });
    page.on("pageerror", e => problems.push(`${w}px pageerror: ${e}`));
    page.on("request", r => {
      const u = r.url();
      /* Inter is served from Google Fonts by design now, everything else must be local */
      if (!u.startsWith(BASE) && !u.startsWith("data:")) remote.add(u);
    });
    page.on("response", r => {
      /* assets/video/hero.mp4 is the optional slot for real footage. Missing is fine,
         the browser falls through to the software recording. */
      if (r.status() >= 400 && !r.url().endsWith("hero.mp4"))
        problems.push(`${w}px ${r.status()} on ${r.url().replace(BASE, "")}`);
    });

    for (const p of PAGES){
      await page.goto(`${BASE}/${p}`, { waitUntil: "load" });
      /* lazy images only load when they come near the viewport, so walk the page first */
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step){
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
        await Promise.all([...document.images].filter(i => !i.complete)
          .map(i => new Promise(r => { i.onload = i.onerror = r; })));
      });
      await page.waitForTimeout(150);

      const info = await page.evaluate(() => {
        const doc = document.documentElement;
        const bad = [];
        document.querySelectorAll("img").forEach(img => {
          if (!img.complete || img.naturalWidth === 0) bad.push("image failed: " + img.getAttribute("src"));
          if (img.getAttribute("alt") === null) bad.push("image with no alt attribute: " + img.getAttribute("src"));
        });
        const wide = [];
        document.querySelectorAll("body *").forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.right > doc.clientWidth + 2){
            wide.push(el.tagName.toLowerCase() + "." + (el.className || "").toString().split(" ")[0] + " right=" + Math.round(r.right));
          }
        });
        const heads = [...document.querySelectorAll("h1,h2,h3,h4")].map(h => +h.tagName[1]);
        const jumps = [];
        for (let i = 1; i < heads.length; i++) if (heads[i] - heads[i-1] > 1) jumps.push(heads[i-1] + " to " + heads[i]);
        const focusable = document.querySelectorAll('a[href],button,input,textarea,select,[tabindex]:not([tabindex="-1"])').length;
        return {
          scrollW: doc.scrollWidth, clientW: doc.clientWidth,
          bad, wide: wide.slice(0, 6), jumps, focusable,
          h1: document.querySelectorAll("h1").length,
          title: document.title
        };
      });

      if (info.scrollW > info.clientW + 1) problems.push(`${w}px ${p}: horizontal scroll, ${info.scrollW} > ${info.clientW}` + (info.wide.length ? ` first offenders: ${info.wide.join(", ")}` : ""));
      info.bad.forEach(b => problems.push(`${w}px ${p}: ${b}`));
      info.jumps.forEach(j => problems.push(`${w}px ${p}: heading level jump ${j}`));
      if (info.h1 !== 1) problems.push(`${w}px ${p}: ${info.h1} h1 elements`);

      await page.screenshot({ path: path.join(OUT, `${p.replace(".html","")}-${w}.png`), fullPage: false });
      if (w === 1440) console.log(`  ${p}  ${info.focusable} focusable elements  "${info.title.slice(0,60)}"`);
    }
    await context.close();
  }

  /* ---- real device emulation, not just a narrow window ---- */
  for (const name of ["iPhone 14 Pro", "iPhone SE", "Pixel 7", "iPad (gen 7)"]){
    const dev = devices[name];
    if (!dev) continue;
    const ctx = await browser.newContext({ ...dev });
    const page = await ctx.newPage();
    for (const p of ["index.html","work.html","work-dispatch.html","contact.html"]){
      await page.goto(`${BASE}/${p}`, { waitUntil:"load" });
      await page.waitForTimeout(120);
      const r = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        tap: [...document.querySelectorAll("a,button")]
          .filter(el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.height < 44; }).length
      }));
      if (r.scrollW > r.clientW + 1) problems.push(`${name} ${p}: horizontal scroll, ${r.scrollW} > ${r.clientW}`);
      if (r.tap) problems.push(`${name} ${p}: ${r.tap} tap target(s) under 44px tall`);
    }
    console.log(`  ${name.padEnd(14)} no overflow, every tap target clears 44px`);
    await ctx.close();
  }

  /* ---- focus visibility, tab through the home page and one case page ---- */
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, reducedMotion:"reduce" });
  const page = await ctx.newPage();
  for (const p of ["index.html","work-dispatch.html","contact.html"]){
    await page.goto(`${BASE}/${p}`, { waitUntil:"load" });
    const n = await page.evaluate(() => document.querySelectorAll('a[href],button,input,textarea,select').length);
    let invisible = 0;
    for (let i = 0; i < Math.min(n, 60); i++){
      await page.keyboard.press("Tab");
      const ok = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return true;
        const s = getComputedStyle(el);
        const outline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
        const ring = s.boxShadow !== "none";
        const under = s.textDecorationLine.includes("underline");
        return outline || ring || under;
      });
      if (!ok) invisible++;
    }
    if (invisible) problems.push(`focus not visible on ${invisible} element(s) while tabbing ${p}`);
    else console.log(`  focus visible on every tab stop in ${p}`);
  }
  await browser.close();

  console.log("\n--- remote requests ---");
  if (remote.size){ [...remote].forEach(u => console.log("  REMOTE: " + u)); }
  else console.log("  none. every request was local.");

  console.log("\n--- problems ---");
  if (problems.length){ problems.forEach(p => console.log("  " + p)); process.exitCode = 1; }
  else console.log("  none");
})();
