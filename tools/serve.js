/* Tiny static file server for local review. Nothing leaves this machine.
   Run:  npm run serve      then open http://localhost:4321 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = 4321;
const TYPES = {
  ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8", ".png":"image/png", ".svg":"image/svg+xml",
  ".ico":"image/x-icon", ".txt":"text/plain; charset=utf-8", ".xml":"application/xml"
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel === "/") rel = "/index.html";
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end("no"); return; }
  fs.readFile(file, (err, buf) => {
    if (err){ res.writeHead(404, {"Content-Type":"text/plain"}).end("404 " + rel); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
}).listen(PORT, () => console.log("Waymark Lab is at http://localhost:" + PORT));
