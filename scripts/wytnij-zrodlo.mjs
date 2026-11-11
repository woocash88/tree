// Wycina blok <pre id="drzewo_tresc"> z pobranego HTML strony źródłowej.
//
//   curl -L -o /tmp/strona.html https://genealogia.okiem.pl/drzewo/238/lulkiewicz
//   node scripts/wytnij-zrodlo.mjs lulkiewicz /tmp/strona.html
//
// Zapisuje:
//   data/drzewa/<slug>/zrodlo/<slug>.pre.html – dosłowny fragment HTML (bajt w bajt),
//   data/drzewa/<slug>/zrodlo/<slug>.txt      – ten sam tekst po czysto mechanicznej zamianie:
//                                     <br> → nowy wiersz, usunięcie znaczników, dekodowanie encji.
// Żadna treść nie jest poprawiana ani uzupełniana.
import fs from "node:fs";

const [slug, plik] = process.argv.slice(2);
if (!slug || !plik) {
  console.error("Użycie: node scripts/wytnij-zrodlo.mjs <slug> <pobrany.html>");
  process.exit(1);
}
const html = fs.readFileSync(plik, "utf8");
const start = html.indexOf('<pre id="drzewo_tresc">');
const koniec = html.indexOf("</pre>", start);
if (start < 0 || koniec < 0) {
  console.error("Nie znaleziono bloku <pre id=\"drzewo_tresc\"> – strona zmieniła strukturę?");
  process.exit(1);
}
const surowy = html.slice(start, koniec + "</pre>".length);
const tekst = surowy
  .replace(/^<pre[^>]*>/, "")
  .replace(/<\/pre>$/, "")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#0?39;/g, "'")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&");

const katalog = `data/drzewa/${slug}/zrodlo`;
fs.mkdirSync(katalog, { recursive: true });
fs.writeFileSync(`${katalog}/${slug}.pre.html`, surowy + "\n");
fs.writeFileSync(`${katalog}/${slug}.txt`, tekst);
console.log(`Zapisano ${tekst.split("\n").length} wierszy do ${katalog}/${slug}.txt`);
