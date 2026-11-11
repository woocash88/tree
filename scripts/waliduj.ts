/**
 * Walidacja drzew – uruchamiana przed każdym buildem (npm run waliduj).
 *
 *   npm run waliduj                  # wszystkie drzewa z data/drzewa/
 *   npm run waliduj -- lulkiewicz    # tylko wskazane drzewo (slug)
 *
 * Błąd w którymkolwiek drzewie wypisuje czytelną listę z nazwą drzewa i kończy się kodem 1,
 * co zatrzymuje build.
 */
import { BladDrzewa, katalogDrzew, listaSlugow, wczytajDrzewo } from "../lib/drzewa-pliki";
import path from "node:path";

const zadane = process.argv.slice(2);
const wszystkie = listaSlugow();
const slugi = zadane.length ? zadane : wszystkie;
let bledow = 0;

if (!slugi.length) {
  console.error(`\n✖ Brak drzew w ${path.relative(process.cwd(), katalogDrzew())} – build zatrzymany.\n`);
  process.exit(1);
}

for (const slug of slugi) {
  try {
    if (!wszystkie.includes(slug)) throw new BladDrzewa(slug, [`nie ma drzewa o takim slugu (oczekiwany plik ${path.join(path.relative(process.cwd(), katalogDrzew()), slug, "drzewo.json")})`]);
    const { meta, rodzina, ostrzezenia } = wczytajDrzewo(slug);
    for (const o of ostrzezenia) console.warn(`  [${slug}] ostrzeżenie: ${o}`);
    console.log(`✔ ${slug} („${meta.nazwa}”): ${rodzina.osoby.length} osób, ${rodzina.malzenstwa.length} małżeństw, ${rodzina.galezie.length} gałęzi – dane poprawne.`);
  } catch (e) {
    bledow++;
    console.error(`\n✖ Drzewo „${slug}” zawiera błędy – build zatrzymany.\n`);
    if (e instanceof BladDrzewa) console.error(e.bledy.map((b) => `  • ${b}`).join("\n"));
    else console.error(`  • ${e instanceof Error ? e.message : e}`);
    console.error("");
  }
}

if (bledow) process.exit(1);
