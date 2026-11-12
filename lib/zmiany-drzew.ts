/**
 * Zmiany w drzewach przygotowane przez administratora: edycja metadanych i usunięcie drzewa.
 * Tak jak edycje osób zapisują się lokalnie w przeglądarce, a do serwisu trafiają przez plik JSON
 * i polecenie `npm run zastosuj-zmiany-drzew -- <plik.json>`. Moduł jest czysty.
 */
import { SchematDrzewa, type DrzewoMeta } from "./schemat-drzewa";

/** Pola metadanych, które można zmienić w panelu. `autor.url` i `wyrozniane` są opcjonalne. */
export type ZmianaDrzewa = Partial<Pick<DrzewoMeta, "nazwa" | "opis" | "region" | "zrodlo" | "autor" | "politykaDatZyjacych" | "wyrozniane">>;

export type ZmianyDrzew = { zmienione: Record<string, ZmianaDrzewa>; usuniete: string[] };
export const PUSTE_ZMIANY: ZmianyDrzew = { zmienione: {}, usuniete: [] };

export const liczbaZmianDrzew = (z: ZmianyDrzew): number => Object.keys(z.zmienione).length + z.usuniete.length;

/** Metadane po zmianie; `wyrozniane: false` usuwa pole. */
export function zastosujZmianeMeta(meta: DrzewoMeta, zmiana: ZmianaDrzewa): DrzewoMeta {
  const wynik: Record<string, unknown> = { ...meta, ...zmiana };
  if (zmiana.wyrozniane === false) delete wynik.wyrozniane;
  return wynik as DrzewoMeta;
}

/** Sprawdza metadane po zmianie tym samym schematem co build. Zwraca listę błędów (pusta = dobrze). */
export function bledyMeta(meta: DrzewoMeta): string[] {
  const wynik = SchematDrzewa.safeParse(meta);
  return wynik.success ? [] : wynik.error.issues.map((i) => `${i.path.join(".") || "drzewo"}: ${i.message}`);
}

export function zmianyDoPliku(z: ZmianyDrzew): string {
  return JSON.stringify({ rodzaj: "zmiany-drzew", wersja: 1, zmienione: z.zmienione, usuniete: z.usuniete }, null, 2) + "\n";
}
