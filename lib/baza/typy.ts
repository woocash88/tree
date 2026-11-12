/** Typy danych trzymanych w Firestore (drzewa użytkowników). Moduł czysty – bez Firebase i Reacta. */
import type { Galaz, Malzenstwo, Osoba } from "../schemat";
import type { PolitykaDat } from "../schemat-drzewa";

export type Widocznosc = "publiczne" | "prywatne";
export type StatystykiDb = { osob: number; pokolen: number; galezi: number };

/** Dokument drzewa: drzewa/{id}. Nie zawiera adresów e-mail – bywa publiczny. */
export type MetaDb = {
  nazwa: string;
  opis: string;
  region: string;
  widocznosc: Widocznosc;
  politykaDatZyjacych: PolitykaDat;
  wlascicielId: string;
  wlascicielNazwa: string;
  /** uid kolaborantów (mogą edytować osoby, nie ustawienia drzewa). */
  kolaboranci: string[];
  kolaboranciInfo: Record<string, { nazwa: string }>;
  zakresLat: { od: number; do: number } | null;
  statystyki: StatystykiDb;
  utworzono: string;
  zaktualizowano: string;
};

/** Dokumenty drzewa/{id}/dane/pelne (tylko dla zarządzających) i drzewa/{id}/dane/publiczne (po polityce dat). */
export type DaneDb = { galezie: Galaz[]; osoby: Osoba[]; malzenstwa: Malzenstwo[] };

export type Profil = { imie: string; nazwisko: string; email: string; utworzono: string };

export type Dostep = "wlasciciel" | "kolaborant" | "admin" | "gosc";

/** Twardy limit osób w jednym drzewie (dokument Firestore ma najwyżej 1 MiB). */
export const MAKS_OSOB = 2000;
export const MAKS_KOLABORANTOW = 20;

export const mozeEdytowacDane = (d: Dostep) => d !== "gosc";
export const mozeZarzadzac = (d: Dostep) => d === "wlasciciel" || d === "admin";

/** Prośba użytkownika o dołączenie do cudzego drzewa jako kolaborant: prosby/{idDrzewa}_{uid}. */
export type Prosba = { id: string; drzewoId: string; uid: string; nazwa: string; utworzono: string };

/** Wyciąga identyfikator drzewa z linku (…/d/?id=XYZ…) albo z samego identyfikatora wklejonego przez użytkownika. */
export function idDrzewaZTekstu(tekst: string): string {
  const t = tekst.trim();
  const zLinku = /[?&]id=([A-Za-z0-9_-]+)/.exec(t);
  const id = zLinku ? zLinku[1] : t;
  return /^[A-Za-z0-9]{10,40}$/.test(id) ? id : "";
}
