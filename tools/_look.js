const { chromium } = require("playwright"); const sharp = require("sharp");
(async()=>{ const b=await chromium.launch();
 const c=await b.newContext({viewport:{width:1440,height:600},deviceScaleFactor:2}); const p=await c.newPage();
 await p.goto("http://localhost:4321/index.html",{waitUntil:"networkidle"});
 await p.evaluate(async()=>{await document.fonts.ready;}); await p.waitForTimeout(700);
 await sharp(await p.screenshot({clip:{x:60,y:110,width:640,height:120}})).resize({width:640}).toFile("assets/review/_look.png");
 await b.close(); console.log("ok"); })();
