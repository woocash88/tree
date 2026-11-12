/**
 * Warstwa danych serwisu dla drzew z repozytorium (build). Widoki statycznych stron czytają dane WYŁĄCZNIE
 * przez funkcje pobierz*() z tego pliku. Zawiera dostęp do plików, więc nie wolno go importować w komponentach
 * klienckich – czyste funkcje i typy są w lib/dane-czyste.ts (ten plik je re-eksportuje).
 *
 * Dane osób żyjących są okrajane zgodnie z polityką dat drzewa (drzewo.json),
 * więc do widoków i do przeglądarki nie trafia nic ponad to, co wolno opublikować.
 */
import { przygotujDrzewo, podsumuj, indeksSzukaniaDrzewa, type Drzewo, type PodsumowanieDrzewa, type OsobaWidoczna } from "./dane-czyste";
import type { WpisSzukania } from "./szukaj";

export * from "./dane-czyste";

// ───────────────────────────── interfejs dla widoków ─────────────────────────────

const pamiec = new Map<string, Drzewo>();

async function zaladuj(slug: string): Promise<Drzewo | null> {
  const znane = pamiec.get(slug);
  if (znane) return znane;
  // Import dynamiczny: moduł z dostępem do plików nie trafia do paczek przeglądarkowych.
  const { listaSlugow, wczytajDrzewo } = await import("./drzewa-pliki");
  if (!listaSlugow().includes(slug)) return null;
  const { meta, rodzina } = wczytajDrzewo(slug);
  const drzewo = przygotujDrzewo(meta, rodzina);
  pamiec.set(slug, drzewo);
  return drzewo;
}

/** Lista wszystkich publicznych drzew (alfabetycznie według nazwy). */
export async function pobierzDrzewa(): Promise<PodsumowanieDrzewa[]> {
  const { listaSlugow } = await import("./drzewa-pliki");
  const drzewa = await Promise.all(listaSlugow().map(zaladuj));
  return drzewa
    .filter((d): d is Drzewo => !!d && d.meta.widocznosc === "publiczne" && !d.meta.archiwalne)
    .map(podsumuj)
    .sort((a, b) => a.meta.nazwa.localeCompare(b.meta.nazwa, "pl"));
}

/** Całe drzewo (metadane, osoby, relacje, statystyki) albo null, gdy nie ma takiego slugu. */
export async function pobierzDrzewo(slug: string): Promise<Drzewo | null> {
  return zaladuj(slug);
}

/** Osoby drzewa w kolejności z pliku, po zastosowaniu polityki dat. */
export async function pobierzOsoby(slug: string): Promise<OsobaWidoczna[] | null> {
  return (await zaladuj(slug))?.osobyLista ?? null;
}

export async function pobierzOsobe(slug: string, id: string): Promise<OsobaWidoczna | null> {
  return (await zaladuj(slug))?.osoby.get(id) ?? null;
}

/** Wpisy indeksu wyszukiwania osób jednego drzewa (serwowane jako /dane/szukaj-<slug>.json). */
export async function pobierzIndeksSzukania(slug: string): Promise<WpisSzukania[]> {
  const d = await zaladuj(slug);
  return d ? indeksSzukaniaDrzewa(d) : [];
}
