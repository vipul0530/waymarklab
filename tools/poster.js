/*
  Pulls a still out of the hero video and writes it as the poster frame, so the
  first paint and anyone with reduced motion turned on sees the same picture
  rather than an unrelated screenshot.

  Run:  node tools/poster.js [seconds]     (npm run hero does it for you)
  Out:  assets/video/hero-poster.jpg
*/
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CLIP = path.join(ROOT, "assets", "video", "hero.mp4");
const OUT = path.join(ROOT, "assets", "video", "hero-poster.jpg");
const AT = Number(process.argv[2] || 6.5);

(async () => {
  if (!fs.existsSync(CLIP)){ console.log("  no hero.mp4, nothing to make a poster from"); return; }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  /* served over http so the canvas is not tainted */
  await page.goto("http://localhost:4321/assets/video/README.txt", { waitUntil: "load" }).catch(() => {});

  const data = await page.evaluate(async at => {
    const v = document.createElement("video");
    v.src = "/assets/video/hero.mp4";
    v.muted = true;
    await new Promise(r => { v.onloadeddata = r; v.onerror = r; });
    v.currentTime = Math.min(at, (v.duration || 10) - 0.1);
    await new Promise(r => { v.onseeked = r; });
    const scale = Math.min(1, 900 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    return { url: c.toDataURL("image/jpeg", 0.72), w: c.width, h: c.height };
  }, AT);

  await browser.close();

  if (!data || !data.url || data.url.length < 2000){
    console.log("  could not read a frame out of the video, poster left as it was");
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(OUT, Buffer.from(data.url.split(",")[1], "base64"));
  console.log(`  poster    assets/video/hero-poster.jpg  ${data.w} x ${data.h}  ` +
              `${(fs.statSync(OUT).size / 1024).toFixed(0)} KB, frame at ${AT}s`);
})();
