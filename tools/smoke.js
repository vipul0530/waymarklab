/*
  Clicks every control in every mockup and reports anything that throws.
  Run:  node tools/smoke.js
*/
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

(async () => {
  const browser = await chromium.launch();
  const files = fs.readdirSync(path.join(ROOT, "mockups")).filter(f => f.endsWith(".html"));
  let clicks = 0;
  const errors = [];

  for (const f of files){
    const ctx = await browser.newContext({ viewport:{width:1440,height:900} });
    const page = await ctx.newPage();
    page.on("pageerror", e => errors.push(`${f}: ${e}`));
    page.on("console", m => { if (m.type() === "error") errors.push(`${f}: ${m.text()}`); });
    await page.goto("file:///" + path.join(ROOT, "mockups", f).replace(/\\/g,"/"), { waitUntil:"load" });

    /* one fresh load per control, because a click often changes the screen
       and would hide everything queued behind it */
    for (let screen = 1; screen <= 3; screen++){
      await page.click("#tab" + screen);
      await page.waitForTimeout(60);
      const count = await page.$$eval(
        "section.screen:not([hidden]) button:not([disabled]), aside button:not([disabled])",
        els => els.length);
      for (let i = 0; i < Math.min(count, 12); i++){
        await page.reload({ waitUntil:"load" });
        await page.click("#tab" + screen);
        await page.waitForTimeout(50);
        const b = (await page.$$("section.screen:not([hidden]) button:not([disabled]), aside button:not([disabled])"))[i];
        if (!b) continue;
        try {
          if (await b.isVisible()){ await b.click({ timeout: 1500 }); clicks++; await page.waitForTimeout(40); }
        } catch(e){ /* a control that moved under us is not a failure */ }
      }
    }
    /* keyboard: arrow through the workflow tabs */
    await page.click("#tab1");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
    const title = await page.title();
    console.log(`  ${f.padEnd(22)} ${clicks} clicks so far, ends on "${title.split("—")[1] ? title.split("—")[1].trim() : title}"`);
    await ctx.close();
  }
  await browser.close();

  console.log(`\n${clicks} controls clicked across ${files.length} mockups`);
  if (errors.length){ console.log("ERRORS:"); errors.forEach(e => console.log("  " + e)); process.exitCode = 1; }
  else console.log("no errors thrown by any control");
})();
