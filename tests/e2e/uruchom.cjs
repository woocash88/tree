/**
 * Uruchamia testy end-to-end na zbudowanej stronie (katalog out/, zbudowany z NEXT_PUBLIC_FIREBASE_EMULATOR=1):
 * mały serwer plików + scenariusze Playwright. Emulatory Firebase uruchamia polecenie `npm run test:e2e`.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

try {
  require.resolve("playwright");
} catch {
  console.error("Brak Playwrighta. Zainstaluj go: npm install --no-save playwright && npx playwright install chromium");
  process.exit(1);
}

const KORZEN = path.resolve(__dirname, "../../out");
const TYPY = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };

const serwer = http.createServer((req, res) => {
  const adres = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let plik = path.join(KORZEN, adres);
  if (!plik.startsWith(KORZEN)) return res.writeHead(403).end();
  if (fs.existsSync(plik) && fs.statSync(plik).isDirectory()) plik = path.join(plik, "index.html");
  if (!fs.existsSync(plik)) return res.writeHead(404).end("brak");
  res.writeHead(200, { "Content-Type": TYPY[path.extname(plik)] ?? "application/octet-stream" });
  fs.createReadStream(plik).pipe(res);
});

// Scenariusze uruchamiamy asynchronicznie – synchroniczne spawnSync zablokowałoby serwer plików.
const uruchom = (plik) =>
  new Promise((resolve) => {
    console.log(`\n=== ${plik} ===`);
    spawn(process.execPath, [path.join(__dirname, plik)], { stdio: "inherit" }).on("exit", (kod) => resolve(kod ?? 1));
  });

serwer.listen(4180, async () => {
  let kod = 0;
  for (const scenariusz of (process.env.E2E_ONLY ? process.env.E2E_ONLY.split(",") : ["przeplyw.cjs", "konta.cjs", "wspolpraca.cjs", "wymiana.cjs", "katalog.cjs"])) if ((await uruchom(scenariusz)) !== 0) kod = 1;
  serwer.close();
  process.exit(kod);
});
