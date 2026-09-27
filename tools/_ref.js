/* Temporary: study a reference site's layout and colour system. Deleted after use. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const OUT = path.resolve(__dirname, "..", "assets", "ref");

const PAGES = [
  ["home", "https://atomicobject.com/", 7],
  ["services", "https://atomicobject.com/services", 3]
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
  });
  const page = await ctx.newPage();

  for (const [name, url, slices] of PAGES){
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    } catch(e){ console.log(name + ": " + e.message); continue; }
    await page.waitForTimeout(2500);

    const info = await page.evaluate(() => {
      const seen = {};
      const bump = (k, v) => { if (!k) return; seen[v] = seen[v] || {}; seen[v][k] = (seen[v][k] || 0) + 1; };
      document.querySelectorAll("body *").forEach(el => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return;
        bump(s.color, "color");
        if (s.backgroundColor !== "rgba(0, 0, 0, 0)") bump(s.backgroundColor, "bg");
        bump(s.fontFamily.split(",")[0].replace(/["']/g,""), "font");
      });
      const top = (kind, n) => Object.entries(seen)
        .filter(([k,v]) => v[kind])
        .sort((a,b) => b[1][kind] - a[1][kind]).slice(0, n).map(([k,v]) => k + " x" + v[kind]);
      const h = [...document.querySelectorAll("h1,h2,h3")].slice(0, 22).map(el => {
        const s = getComputedStyle(el);
        return el.tagName + " " + s.fontSize + "/" + s.lineHeight + " w" + s.fontWeight +
               " ls" + s.letterSpacing + " " + s.color + "  “" + el.textContent.trim().slice(0, 70) + "”";
      });
      const sections = [...document.querySelectorAll("body > * , main > *, main > * > section")].slice(0, 30).map(el => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return el.tagName.toLowerCase() + "." + (el.className||"").toString().split(" ")[0].slice(0,26) +
               " h" + Math.round(r.height) + " bg" + s.backgroundColor;
      });
      const body = getComputedStyle(document.body);
      return {
        bodyFont: body.fontFamily, bodySize: body.fontSize, bodyColor: body.color, bodyBg: body.backgroundColor,
        colors: top("color", 10), bgs: top("bg", 10), fonts: top("font", 6),
        headings: h, sections,
        containerWidths: [...new Set([...document.querySelectorAll("div,section")].map(e => {
          const r = e.getBoundingClientRect(); return r.width > 600 && r.width < 1441 ? Math.round(r.width) : 0;
        }).filter(Boolean))].sort((a,b)=>b-a).slice(0,8)
      };
    });
    fs.writeFileSync(path.join(OUT, name + ".json"), JSON.stringify(info, null, 2));
    console.log("\n===== " + name + " =====");
    console.log(JSON.stringify(info, null, 1).slice(0, 3600));

    for (let i = 0; i < slices; i++){
      await page.evaluate(y => window.scrollTo(0, y), i * 860);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT, `${name}-${i}.png`) });
    }
  }
  await browser.close();
})();
