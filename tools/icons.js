/* =========================================================
   Rasterises the icon SVGs to the PNG fallbacks the pages reference.

   These used to be made by hand, which meant they silently kept an old
   mark and an old palette through two redesigns. Run this whenever
   favicon.svg or apple-touch-icon.svg changes.

   Run:  node tools/icons.js
   ========================================================= */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const G = path.resolve(__dirname, "..", "assets", "graphics");

const JOBS = [
  { from: "favicon.svg", to: "favicon-32.png", size: 32, pad: 0 },
  { from: "apple-touch-icon.svg", to: "apple-touch-icon.png", size: 180, pad: 0 },
];

(async () => {
  for (const j of JOBS) {
    const src = path.join(G, j.from);
    if (!fs.existsSync(src)) { console.log(`  missing ${j.from}, skipped`); continue; }
    const buf = await sharp(src, { density: 384 })
      .resize(j.size, j.size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(path.join(G, j.to), buf);
    console.log(`  ${j.to.padEnd(24)} ${j.size}x${j.size}  ${Math.max(1, Math.round(buf.length / 1024))} KB`);
  }
  console.log("icons rebuilt from the SVG sources");
})();
