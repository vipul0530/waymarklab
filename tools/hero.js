/*
  Turns the real hero footage on or off, depending on whether it is there.

  Put a clip at assets/video/hero.mp4 and run:  npm run hero
  It switches the home page over to it. Remove the file and run it again to go
  back to the screen recording of our own software.

  It also reads the dimensions straight out of the MP4 header and says whether
  the shape is going to work in a wide hero, because a vertical clip in a
  landscape hero loses most of the frame.

  This exists so the page never requests a file that is not there.
*/
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PAGE = path.join(ROOT, "index.html");
const CLIP = path.join(ROOT, "assets", "video", "hero.mp4");

const ON  = '<!-- hero:mp4:on --><source src="assets/video/hero.mp4" type="video/mp4">';
const OFF = '<!-- hero:mp4:off --><!-- <source src="assets/video/hero.mp4" type="video/mp4"> -->';

/* ---------- read width, height and duration out of the MP4 boxes ---------- */
function probe(file){
  try {
    const b = fs.readFileSync(file);
    const out = {};

    /* mvhd carries the timescale and duration of the whole movie */
    const mv = b.indexOf(Buffer.from("mvhd"));
    if (mv > 0){
      const v = b.readUInt8(mv + 4);
      if (v === 1){
        out.seconds = Number(b.readBigUInt64BE(mv + 28)) / b.readUInt32BE(mv + 24);
      } else {
        out.seconds = b.readUInt32BE(mv + 20) / b.readUInt32BE(mv + 16);
      }
    }

    /* the widest tkhd is the video track: width and height are 16.16 fixed point */
    let at = 0;
    while (true){
      const i = b.indexOf(Buffer.from("tkhd"), at);
      if (i < 0) break;
      at = i + 4;
      const v = b.readUInt8(i + 4);
      const base = i + 4 + 4 + (v === 1 ? 32 : 20);
      const off = base + 2 + 2 + 2 + 2 + 36;
      const w = b.readUInt32BE(off) / 65536;
      const h = b.readUInt32BE(off + 4) / 65536;
      if (w > 1 && h > 1 && (!out.w || w > out.w)){ out.w = Math.round(w); out.h = Math.round(h); }
    }
    return out.w ? out : null;
  } catch (e){ return null; }
}

const has = fs.existsSync(CLIP);
let src = fs.readFileSync(PAGE, "utf8");
const current = src.includes(ON) ? "on" : "off";
const want = has ? "on" : "off";

if (current === want){
  console.log(has
    ? "hero.mp4 is present and already wired in."
    : "No assets/video/hero.mp4. The hero plays the software recording, which is correct.");
} else {
  src = src.replace(current === "on" ? ON : OFF, want === "on" ? ON : OFF);
  fs.writeFileSync(PAGE, src, "utf8");
  console.log(want === "on"
    ? "Wired the hero to assets/video/hero.mp4."
    : "hero.mp4 is gone, put the hero back on the software recording.");
}

if (has && current !== want){
  /* a new clip needs a new poster frame, otherwise the still and the video disagree */
  const r = spawnSync(process.execPath, [path.join(__dirname, "poster.js")], { encoding: "utf8" });
  if (r.stdout) process.stdout.write(r.stdout);
}

if (has){
  const mb = fs.statSync(CLIP).size / 1048576;
  const m = probe(CLIP);
  console.log(`  file      ${mb.toFixed(2)} MB`);
  if (m){
    console.log(`  frame     ${m.w} x ${m.h}${m.seconds ? "  ·  " + m.seconds.toFixed(1) + " seconds" : ""}`);
    const ratio = m.w / m.h;
    if (ratio < 1){
      console.log("  SHAPE     this clip is vertical. In a wide hero it is cropped to a band");
      console.log(`            about ${Math.round(m.h * (1440 / m.w))}px tall of a ${m.h}px frame, so roughly ` +
                  `${Math.round((1 - (m.w / 1440 * 600) / m.h) * 100)}% of the picture is lost.`);
      console.log("            Use it as the phone hero, or find a landscape clip for desktop.");
    } else if (ratio < 1.6){
      console.log("  SHAPE     squarish. Workable, but a 16:9 clip sits better behind the headline.");
    } else {
      console.log("  SHAPE     landscape, good.");
    }
  }
  if (mb > 6) console.log(`  SIZE      ${mb.toFixed(1)} MB is heavy for a hero. Trim it to about 15 seconds.`);
}
