import { normalizuj } from "./format";
import type { PodsumowanieDrzewa } from "./dane";

export type Sortowanie = "alfabetycznie" | "najwieksze" | "aktualizacja";

export const SORTOWANIA: { wartosc: Sortowanie; etykieta: string }[] = [
  { wartosc: "alfabetycznie", etykieta: "Alfabetycznie" },
  { wartosc: "najwieksze", etykieta: "Największe" },
  { wartosc: "aktualizacja", etykieta: "Ostatnio zaktualizowane" },
];

/** Tekst, w którym szukamy drzewa: nazwa, region, nazwiska i slug (bez polskich znaków). */
function haystack(d: PodsumowanieDrzewa): string {
  return normalizuj([d.meta.nazwa, d.meta.region, d.meta.slug, ...d.nazwiska].join(" "));
}

/** Każde słowo zapytania musi wystąpić w nazwie, nazwisku lub regionie drzewa. */
export function filtrujDrzewa(drzewa: PodsumowanieDrzewa[], zapytanie: string): PodsumowanieDrzewa[] {
  const slowa = normalizuj(zapytanie).split(" ").filter(Boolean);
  if (!slowa.length) return drzewa;
  return drzewa.filter((d) => {
    const tekst = haystack(d);
    return slowa.every((s) => tekst.includes(s));
  });
}

export function sortujDrzewa(drzewa: PodsumowanieDrzewa[], sortowanie: Sortowanie): PodsumowanieDrzewa[] {
  const alfa = (a: PodsumowanieDrzewa, b: PodsumowanieDrzewa) => a.meta.nazwa.localeCompare(b.meta.nazwa, "pl");
  const kopia = drzewa.slice();
  if (sortowanie === "najwieksze") return kopia.sort((a, b) => b.osob - a.osob || alfa(a, b));
  if (sortowanie === "aktualizacja") return kopia.sort((a, b) => b.meta.zaktualizowano.localeCompare(a.meta.zaktualizowano) || alfa(a, b));
  return kopia.sort(alfa);
}
