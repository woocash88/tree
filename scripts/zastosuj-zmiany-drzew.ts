/**
 * Stosuje zmiany w drzewach pobrane z panelu administratora (/admin/ → „Pobierz zmiany drzew”):
 *
 *   npm run zastosuj-zmiany-drzew -- <plik.json>
 *
 * - „zmienione”: nadpisuje wskazane pola w data/drzewa/<slug>/drzewo.json (po walidacji schematem),
 * - „usuniete”: KASUJE katalog data/drzewa/<slug>/ razem z danymi i plikami źródłowymi.
 * Najpierw sprawdzane jest wszystko, dopiero potem cokolwiek jest zapisywane lub kasowane.
 * Usunięcie da się cofnąć tylko z historii gita – skrypt wypisuje, co skasował.
 */
import fs from "node:fs";
import path from "node:path";
import { katalogDrzewa, listaSlugow, walidujMeta } from "../lib/drzewa-pliki";
import { Slug, type DrzewoMeta } from "../lib/schemat-drzewa";
import { zastosujZmianeMeta, type ZmianaDrzewa } from "../lib/zmiany-drzew";

type PlikZmian = { rodzaj?: string; zmienione?: Record<string, ZmianaDrzewa>; usuniete?: string[] };
const DOZWOLONE: (keyof ZmianaDrzewa)[] = ["nazwa", "opis", "region", "zrodlo", "autor", "politykaDatZyjacych", "wyrozniane"];

export function zastosujZmianyDrzew(plik: PlikZmian, dzis = new Date().toISOString().slice(0, 10)): { zmienione: string[]; usuniete: string[] } {
  if (plik.rodzaj !== "zmiany-drzew") throw new Error("To nie jest plik zmian drzew (brak pola rodzaj: „zmiany-drzew”).");
  const istniejace = new Set(listaSlugow());
  const usuniete = [...new Set(plik.usuniete ?? [])];
  const zmienione = Object.entries(plik.zmienione ?? {}).filter(([slug]) => !usuniete.includes(slug));

  for (const slug of [...usuniete, ...zmienione.map(([s]) => s)]) {
    if (!Slug.safeParse(slug).success) throw new Error(`Niepoprawny slug drzewa: „${slug}”.`);
    if (!istniejace.has(slug)) throw new Error(`Nie ma drzewa „${slug}”.`);
  }
  if (usuniete.length >= istniejace.size) throw new Error("Nie można usunąć wszystkich drzew – serwis musi mieć co najmniej jedno.");

  const doZapisu: { slug: string; meta: DrzewoMeta }[] = [];
  for (const [slug, zmiana] of zmienione) {
    const obce = Object.keys(zmiana).filter((k) => !DOZWOLONE.includes(k as keyof ZmianaDrzewa));
    if (obce.length) throw new Error(`Drzewo „${slug}”: pola nie można zmieniać tą drogą: ${obce.join(", ")}.`);
    const plikMeta = path.join(katalogDrzewa(slug), "drzewo.json");
    const obecne = JSON.parse(fs.readFileSync(plikMeta, "utf8")) as DrzewoMeta;
    const nowe = zastosujZmianeMeta(obecne, zmiana);
    nowe.zaktualizowano = dzis;
    walidujMeta(nowe, slug); // rzuca czytelny błąd z nazwą pola
    doZapisu.push({ slug, meta: nowe });
  }

  for (const { slug, meta } of doZapisu) fs.writeFileSync(path.join(katalogDrzewa(slug), "drzewo.json"), JSON.stringify(meta, null, 2) + "\n");
  for (const slug of usuniete) fs.rmSync(katalogDrzewa(slug), { recursive: true });
  return { zmienione: doZapisu.map((d) => d.slug), usuniete };
}

if (process.argv[1] && /zastosuj-zmiany-drzew/.test(process.argv[1])) {
  const plik = process.argv[2];
  if (!plik) {
    console.error("Użycie: npm run zastosuj-zmiany-drzew -- <plik.json>");
    process.exit(1);
  }
  try {
    const wynik = zastosujZmianyDrzew(JSON.parse(fs.readFileSync(plik, "utf8")));
    for (const s of wynik.zmienione) console.log(`Zmieniono metadane drzewa „${s}”.`);
    for (const s of wynik.usuniete) console.log(`USUNIĘTO drzewo „${s}” (katalog data/drzewa/${s}/). Cofnięcie: git checkout -- data/drzewa/${s}`);
    if (!wynik.zmienione.length && !wynik.usuniete.length) console.log("Plik nie zawiera żadnych zmian.");
    else console.log("Uruchom npm test i npm run build, a potem zrób commit.");
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
