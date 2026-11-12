/**
 * Czysta część warstwy danych: typy, okrajanie osób żyjących, budowa struktur drzewa i dane dla widoków.
 * Bez dostępu do plików i bez Firebase – działa i przy buildzie, i w przeglądarce (drzewa z bazy).
 * Funkcje czytające pliki repozytorium są w lib/dane.ts.
 */
import { lataZycia, pelneImie, rokZdarzenia } from "./format";
import { CALE_DRZEWO, ID_CALEGO } from "./galezie";
import { osobaPanelu, type OsobaPanelu } from "./panel";
import type { Galaz, Malzenstwo, Osoba, Rodzina } from "./schemat";
import type { DrzewoMeta, PolitykaDat } from "./schemat-drzewa";
import type { ParaDrzewa } from "./drzewo";
import type { WpisSzukania } from "./szukaj";

/** Osoba po zastosowaniu polityki dat. `ukryjDaty` = daty tej osoby nie są publikowane. */
export type OsobaWidoczna = Osoba & { ukryjDaty?: boolean };

export type Zwiazek = { osoba: OsobaWidoczna; kolejnosc: number };

export type StatystykiGalezi = { galaz: Galaz; osob: number; od: number | null; do: number | null; zalozycielId: string | null };

export type Drzewo = {
  meta: DrzewoMeta;
  /** Osoby w kolejności z pliku (kolejność rodzeństwa). */
  osobyLista: OsobaWidoczna[];
  osoby: Map<string, OsobaWidoczna>;
  malzenstwa: Malzenstwo[];
  galezieLista: Galaz[];
  dzieci: Map<string, OsobaWidoczna[]>;
  malzonkowie: Map<string, Zwiazek[]>;
  pokolenie: Map<string, number>;
  galezie: Map<string, Galaz>;
  statystykiGalezi: StatystykiGalezi[];
  statystyki: { osob: number; pokolen: number; malzenstw: number; nazwisk: number; najstarszy: { osoba: OsobaWidoczna; rok: number } | null; od: number | null; do: number | null };
  korzenId: string;
};

export type PodsumowanieDrzewa = {
  meta: DrzewoMeta;
  osob: number;
  pokolen: number;
  galezi: number;
  /** Najczęstsze nazwiska w drzewie (do wyszukiwania i opisów). */
  nazwiska: string[];
};

/** Okrawa dane osoby żyjącej wg polityki; osoby zmarłe zostają bez zmian. */
export function okroj(o: Osoba, polityka: PolitykaDat): OsobaWidoczna {
  if (!o.zyjaca || polityka === "pokaz") return o;
  const baza: OsobaWidoczna = {
    id: o.id,
    imie: o.imie,
    nazwisko: o.nazwisko,
    nazwiskoRodowe: o.nazwiskoRodowe,
    plec: o.plec,
    urodzenie: { dokladnosc: "nieznana" },
    ojciecId: o.ojciecId,
    matkaId: o.matkaId,
    galazId: o.galazId,
    zyjaca: true,
    niepewne: o.niepewne,
  };
  if (polityka === "ukryj") return { ...baza, ukryjDaty: true };
  const rok = o.urodzenie.wartosc?.slice(0, 4);
  return { ...baza, urodzenie: rok ? { wartosc: rok, dokladnosc: o.urodzenie.dokladnosc === "okolo" ? "okolo" : "rok" } : { dokladnosc: "nieznana" } };
}

/** Buduje wszystkie struktury pomocnicze drzewa. Czysta funkcja – bez dostępu do plików. */
export function przygotujDrzewo(meta: DrzewoMeta, rodzina: Rodzina): Drzewo {
  const pelne = new Map(rodzina.osoby.map((o) => [o.id, o]));
  const osobyLista = rodzina.osoby.map((o) => okroj(o, meta.politykaDatZyjacych));
  const osoby = new Map(osobyLista.map((o) => [o.id, o]));

  const dzieci = new Map<string, OsobaWidoczna[]>();
  for (const o of osobyLista) {
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
  osobyLista.forEach((o) => licz(o.id));
  for (const o of osobyLista) {
    if (o.ojciecId || o.matkaId) continue;
    const partnerzy = (malzonkowie.get(o.id) ?? []).filter((z) => z.osoba.ojciecId || z.osoba.matkaId);
    if (partnerzy.length) pokolenie.set(o.id, Math.max(...partnerzy.map((z) => pokolenie.get(z.osoba.id)!)));
  }
  for (const o of osobyLista) {
    if (o.ojciecId || o.matkaId) continue;
    const partnerzy = malzonkowie.get(o.id) ?? [];
    if (partnerzy.length) pokolenie.set(o.id, Math.max(pokolenie.get(o.id)!, ...partnerzy.map((z) => pokolenie.get(z.osoba.id)!)));
  }

  // Lata do statystyk liczymy z pełnych danych (zbiorczo, bez wskazywania osób).
  const lataOsoby = (id: string) => {
    const o = pelne.get(id)!;
    return [rokZdarzenia(o.urodzenie), rokZdarzenia(o.smierc)].filter((r): r is number => r !== null);
  };
  const zakres = (lista: OsobaWidoczna[]) => {
    const lata = lista.flatMap((o) => lataOsoby(o.id));
    return lata.length ? { od: Math.min(...lata), do: Math.max(...lata) } : { od: null, do: null };
  };
  const statystykiGalezi = rodzina.galezie.map((galaz) => {
    const lista = osobyLista.filter((o) => o.galazId === galaz.id);
    const zalozyciel = lista.slice().sort((a, b) => pokolenie.get(a.id)! - pokolenie.get(b.id)!).find((o) => o.ojciecId || o.matkaId) ?? lista[0];
    return { galaz, osob: lista.length, ...zakres(lista), zalozycielId: zalozyciel?.id ?? null };
  });

  let najstarszy: Drzewo["statystyki"]["najstarszy"] = null;
  for (const o of osobyLista) {
    const rok = rokZdarzenia(o.urodzenie) ?? rokZdarzenia(o.smierc);
    if (rok !== null && (!najstarszy || rok < najstarszy.rok)) najstarszy = { osoba: o, rok };
  }
  const korzen = osobyLista.find((o) => !o.ojciecId && !o.matkaId && (dzieci.get(o.id)?.length ?? 0) > 0) ?? osobyLista[0];

  return {
    meta,
    osobyLista,
    osoby,
    malzenstwa: rodzina.malzenstwa,
    galezieLista: rodzina.galezie,
    dzieci,
    malzonkowie,
    pokolenie,
    galezie: new Map(rodzina.galezie.map((g) => [g.id, g])),
    statystykiGalezi,
    statystyki: {
      osob: osobyLista.length,
      pokolen: Math.max(...pokolenie.values()),
      malzenstw: rodzina.malzenstwa.length,
      nazwisk: new Set(osobyLista.map((o) => o.nazwisko).filter(Boolean)).size,
      najstarszy,
      ...zakres(osobyLista),
    },
    korzenId: korzen.id,
  };
}

/** Statystyki widoku gałęzi: zwykła gałąź albo „Całe drzewo”. Pień wspólny nie ma własnego widoku. */
export function statystykaWidoku(d: Drzewo, id: string): StatystykiGalezi | undefined {
  if (id === ID_CALEGO) return { galaz: CALE_DRZEWO, osob: d.statystyki.osob, od: d.statystyki.od, do: d.statystyki.do, zalozycielId: d.korzenId };
  return d.statystykiGalezi.find((x) => x.galaz.id === id && !x.galaz.wspolna);
}

export function podsumuj(d: Drzewo): PodsumowanieDrzewa {
  const licznik = new Map<string, number>();
  for (const o of d.osobyLista) if (o.nazwisko) licznik.set(o.nazwisko, (licznik.get(o.nazwisko) ?? 0) + 1);
  const nazwiska = [...licznik.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pl")).slice(0, 12).map(([n]) => n);
  return { meta: d.meta, osob: d.statystyki.osob, pokolen: d.statystyki.pokolen, galezi: d.galezieLista.length, nazwiska };
}

// ───────────────────────────── pomocnicze dla widoków ─────────────────────────────

export { opisZdarzenia, czyZmarla } from "./panel";

export type { OsobaPanelu } from "./panel";

export type DaneWidoku = { osoby: OsobaPanelu[]; pary: ParaDrzewa[]; galezie: Galaz[] };

/** Dane przekazywane do komponentów klienckich (lista gałęzi, diagram, panel osoby). */
export function daneWidoku(d: Drzewo): DaneWidoku {
  return {
    osoby: d.osobyLista.map((o) => osobaPanelu(o, d.pokolenie.get(o.id)!)),
    pary: d.malzenstwa.map((m) => ({ a: m.osobaAId, b: m.osobaBId, kolejnosc: m.kolejnosc })),
    galezie: d.galezieLista,
  };
}

/** Ścieżka pochodzenia od najdalszego znanego przodka do osoby (po linii z dłuższym rodowodem). */
export function sciezkaPochodzenia(d: Drzewo, id: string): OsobaWidoczna[] {
  const sciezka: OsobaWidoczna[] = [];
  let o: OsobaWidoczna | undefined = d.osoby.get(id);
  while (o) {
    sciezka.unshift(o);
    const rodzice: OsobaWidoczna[] = [o.ojciecId, o.matkaId].filter((r): r is string => !!r).map((r) => d.osoby.get(r)!);
    const zRodowodem = rodzice.filter((r) => r.ojciecId || r.matkaId);
    o = (zRodowodem.length ? zRodowodem : rodzice).sort((a, b) => d.pokolenie.get(b.id)! - d.pokolenie.get(a.id)!)[0];
  }
  return sciezka;
}

export { pelneImie };

/** Wpisy indeksu wyszukiwania osób drzewa (serwowane jako /dane/szukaj-<slug>.json albo liczone w przeglądarce). */
export function indeksSzukaniaDrzewa(d: Drzewo): WpisSzukania[] {
  return d.osobyLista.map((o) => ({
    id: o.id,
    i: o.imie,
    n: o.nazwisko,
    ...(o.nazwiskoRodowe ? { r: o.nazwiskoRodowe } : {}),
    l: lataZycia(o),
    g: o.galazId,
    y: [rokZdarzenia(o.urodzenie), rokZdarzenia(o.smierc)].filter((r): r is number => r !== null),
  }));
}
