/**
 * Pola formularza daty (dzień, miesiąc, rok, „około”, „data nieznana”, miejsce) i ich zamiana na tekst zrozumiały dla `parsujDate`
 * (lib/edycje.ts) oraz z powrotem. Moduł czysty – używa go komponent PoleDaty.
 */
import { parsujDate } from "./edycje";

export type PolaDaty = { dzien: string; miesiac: string; rok: string; okolo: boolean; nieznana: boolean; miejsce: string };

export const PUSTE_POLA: PolaDaty = { dzien: "", miesiac: "", rok: "", okolo: false, nieznana: false, miejsce: "" };

export const MIESIACE = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];

/** Pola z tekstu daty („4.03.1891, Kobylin”, „ok. 1891”, „?”); tekst, którego nie da się odczytać, daje puste pola. */
export function polaZTekstu(tekst: string): PolaDaty {
  const w = parsujDate(tekst);
  if (!w.ok || !w.data) return { ...PUSTE_POLA };
  const d = w.data;
  const miejsce = d.miejsce ?? "";
  if (d.dokladnosc === "nieznana" || !d.wartosc) return { ...PUSTE_POLA, nieznana: true, miejsce };
  const [rok, mies, dzien] = d.wartosc.split("-");
  return { dzien: dzien ? String(Number(dzien)) : "", miesiac: mies ? String(Number(mies)) : "", rok, okolo: d.dokladnosc === "okolo", nieznana: false, miejsce };
}

/** Tekst daty dla `parsujDate`; niepełne kombinacje (np. sam dzień) dają tekst, który parser odrzuci z komunikatem. */
export function tekstZPol(p: PolaDaty): string {
  const miejsce = p.miejsce.trim();
  const dopisek = miejsce ? `, ${miejsce}` : "";
  const dzien = p.dzien.trim();
  const rok = p.rok.trim();
  if (p.nieznana) return `?${dopisek}`;
  if (!rok && !dzien && !p.miesiac) return miejsce ? `?${dopisek}` : "";
  const baza = dzien && p.miesiac ? `${dzien}.${p.miesiac}.${rok}` : dzien || p.miesiac ? `${dzien || "?"}.${p.miesiac || "?"}.${rok}` : rok;
  return `${p.okolo ? "ok. " : ""}${baza}${dopisek}`;
}

/** Komunikat o błędzie w polach daty (pusty tekst, gdy wszystko w porządku albo pola są jeszcze puste). */
export function bladPol(p: PolaDaty): string {
  if (p.nieznana) return "";
  const rok = p.rok.trim();
  const dzien = p.dzien.trim();
  if (!rok && (dzien || p.miesiac)) return "Podaj rok.";
  if (rok && (dzien ? !p.miesiac : !!p.miesiac)) return "Podaj dzień razem z miesiącem albo zostaw tylko rok.";
  if (dzien && !/^\d{1,2}$/.test(dzien)) return "Dzień to liczba od 1 do 31.";
  if (rok && !/^\d{4}$/.test(rok)) return "Rok wpisz czterema cyframi, np. 1891.";
  const w = parsujDate(tekstZPol(p));
  return w.ok ? "" : w.blad;
}
