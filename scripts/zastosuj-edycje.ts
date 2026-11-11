/**
 * Stosuje do danych drzewa edycje pobrane z serwisu (przycisk „Pobierz zmiany”):
 *
 *   npm run zastosuj-edycje -- <slug> <plik.json>
 *
 * - drzewo z importem (jest zrodlo/<slug>.txt): zmiany trafiają do poprawki.json (pole „osoby” i „dodane”),
 *   a potem import przelicza rodzina.json – ponowny import niczego nie kasuje;
 * - pozostałe drzewa: zmiany są wpisywane bezpośrednio do rodzina.json.
 * Po zastosowaniu uaktualniane są zakres lat i data aktualizacji w drzewo.json.
 */
import fs from "node:fs";
import path from "node:path";
import { zastosujPatch, type NowaOsoba, type PatchOsoby } from "../lib/edycje";
import { katalogDrzewa } from "../lib/drzewa-pliki";
import type { Osoba, Rodzina } from "../lib/schemat";
import { walidujRodzine } from "../lib/walidacja";
import { importuj, sciezkiImportu, wczytajPoprawki, zbudujRaport } from "./import";

type PlikEdycji = { slug: string; osoby: Record<string, PatchOsoby>; dodane: NowaOsoba[] };

export function zastosujEdycje(slug: string, e: PlikEdycji): { osob: number } {
  if (e.slug !== slug) throw new Error(`Plik dotyczy drzewa „${e.slug}”, a podano „${slug}”.`);
  const sc = sciezkiImportu(slug);
  let rodzina: Rodzina;
  if (fs.existsSync(sc.zrodlo)) {
    const poprawki = wczytajPoprawki(slug);
    const osoby = { ...poprawki.osoby };
    for (const [id, patch] of Object.entries(e.osoby)) osoby[id] = { ...osoby[id], ...patch } as Partial<Osoba>;
    const dodane = [...(poprawki.dodane ?? []).filter((o) => !e.dodane.some((n) => n.id === o.id)), ...(e.dodane as Osoba[])];
    const nowe = { osoby, scal: poprawki.scal ?? [], dodane };
    const wynik = importuj(fs.readFileSync(sc.zrodlo, "utf8"), nowe);
    fs.writeFileSync(sc.poprawki, JSON.stringify(nowe, null, 2) + "\n");
    fs.writeFileSync(sc.wynik, JSON.stringify(wynik.rodzina, null, 2) + "\n");
    fs.writeFileSync(sc.raport, zbudujRaport(wynik, nowe));
    rodzina = wynik.rodzina;
  } else {
    const surowa = JSON.parse(fs.readFileSync(sc.wynik, "utf8")) as Rodzina;
    for (const id of Object.keys(e.osoby)) if (!surowa.osoby.some((o) => o.id === id)) throw new Error(`Nie ma osoby o id „${id}”.`);
    surowa.osoby = surowa.osoby.map((o) => (e.osoby[o.id] ? zastosujPatch(o, e.osoby[o.id]) : o));
    for (const n of e.dodane) {
      if (surowa.osoby.some((o) => o.id === n.id)) throw new Error(`Osoba „${n.id}” już istnieje.`);
      surowa.osoby.push(n as Osoba);
    }
    rodzina = walidujRodzine(surowa).rodzina;
    fs.writeFileSync(sc.wynik, JSON.stringify(rodzina, null, 2) + "\n");
  }
  // zakres lat i data aktualizacji w metadanych drzewa
  const plikMeta = path.join(katalogDrzewa(slug), "drzewo.json");
  const meta = JSON.parse(fs.readFileSync(plikMeta, "utf8"));
  const lata = rodzina.osoby.flatMap((o) => [o.urodzenie.wartosc, o.smierc?.wartosc]).filter((w): w is string => !!w).map((w) => Number(w.slice(0, 4)));
  meta.zakresLat = { od: Math.min(meta.zakresLat.od, ...lata), do: Math.max(meta.zakresLat.do, ...lata) };
  meta.zaktualizowano = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(plikMeta, JSON.stringify(meta, null, 2) + "\n");
  return { osob: rodzina.osoby.length };
}

if (process.argv[1] && /zastosuj-edycje/.test(process.argv[1])) {
  const [slug, plik] = process.argv.slice(2);
  if (!slug || !plik) {
    console.error("Użycie: npm run zastosuj-edycje -- <slug> <plik.json>");
    process.exit(1);
  }
  try {
    const wynik = zastosujEdycje(slug, JSON.parse(fs.readFileSync(plik, "utf8")));
    console.log(`Drzewo „${slug}”: zastosowano edycje, osób: ${wynik.osob}. Uruchom npm test i npm run build.`);
  } catch (err) {
    console.error(`Drzewo „${slug}”: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
