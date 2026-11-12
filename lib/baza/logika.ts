/**
 * Czysta logika zmian w drzewie użytkownika. Każda zmiana to funkcja DaneDb → DaneDb, więc ta sama funkcja
 * działa natychmiast w przeglądarce i ponownie – na najnowszych danych – w transakcji Firestore.
 */
import { domyslnieZyjaca } from "../zyjace";
import { okroj } from "../dane-czyste";
import { zastosujPatch, type NowaOsoba, type PatchOsoby } from "../edycje";
import type { Galaz, Malzenstwo, Osoba } from "../schemat";
import type { PolitykaDat } from "../schemat-drzewa";
import { walidujRodzine } from "../walidacja";
import { MAKS_OSOB, type DaneDb, type MetaDb, type StatystykiDb } from "./typy";

export const DOMYSLNA_GALAZ: Galaz = { id: "glowna", nazwa: "Główna gałąź", kolor: "#3540d1", opis: "" };

export const pusteDane = (): DaneDb => ({ galezie: [{ ...DOMYSLNA_GALAZ }], osoby: [], malzenstwa: [] });

/** Usuwa wartości undefined (Firestore ich nie przyjmuje) i zwraca głęboką kopię. */
export const doFirestore = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Dane widoczne dla odwiedzających: osoby żyjące okrojone zgodnie z polityką drzewa. */
export function daneDlaGosci(d: DaneDb, polityka: PolitykaDat): DaneDb {
  return {
    galezie: d.galezie,
    malzenstwa: d.malzenstwa,
    osoby: d.osoby.map((o) => {
      const { ukryjDaty, ...reszta } = okroj(o, polityka);
      void ukryjDaty;
      return reszta;
    }),
  };
}

function pokolenia(d: DaneDb): number {
  const poId = new Map(d.osoby.map((o) => [o.id, o]));
  const pamiec = new Map<string, number>();
  const licz = (id: string, glebia = 0): number => {
    const znane = pamiec.get(id);
    if (znane) return znane;
    if (glebia > 200) return 1; // zabezpieczenie przed cyklem w uszkodzonych danych
    const o = poId.get(id);
    const rodzice = [o?.ojciecId, o?.matkaId].filter((r): r is string => !!r && poId.has(r));
    const p = rodzice.length ? Math.max(...rodzice.map((r) => licz(r, glebia + 1))) + 1 : 1;
    pamiec.set(id, p);
    return p;
  };
  return d.osoby.length ? Math.max(...d.osoby.map((o) => licz(o.id))) : 0;
}

export function statystykiDanych(d: DaneDb): StatystykiDb {
  return { osob: d.osoby.length, pokolen: pokolenia(d), galezi: d.galezie.length };
}

/** Lata skrajne policzone z danych dla gości – nie zdradzają dat osób, których dane są ukryte. */
export function zakresLatDanych(publiczne: DaneDb): MetaDb["zakresLat"] {
  const lata = publiczne.osoby.flatMap((o) => [o.urodzenie.wartosc, o.smierc?.wartosc]).filter((w): w is string => !!w).map((w) => Number(w.slice(0, 4)));
  return lata.length ? { od: Math.min(...lata), do: Math.max(...lata) } : null;
}

const u8 = (s: string) => new TextEncoder().encode(s).length;

/** Szacunek rozmiaru dokumentu Firestore (reguły z dokumentacji: nazwa pola + 1, string + 1, liczba 8, bool/null 1, dokument + 32). */
export function szacunekRozmiaru(v: unknown): number {
  if (v === null || v === undefined) return 1;
  if (typeof v === "string") return u8(v) + 1;
  if (typeof v === "number") return 8;
  if (typeof v === "boolean") return 1;
  if (Array.isArray(v)) return v.reduce((s: number, x) => s + szacunekRozmiaru(x), 0);
  return Object.entries(v as Record<string, unknown>).reduce((s, [k, x]) => s + u8(k) + 1 + szacunekRozmiaru(x), 0);
}

/** Dokument Firestore może mieć 1 MiB; zostawiamy zapas na różnice w liczeniu i dane przyszłych wersji. */
export const MAKS_ROZMIAR_DANYCH = 900 * 1024;

/** Sprawdza spójność danych tym samym schematem co build. Puste drzewo jest dozwolone. Rzuca Error z listą błędów. */
export function sprawdzDane(d: DaneDb): void {
  if (d.osoby.length > MAKS_OSOB) throw new Error(`Drzewo może mieć najwyżej ${MAKS_OSOB} osób.`);
  if (szacunekRozmiaru(d) + 32 > MAKS_ROZMIAR_DANYCH) throw new Error("Drzewo jest zbyt duże (limit ok. 900 KB danych). Skróć najdłuższe notatki albo podziel drzewo na dwa.");
  if (!d.osoby.length) return;
  try {
    walidujRodzine(d);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Dane drzewa są niespójne.");
  }
}

// ───────────────────────────── zmiany ─────────────────────────────

const polaczenie = (d: DaneDb, a: string, b: string) => d.malzenstwa.some((m) => (m.osobaAId === a && m.osobaBId === b) || (m.osobaAId === b && m.osobaBId === a));
const ileZwiazkow = (d: DaneDb, id: string) => d.malzenstwa.filter((m) => m.osobaAId === id || m.osobaBId === id).length;

function nowa(n: NowaOsoba): Osoba {
  const o: Osoba = { ...n, zyjaca: n.zyjaca ?? (domyslnieZyjaca(n.urodzenie, n.smierc) || undefined) };
  if (!o.zyjaca) delete o.zyjaca;
  return o;
}

function dodaj(d: DaneDb, n: NowaOsoba): DaneDb {
  if (d.osoby.some((o) => o.id === n.id)) throw new Error(`Osoba „${n.id}” już istnieje.`);
  if (d.osoby.length >= MAKS_OSOB) throw new Error(`Drzewo może mieć najwyżej ${MAKS_OSOB} osób.`);
  return { ...d, osoby: [...d.osoby, nowa(n)] };
}

/** Pierwsza osoba pustego drzewa albo dziecko (rodzice podani w NowaOsoba). */
export const dodajOsobe = (n: NowaOsoba) => (d: DaneDb) => dodaj(d, { ...n, galazId: n.galazId || d.galezie[0].id });

export const dodajMalzonka = (osobaId: string, n: NowaOsoba) => (d: DaneDb): DaneDb => {
  if (!d.osoby.some((o) => o.id === osobaId)) throw new Error("Osoba, której dopisujesz małżonka, już nie istnieje.");
  const zDodana = dodaj(d, { ...n, ojciecId: null, matkaId: null });
  const m: Malzenstwo = { osobaAId: osobaId, osobaBId: n.id, kolejnosc: ileZwiazkow(d, osobaId) + 1 };
  return { ...zDodana, malzenstwa: [...zDodana.malzenstwa, m] };
};

export const dodajRodzica = (dzieckoId: string, rola: "ojciec" | "matka", n: NowaOsoba) => (d: DaneDb): DaneDb => {
  const dziecko = d.osoby.find((o) => o.id === dzieckoId);
  if (!dziecko) throw new Error("Osoba, której dopisujesz rodzica, już nie istnieje.");
  const pole = rola === "ojciec" ? "ojciecId" : "matkaId";
  if (dziecko[pole]) throw new Error(`Ta osoba ma już wpisanego ${rola === "ojciec" ? "ojca" : "matkę"}.`);
  const drugiId = rola === "ojciec" ? dziecko.matkaId : dziecko.ojciecId;
  let wynik = dodaj(d, { ...n, ojciecId: null, matkaId: null, galazId: dziecko.galazId });
  wynik = { ...wynik, osoby: wynik.osoby.map((o) => (o.id === dzieckoId ? { ...o, [pole]: n.id } : o)) };
  if (drugiId && !polaczenie(wynik, drugiId, n.id)) {
    const k = Math.max(ileZwiazkow(wynik, drugiId), ileZwiazkow(wynik, n.id)) + 1;
    wynik = { ...wynik, malzenstwa: [...wynik.malzenstwa, { osobaAId: drugiId, osobaBId: n.id, kolejnosc: k }] };
  }
  return wynik;
};

export const zapiszOsobe = (id: string, patch: PatchOsoby) => (d: DaneDb): DaneDb => {
  if (!d.osoby.some((o) => o.id === id)) throw new Error("Ta osoba już nie istnieje.");
  return { ...d, osoby: d.osoby.map((o) => (o.id === id ? zastosujPatch(o, patch) : o)) };
};

/** Usuwa osobę, jej małżeństwa i odwołania dzieci do niej (dzieci zostają w drzewie bez tego rodzica). */
export const usunOsobe = (id: string) => (d: DaneDb): DaneDb => ({
  ...d,
  osoby: d.osoby.filter((o) => o.id !== id).map((o) => ({ ...o, ojciecId: o.ojciecId === id ? null : o.ojciecId, matkaId: o.matkaId === id ? null : o.matkaId })),
  malzenstwa: d.malzenstwa.filter((m) => m.osobaAId !== id && m.osobaBId !== id),
});

/** Osoby bez żadnych powiązań po usunięciu nie znikają same – informujemy o nich użytkownika. */
export function osieroceni(d: DaneDb, usuwanyId: string): string[] {
  return d.osoby.filter((o) => o.ojciecId === usuwanyId || o.matkaId === usuwanyId).map((o) => o.id);
}
