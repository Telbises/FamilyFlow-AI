import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, "public", "index.html"), "utf8");
const port = Number(process.env.TV_PORT ?? 3200);

createServer((req, res) => {
  if (req.url === "/" || req.url?.startsWith("/index")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  res.writeHead(404);
  res.end("Not found");
}).listen(port, () => {
  console.log(
    JSON.stringify({
      msg: "FamilyFlow TV shell (browser 10-foot UI — not Vega VVD)",
      url: `http://127.0.0.1:${port}`,
    }),
  );
});
