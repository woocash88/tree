/**
 * Dane osoby w kształcie potrzebnym komponentom klienckim (lista, diagram, panel osoby).
 * Moduł jest „czysty” (bez dostępu do plików), więc można go używać także w przeglądarce –
 * m.in. do przeliczania osób po lokalnych edycjach (lib/edycje.ts).
 */
import type { OsobaDrzewa } from "./drzewo";
import { formatDaty, lataZycia, rokZdarzenia, wiek } from "./format";
import type { DataZdarzenia, Osoba } from "./schemat";

export type OsobaPanelu = OsobaDrzewa & { plec: Osoba["plec"]; ur: string; zm: string; wiek: string | null; pokolenie: number; rodowe?: string; notatka?: string; ukryta: boolean };

/** Minimalny kształt osoby wystarczający do zbudowania OsobaPanelu (pasuje do Osoba i do osoby po okrojeniu dat). */
export type ZrodloPanelu = Pick<Osoba, "id" | "imie" | "nazwisko" | "plec" | "urodzenie" | "ojciecId" | "matkaId" | "galazId"> & Partial<Pick<Osoba, "nazwiskoRodowe" | "smierc" | "notatka" | "niepewne" | "zyjaca">> & { ukryjDaty?: boolean };

export function opisZdarzenia(d?: DataZdarzenia): string {
  if (!d) return "";
  return [formatDaty(d), d.miejsce].filter(Boolean).join(", ");
}

/** Czy osobę traktujemy jako zmarłą (znana data/miejsce śmierci albo urodzenie ponad 110 lat temu). */
export function czyZmarla(o: Pick<Osoba, "urodzenie" | "smierc" | "zyjaca">): boolean {
  if (o.zyjaca) return false;
  if (o.smierc) return true;
  const rok = rokZdarzenia(o.urodzenie);
  return rok !== null && rok < new Date().getFullYear() - 110;
}

export function osobaPanelu(o: ZrodloPanelu, pokolenie: number): OsobaPanelu {
  const zmarla = czyZmarla(o);
  return {
    id: o.id,
    imie: o.imie,
    nazwisko: o.nazwisko,
    lata: lataZycia(o),
    galazId: o.galazId,
    ojciecId: o.ojciecId,
    matkaId: o.matkaId,
    zmarla,
    niepewna: !!o.niepewne?.length,
    plec: o.plec,
    ur: opisZdarzenia(o.urodzenie),
    // Pustą datę śmierci pokazujemy tylko osobom, które według danych nie żyją.
    zm: o.smierc ? opisZdarzenia(o.smierc) || "data nieznana" : zmarla ? "data nieznana" : "",
    wiek: wiek(o),
    pokolenie,
    ...(o.nazwiskoRodowe ? { rodowe: o.nazwiskoRodowe } : {}),
    ...(o.notatka ? { notatka: o.notatka } : {}),
    ukryta: !!o.ukryjDaty,
  };
}
