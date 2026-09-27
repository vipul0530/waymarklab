/*
  Renders the Open Graph card at 1200 x 630.
  Run:  npm run og      (needs `npm run serve` running)
  Out:  assets/graphics/og.png  and  assets/graphics/og.svg (source)
*/
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const TMP = path.join(ROOT, "assets", "graphics", "_og.html");

const HTML = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;}
  body{width:1200px;height:630px;background:#171C44;overflow:hidden;position:relative;
       font-family:Inter,-apple-system,"Segoe UI",Arial,sans-serif;color:#fff;}
  .pad{padding:64px 64px 0;position:relative;z-index:2;}
  .mark{display:flex;align-items:center;gap:14px;margin-bottom:72px;}
  .mark svg{width:38px;height:38px;}
  .mark b{font-size:27px;font-weight:700;letter-spacing:-.01em;}
  h1{font-size:60px;font-weight:700;line-height:1.1;letter-spacing:-.02em;max-width:15ch;}
  .sub{margin-top:28px;font-size:23px;font-weight:400;color:#C6CBE8;max-width:34ch;line-height:1.45;}
  .mock{position:absolute;right:-70px;bottom:-140px;width:620px;background:#fff;border-radius:16px;
        box-shadow:0 30px 70px rgba(0,0,0,.34);overflow:hidden;z-index:1;}
  .bar{display:flex;gap:7px;padding:13px 16px;background:#F7F7F5;border-bottom:1px solid #E3E1DC;}
  .bar i{width:10px;height:10px;border-radius:50%;background:#D7D5D0;}
  .in{padding:20px 22px;}
  .k{display:flex;gap:12px;margin-bottom:16px;}
  .k div{flex:1;border:1px solid #E3E1DC;border-radius:9px;padding:11px 13px;}
  .k b{display:block;font-size:26px;color:#1F2421;letter-spacing:-.02em;}
  .k span{font-size:12px;color:#6B6F6C;}
  .ch{display:flex;align-items:flex-end;gap:9px;height:74px;margin-bottom:16px;}
  .ch i{flex:1;background:#3A49C7;border-radius:4px 4px 0 0;}
  .ch i:last-child{background:#171C44;}
  .rw{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid #E3E1DC;font-size:13px;color:#1F2421;}
  .cp{font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;background:#ECEEFC;color:#171C44;}
  .cp.w{background:#FFF8EC;color:#8A5B12;}
</style></head><body>
  <div class="pad">
    <span class="mark">
      <svg viewBox="0 0 24 24" fill="#fff"><rect x="3" y="17.4" width="18" height="4.2" rx="1.5"/><rect x="5.9" y="11.5" width="12.8" height="4.1" rx="1.5"/><rect x="8.4" y="5.8" width="8.8" height="3.9" rx="1.4"/></svg>
      <b>WAYMARK LAB</b>
    </span>
    <h1>Automate the manual work before you hire another person to do it.</h1>
    <p class="sub">Custom business software and AI for growing companies.</p>
  </div>
  <div class="mock">
    <div class="bar"><i></i><i></i><i></i></div>
    <div class="in">
      <div class="k">
        <div><b>42</b><span>Jobs scheduled today</span></div>
        <div><b>17</b><span>Invoices ready to send</span></div>
        <div><b>5</b><span>Documents expiring</span></div>
      </div>
      <div class="ch"><i style="height:44%"></i><i style="height:62%"></i><i style="height:52%"></i><i style="height:78%"></i><i style="height:68%"></i><i style="height:92%"></i></div>
      <div class="rw"><span>Alder Point, work order</span><span class="cp">On track</span></div>
      <div class="rw"><span>Certificate of insurance</span><span class="cp w">Expires in 9 days</span></div>
      <div class="rw"><span>Payment 4471</span><span class="cp">Matched</span></div>
    </div>
  </div>
</body></html>`;

(async () => {
  fs.writeFileSync(TMP, HTML, "utf8");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  try {
    await page.goto("http://localhost:4321/assets/graphics/_og.html", { waitUntil: "networkidle", timeout: 20000 });
  } catch (e){
    await page.goto("file:///" + TMP.replace(/\\/g, "/"), { waitUntil: "load" });
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(ROOT, "assets", "graphics", "og.png") });
  await browser.close();
  fs.unlinkSync(TMP);
  const kb = fs.statSync(path.join(ROOT, "assets", "graphics", "og.png")).size / 1024;
  console.log(`assets/graphics/og.png  1200 x 630  ${kb.toFixed(0)} KB`);
})();
