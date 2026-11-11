/**
 * Wczytanie i przygotowanie danych drzewa po stronie builda (Server Components).
 * Dane osób z flagą ukryjDaty są tu okrawane – do przeglądarki trafia samo imię i nazwisko.
 */
import fs from "node:fs";
import path from "node:path";
import { formatDaty, lataZycia, pelneImie, rokZdarzenia, wiek } from "./format";
import type { DataZdarzenia, Galaz, Osoba, Rodzina } from "./schemat";
import { walidujRodzine } from "./walidacja";
import type { OsobaDrzewa, ParaDrzewa } from "./drzewo";
import type { WpisSzukania } from "./szukaj";

export type Zwiazek = { osoba: Osoba; kolejnosc: number };

export type StatystykiGalezi = { galaz: Galaz; osob: number; od: number | null; do: number | null; zalozycielId: string | null };

export type Dane = {
  rodzina: Rodzina;
  osoby: Map<string, Osoba>;
  dzieci: Map<string, Osoba[]>;
  malzonkowie: Map<string, Zwiazek[]>;
  pokolenie: Map<string, number>;
  galezie: Map<string, Galaz>;
  statystykiGalezi: StatystykiGalezi[];
  statystyki: { osob: number; pokolen: number; malzenstw: number; nazwisk: number; najstarszy: { osoba: Osoba; rok: number } | null; od: number | null; do: number | null };
  korzenId: string;
};

let pamiec: Dane | null = null;

export function wczytajDane(): Dane {
  if (pamiec) return pamiec;
  const plik = path.resolve(process.cwd(), process.env.RODZINA_PLIK ?? "data/rodzina.json");
  const { rodzina } = walidujRodzine(JSON.parse(fs.readFileSync(plik, "utf8")));

  // Okrojenie danych osób żyjących – w zbudowanej stronie nie ma ich dat, miejsc ani notatek.
  const pelne = new Map(rodzina.osoby.map((o) => [o.id, o]));
  const osobyWidoczne: Osoba[] = rodzina.osoby.map((o) =>
    o.ukryjDaty
      ? { id: o.id, imie: o.imie, nazwisko: o.nazwisko, nazwiskoRodowe: o.nazwiskoRodowe, plec: o.plec, urodzenie: { dokladnosc: "nieznana" }, ojciecId: o.ojciecId, matkaId: o.matkaId, galazId: o.galazId, ukryjDaty: true, niepewne: o.niepewne }
      : o,
  );
  const osoby = new Map(osobyWidoczne.map((o) => [o.id, o]));

  const dzieci = new Map<string, Osoba[]>();
  for (const o of osobyWidoczne) {
    for (const r of new Set([o.ojciecId, o.matkaId])) {
      if (r) dzieci.set(r, [...(dzieci.get(r) ?? []), o]);
    }
  }
  const malzonkowie = new Map<string, Zwiazek[]>();
  for (const m of rodzina.malzenstwa) {
    const a = osoby.get(m.osobaAId)!;
    const b = osoby.get(m.osobaBId)!;
    malzonkowie.set(a.id, [...(malzonkowie.get(a.id) ?? []), { osoba: b, kolejnosc: m.kolejnosc }]);
    malzonkowie.set(b.id, [...(malzonkowie.get(b.id) ?? []), { osoba: a, kolejnosc: m.kolejnosc }]);
  }
  for (const lista of malzonkowie.values()) lista.sort((x, y) => x.kolejnosc - y.kolejnosc);

  // Pokolenie: 1 dla osób bez rodziców, w przeciwnym razie o 1 więcej niż rodzic.
  // Małżonek bez rodziców dostaje pokolenie partnera.
  const pokolenie = new Map<string, number>();
  const licz = (id: string): number => {
    const znane = pokolenie.get(id);
    if (znane) return znane;
    const o = osoby.get(id)!;
    const rodzice = [o.ojciecId, o.matkaId].filter((r): r is string => !!r);
    const p = rodzice.length ? Math.max(...rodzice.map(licz)) + 1 : 1;
    pokolenie.set(id, p);
    return p;
  };
  osobyWidoczne.forEach((o) => licz(o.id));
  for (const o of osobyWidoczne) {
    if (o.ojciecId || o.matkaId) continue;
    const partnerzy = (malzonkowie.get(o.id) ?? []).filter((z) => z.osoba.ojciecId || z.osoba.matkaId);
    if (partnerzy.length) pokolenie.set(o.id, Math.max(...partnerzy.map((z) => pokolenie.get(z.osoba.id)!)));
  }
  for (const o of osobyWidoczne) {
    if (o.ojciecId || o.matkaId) continue;
    const partnerzy = malzonkowie.get(o.id) ?? [];
    if (partnerzy.length) pokolenie.set(o.id, Math.max(pokolenie.get(o.id)!, ...partnerzy.map((z) => pokolenie.get(z.osoba.id)!)));
  }

  // Lata do statystyk liczymy z pełnych danych (zbiorczo, bez wskazywania osób).
  const lataOsoby = (id: string) => {
    const o = pelne.get(id)!;
    return [rokZdarzenia(o.urodzenie), rokZdarzenia(o.smierc)].filter((r): r is number => r !== null);
  };
  const zakres = (lista: Osoba[]) => {
    const lata = lista.flatMap((o) => lataOsoby(o.id));
    return lata.length ? { od: Math.min(...lata), do: Math.max(...lata) } : { od: null, do: null };
  };
  const statystykiGalezi = rodzina.galezie.map((galaz) => {
    const lista = osobyWidoczne.filter((o) => o.galazId === galaz.id);
    const zalozyciel = lista.slice().sort((a, b) => pokolenie.get(a.id)! - pokolenie.get(b.id)!).find((o) => o.ojciecId || o.matkaId) ?? lista[0];
    return { galaz, osob: lista.length, ...zakres(lista), zalozycielId: zalozyciel?.id ?? null };
  });

  let najstarszy: Dane["statystyki"]["najstarszy"] = null;
  for (const o of osobyWidoczne) {
    const rok = rokZdarzenia(o.urodzenie) ?? rokZdarzenia(o.smierc);
    if (rok !== null && (!najstarszy || rok < najstarszy.rok)) najstarszy = { osoba: o, rok };
  }
  const korzen = osobyWidoczne.find((o) => !o.ojciecId && !o.matkaId && (dzieci.get(o.id)?.length ?? 0) > 0) ?? osobyWidoczne[0];

  pamiec = {
    rodzina,
    osoby,
    dzieci,
    malzonkowie,
    pokolenie,
    galezie: new Map(rodzina.galezie.map((g) => [g.id, g])),
    statystykiGalezi,
    statystyki: {
      osob: osobyWidoczne.length,
      pokolen: Math.max(...pokolenie.values()),
      malzenstw: rodzina.malzenstwa.length,
      nazwisk: new Set(osobyWidoczne.map((o) => o.nazwisko).filter(Boolean)).size,
      najstarszy,
      ...zakres(osobyWidoczne),
    },
    korzenId: korzen.id,
  };
  return pamiec;
}

export function opisZdarzenia(d?: DataZdarzenia): string {
  if (!d) return "";
  return [formatDaty(d), d.miejsce].filter(Boolean).join(", ");
}

/** Czy osobę traktujemy jako zmarłą (znana data/miejsce śmierci albo urodzenie ponad 110 lat temu). */
export function czyZmarla(o: Osoba): boolean {
  if (o.smierc) return true;
  const rok = rokZdarzenia(o.urodzenie);
  return rok !== null && rok < new Date().getFullYear() - 110;
}

// ── dane dla komponentów klienckich ──


export function indeksSzukania(): WpisSzukania[] {
  const { osoby } = wczytajDane();
  return [...osoby.values()].map((o) => ({
    id: o.id,
    i: o.imie,
    n: o.nazwisko,
    ...(o.nazwiskoRodowe ? { r: o.nazwiskoRodowe } : {}),
    l: lataZycia(o),
    g: o.galazId,
    y: [rokZdarzenia(o.urodzenie), rokZdarzenia(o.smierc)].filter((r): r is number => r !== null),
  }));
}

export type OsobaPanelu = OsobaDrzewa & { plec: Osoba["plec"]; ur: string; zm: string; wiek: string | null; pokolenie: number; rodowe?: string; notatka?: string; ukryta: boolean };

export function daneDrzewa(): { osoby: OsobaPanelu[]; pary: ParaDrzewa[]; galezie: Galaz[] } {
  const d = wczytajDane();
  return {
    osoby: [...d.osoby.values()].map((o) => ({
      id: o.id,
      imie: o.imie,
      nazwisko: o.nazwisko,
      lata: lataZycia(o),
      galazId: o.galazId,
      ojciecId: o.ojciecId,
      matkaId: o.matkaId,
      zmarla: czyZmarla(o),
      niepewna: !!o.niepewne?.length,
      plec: o.plec,
      ur: opisZdarzenia(o.urodzenie),
      zm: o.smierc ? opisZdarzenia(o.smierc) || "data nieznana" : "",
      wiek: wiek(o),
      pokolenie: d.pokolenie.get(o.id)!,
      ...(o.nazwiskoRodowe ? { rodowe: o.nazwiskoRodowe } : {}),
      ...(o.notatka ? { notatka: o.notatka } : {}),
      ukryta: !!o.ukryjDaty,
    })),
    pary: d.rodzina.malzenstwa.map((m) => ({ a: m.osobaAId, b: m.osobaBId, kolejnosc: m.kolejnosc })),
    galezie: d.rodzina.galezie,
  };
}

/** Ścieżka pochodzenia od najdalszego znanego przodka do osoby (po linii z dłuższym rodowodem). */
export function sciezkaPochodzenia(id: string): Osoba[] {
  const { osoby, pokolenie } = wczytajDane();
  const sciezka: Osoba[] = [];
  let o: Osoba | undefined = osoby.get(id);
  while (o) {
    sciezka.unshift(o);
    const rodzice: Osoba[] = [o.ojciecId, o.matkaId].filter((r): r is string => !!r).map((r) => osoby.get(r)!);
    const zRodowodem = rodzice.filter((r) => r.ojciecId || r.matkaId);
    o = (zRodowodem.length ? zRodowodem : rodzice).sort((a, b) => pokolenie.get(b.id)! - pokolenie.get(a.id)!)[0];
  }
  return sciezka;
}

export { pelneImie };
