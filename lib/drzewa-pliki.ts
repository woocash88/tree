/**
 * Dostęp do plików drzew (tylko Node: build, skrypty, testy). Układ katalogu:
 *
 *   data/drzewa/<slug>/drzewo.json       metadane drzewa
 *   data/drzewa/<slug>/rodzina.json      osoby, małżeństwa, gałęzie
 *   data/drzewa/<slug>/poprawki.json     ręczne poprawki nakładane po imporcie (opcjonalnie)
 *   data/drzewa/<slug>/import-raport.md  raport importu (opcjonalnie)
 *   data/drzewa/<slug>/zrodlo/           pliki źródłowe (opcjonalnie)
 *
 * Katalog główny można zmienić zmienną DRZEWA_KATALOG (np. na zestaw testowy wydajności).
 */
import fs from "node:fs";
import path from "node:path";
import { SchematDrzewa, type DrzewoMeta } from "./schemat-drzewa";
import type { Rodzina } from "./schemat";
import { BladDanych, walidujRodzine, type WynikWalidacji } from "./walidacja";

export class BladDrzewa extends Error {
  constructor(
    public readonly slug: string,
    public readonly bledy: string[],
  ) {
    super(`Drzewo „${slug}” zawiera błędy (${bledy.length}):\n` + bledy.map((b) => `  • ${b}`).join("\n"));
    this.name = "BladDrzewa";
  }
}

export function katalogDrzew(): string {
  return path.resolve(process.cwd(), process.env.DRZEWA_KATALOG ?? "data/drzewa");
}

export function katalogDrzewa(slug: string): string {
  return path.join(katalogDrzew(), slug);
}

/** Slugi = nazwy podkatalogów zawierających drzewo.json, alfabetycznie. */
export function listaSlugow(): string[] {
  const korzen = katalogDrzew();
  if (!fs.existsSync(korzen)) return [];
  return fs
    .readdirSync(korzen, { withFileTypes: true })
    .filter((w) => w.isDirectory() && fs.existsSync(path.join(korzen, w.name, "drzewo.json")))
    .map((w) => w.name)
    .sort();
}

function wczytajJson(plik: string, slug: string): unknown {
  if (!fs.existsSync(plik)) throw new BladDrzewa(slug, [`brak pliku ${path.basename(plik)}`]);
  try {
    return JSON.parse(fs.readFileSync(plik, "utf8"));
  } catch (e) {
    throw new BladDrzewa(slug, [`${path.basename(plik)}: niepoprawny JSON (${e instanceof Error ? e.message : e})`]);
  }
}

/** Sprawdza surowe metadane; slug w pliku musi zgadzać się z nazwą katalogu. */
export function walidujMeta(surowe: unknown, slugKatalogu: string): DrzewoMeta {
  const wynik = SchematDrzewa.safeParse(surowe);
  if (!wynik.success) {
    throw new BladDrzewa(slugKatalogu, wynik.error.issues.map((i) => `drzewo.json → ${i.path.join(".") || "plik"}: ${i.message}`));
  }
  if (wynik.data.slug !== slugKatalogu) {
    throw new BladDrzewa(slugKatalogu, [`drzewo.json → slug: „${wynik.data.slug}” nie zgadza się z nazwą katalogu „${slugKatalogu}”`]);
  }
  return wynik.data;
}

export function wczytajMeta(slug: string): DrzewoMeta {
  return walidujMeta(wczytajJson(path.join(katalogDrzewa(slug), "drzewo.json"), slug), slug);
}

export function wczytajRodzine(slug: string): WynikWalidacji {
  const surowe = wczytajJson(path.join(katalogDrzewa(slug), "rodzina.json"), slug);
  try {
    return walidujRodzine(surowe);
  } catch (e) {
    if (e instanceof BladDanych) throw new BladDrzewa(slug, e.bledy.map((b) => `rodzina.json: ${b}`));
    throw e;
  }
}

export type WczytaneDrzewo = { meta: DrzewoMeta; rodzina: Rodzina; ostrzezenia: string[] };

export function wczytajDrzewo(slug: string): WczytaneDrzewo {
  const meta = wczytajMeta(slug);
  const { rodzina, ostrzezenia } = wczytajRodzine(slug);
  return { meta, rodzina, ostrzezenia };
}
