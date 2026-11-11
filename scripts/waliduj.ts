/**
 * Walidacja pliku z danymi drzewa – uruchamiana przed każdym buildem (npm run waliduj).
 * Przy błędach wypisuje czytelną listę i kończy się kodem 1, co zatrzymuje build.
 */
import fs from "node:fs";
import path from "node:path";
import { BladDanych, walidujRodzine } from "../lib/walidacja";

const plik = process.argv[2] ?? process.env.RODZINA_PLIK ?? "data/rodzina.json";
const sciezka = path.resolve(process.cwd(), plik);

try {
  const surowe = JSON.parse(fs.readFileSync(sciezka, "utf8"));
  const { rodzina, ostrzezenia } = walidujRodzine(surowe);
  for (const o of ostrzezenia) console.warn(`  ostrzeżenie: ${o}`);
  console.log(`✔ ${plik}: ${rodzina.osoby.length} osób, ${rodzina.malzenstwa.length} małżeństw, ${rodzina.galezie.length} gałęzi – dane poprawne.`);
} catch (e) {
  console.error(`\n✖ Plik ${plik} zawiera błędy – build zatrzymany.\n`);
  if (e instanceof BladDanych) console.error(e.bledy.map((b) => `  • ${b}`).join("\n"));
  else if (e instanceof SyntaxError) console.error(`  • Niepoprawny JSON: ${e.message}`);
  else console.error(`  • ${e instanceof Error ? e.message : e}`);
  console.error("");
  process.exit(1);
}
