/**
 * Lokalne edycje osób. Strona jest statyczna (bez serwera), więc zmiany – poprawione imiona, nazwiska, daty
 * i dopisane dzieci – zapisują się w przeglądarce (localStorage) i są nakładane na dane z repozytorium.
 * Żeby zmiany trafiły do danych serwisu, pobiera się je jako plik JSON i stosuje poleceniem
 * `npm run zastosuj-edycje -- <slug> <plik.json>` (scripts/zastosuj-edycje.ts).
 * Moduł jest czysty (bez Reacta i dostępu do plików).
 */
import { lataZycia, normalizuj, wiek } from "./format";
import { czyZmarla, opisZdarzenia, osobaPanelu, type OsobaPanelu } from "./panel";
import type { DataZdarzenia, Osoba } from "./schemat";

/** Zmiana istniejącej osoby. `null` usuwa pole opcjonalne. Daty zawsze podajemy parą (urodzenie + śmierć). */
export type PatchOsoby = {
  imie?: string;
  nazwisko?: string;
  nazwiskoRodowe?: string | null;
  urodzenie?: DataZdarzenia;
  smierc?: DataZdarzenia | null;
  notatka?: string | null;
  plec?: Osoba["plec"];
  /** Osoba żyjąca – jej dane podlegają polityce dat drzewa. `null` zdejmuje flagę. */
  zyjaca?: boolean | null;
  /** Zmiana rodziców (tylko drzewa z bazy): identyfikator istniejącej osoby albo `null` = brak rodzica. */
  ojciecId?: string | null;
  matkaId?: string | null;
};

/** Dopisana osoba – dokładnie w formacie osoby z rodzina.json. */
export type NowaOsoba = Pick<Osoba, "id" | "imie" | "nazwisko" | "plec" | "urodzenie" | "ojciecId" | "matkaId" | "galazId"> & Partial<Pick<Osoba, "nazwiskoRodowe" | "smierc" | "notatka" | "zyjaca">>;

export type Edycje = { osoby: Record<string, PatchOsoby>; dodane: NowaOsoba[] };
export const PUSTE_EDYCJE: Edycje = { osoby: {}, dodane: [] };

export const liczbaZmian = (e: Edycje): number => Object.keys(e.osoby).length + e.dodane.length;

// ───────────────────────────── daty z formularza ─────────────────────────────

export type WynikDaty = { ok: true; data: DataZdarzenia | null } | { ok: false; blad: string };

function poprawnaData(r: number, m: number, d: number): boolean {
  const t = new Date(Date.UTC(r, m - 1, d));
  return t.getUTCFullYear() === r && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/**
 * Zamienia tekst z formularza na datę zdarzenia. Obsługiwane: „1891”, „4.03.1891”, „1891-03-04”,
 * „ok. 1891”, „?” (data nieznana), opcjonalnie z miejscem po przecinku: „4.03.1891, Kobylin”.
 * Pusty tekst = brak informacji (null).
 */
export function parsujDate(tekst: string): WynikDaty {
  const t = tekst.trim();
  if (!t) return { ok: true, data: null };
  const i = t.indexOf(",");
  const czescDaty = (i < 0 ? t : t.slice(0, i)).trim();
  const miejsce = i < 0 ? "" : t.slice(i + 1).trim();
  const m = miejsce ? { miejsce } : {};
  if (czescDaty === "?" || czescDaty === "") return { ok: true, data: { dokladnosc: "nieznana", ...m } };
  const okolo = /^ok\.?\s*(.+)$/i.exec(czescDaty);
  const goly = okolo ? okolo[1].trim() : czescDaty;
  let wartosc: string | null = null;
  let r = 0;
  let mm = 0;
  let d = 0;
  let wzor;
  if ((wzor = /^(\d{4})$/.exec(goly))) {
    r = Number(wzor[1]);
    wartosc = wzor[1];
  } else if ((wzor = /^(\d{4})-(\d{2})-(\d{2})$/.exec(goly))) {
    [r, mm, d] = [Number(wzor[1]), Number(wzor[2]), Number(wzor[3])];
    wartosc = goly;
  } else if ((wzor = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(goly))) {
    [d, mm, r] = [Number(wzor[1]), Number(wzor[2]), Number(wzor[3])];
    wartosc = `${wzor[3]}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (!wartosc) return { ok: false, blad: `Nie rozumiem daty „${czescDaty}”. Użyj np. 1891, 4.03.1891, ok. 1891 albo ? (data nieznana).` };
  if (r < 1000 || r > 2200) return { ok: false, blad: `Rok ${r} wygląda na pomyłkę.` };
  if (wartosc.length === 10 && !poprawnaData(r, mm, d)) return { ok: false, blad: `Taka data nie istnieje: ${czescDaty}.` };
  const dokladnosc = okolo ? "okolo" : wartosc.length === 10 ? "dokladna" : "rok";
  return { ok: true, data: { wartosc, dokladnosc, ...m } };
}

/** Odwrotność parsujDate dla pola formularza: „4.03.1891, Kobylin”, „ok. 1560”, „?”. */
export function tekstDaty(d?: DataZdarzenia | null): string {
  if (!d) return "";
  return opisZdarzenia(d) || "?";
}

// ───────────────────────────── nakładanie edycji ─────────────────────────────

/** Unikalne id nowej osoby: imie-nazwisko-rok (bez polskich znaków), przy powtórzeniu z numerem. */
export function noweId(imie: string, nazwisko: string, rok: number | null, zajete: ReadonlySet<string>): string {
  const baza = normalizuj(`${imie} ${nazwisko}${rok ? ` ${rok}` : ""}`).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "osoba";
  let id = baza;
  for (let n = 2; zajete.has(id); n++) id = `${baza}-${n}`;
  return id;
}

/** Osoby z naniesionymi edycjami. Osoby bez zmian zostają tym samym obiektem. */
export function naPanelu(bazowe: OsobaPanelu[], e: Edycje): OsobaPanelu[] {
  if (!liczbaZmian(e)) return bazowe;
  const wynik = bazowe.map((o) => {
    const p = e.osoby[o.id];
    if (!p) return o;
    const nowa: OsobaPanelu = { ...o };
    // Ręcznie wpisane imię lub nazwisko przestaje być „niepewne”.
    if (p.imie !== undefined || p.nazwisko !== undefined) nowa.niepewna = false;
    if (p.plec !== undefined) nowa.plec = p.plec;
    if (p.imie !== undefined) nowa.imie = p.imie;
    if (p.nazwisko !== undefined) nowa.nazwisko = p.nazwisko;
    if (p.nazwiskoRodowe !== undefined) {
      if (p.nazwiskoRodowe) nowa.rodowe = p.nazwiskoRodowe;
      else delete nowa.rodowe;
    }
    if (p.notatka !== undefined) {
      if (p.notatka) nowa.notatka = p.notatka;
      else delete nowa.notatka;
    }
    if (p.urodzenie !== undefined || p.smierc !== undefined) {
      const urodzenie = p.urodzenie ?? { dokladnosc: "nieznana" as const };
      const smierc = p.smierc ?? undefined;
      const dane = { urodzenie, smierc, zyjaca: false };
      const zmarla = czyZmarla(dane);
      nowa.lata = lataZycia(dane);
      nowa.ur = opisZdarzenia(urodzenie);
      nowa.zm = smierc ? opisZdarzenia(smierc) || "data nieznana" : zmarla ? "data nieznana" : "";
      nowa.wiek = wiek(dane);
      nowa.zmarla = zmarla;
      nowa.ukryta = false;
    }
    return nowa;
  });
  const pokolenie = new Map(wynik.map((o) => [o.id, o.pokolenie]));
  for (const n of e.dodane) {
    const rodzice = [n.ojciecId, n.matkaId].filter((r): r is string => !!r && pokolenie.has(r));
    const p = rodzice.length ? Math.max(...rodzice.map((r) => pokolenie.get(r)!)) + 1 : 1;
    pokolenie.set(n.id, p);
    wynik.push(osobaPanelu(n, p));
  }
  return wynik;
}

/** Plik do pobrania: zmiany w formacie zrozumiałym dla `npm run zastosuj-edycje`. */
export function doPliku(slug: string, e: Edycje): string {
  return JSON.stringify({ slug, wersja: 1, osoby: e.osoby, dodane: e.dodane }, null, 2) + "\n";
}

/** Nakłada zmianę na osobę z rodzina.json (`null` usuwa pole opcjonalne). */
export function zastosujPatch(o: Osoba, p: Partial<Osoba> | PatchOsoby): Osoba {
  const wynik: Record<string, unknown> = { ...o, ...p };
  for (const [k, v] of Object.entries(p)) if (v === null && k !== "ojciecId" && k !== "matkaId") delete wynik[k];
  if (o.niepewne && (p.imie !== undefined || p.nazwisko !== undefined)) {
    const zostaje = o.niepewne.filter((n) => !(n === "imie" && p.imie !== undefined) && !(n === "nazwisko" && p.nazwisko !== undefined));
    if (zostaje.length) wynik.niepewne = zostaje;
    else delete wynik.niepewne;
  }
  return wynik as Osoba;
}
