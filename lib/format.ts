import type { DataZdarzenia } from "./schemat";

/** Minimalny kształt osoby potrzebny do formatowania dat (pasuje i do pełnej osoby, i do wersji okrojonej). */
export type ZDatami = {
  urodzenie: DataZdarzenia;
  smierc?: DataZdarzenia;
  ukryjDaty?: boolean;
};

/** Usuwa polskie znaki i wielkość liter: "Łukasz Żyto" → "lukasz zyto". */
export function normalizuj(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function pelneImie(o: { imie: string; nazwisko: string }): string {
  return `${o.imie || "NN"} ${o.nazwisko || "NN"}`;
}

export function rokZdarzenia(d?: DataZdarzenia): number | null {
  return d?.wartosc ? Number(d.wartosc.slice(0, 4)) : null;
}

/** "1953-03-04" → "4.03.1953", "1953" → "1953", z przedrostkiem "ok." dla dat przybliżonych. */
export function formatDaty(d: DataZdarzenia, tylkoRok = false): string {
  if (!d.wartosc) return "";
  let tekst = d.wartosc.slice(0, 4);
  if (!tylkoRok && d.wartosc.length === 10) {
    const [r, m, dz] = d.wartosc.split("-");
    tekst = `${Number(dz)}.${m}.${r}`;
  }
  return d.dokladnosc === "okolo" ? `ok. ${tekst}` : tekst;
}

/**
 * Krótki opis lat życia: "ok. 1560–1610", "1891–1973", "ur. 4.03.1953", "† 1855".
 * Dla osób z flagą ukryjDaty zawsze pusty.
 */
export function lataZycia(o: ZDatami): string {
  if (o.ukryjDaty) return "";
  const ur = o.urodzenie.wartosc ? o.urodzenie : null;
  const zm = o.smierc?.wartosc ? o.smierc : null;
  if (ur && zm) return `${formatDaty(ur, true)}–${formatDaty(zm, true)}`;
  if (ur) return `ur. ${formatDaty(ur)}${o.smierc ? " †" : ""}`;
  if (zm) return `† ${formatDaty(zm)}`;
  return o.smierc ? "†" : "";
}

export function odmien(n: number, jeden: string, kilka: string, wiele: string): string {
  if (n === 1) return jeden;
  const j = n % 10;
  const d = n % 100;
  return j >= 2 && j <= 4 && (d < 12 || d > 14) ? kilka : wiele;
}

/** Wiek w chwili śmierci, np. "73 lata", "ok. 40 lat", "5 dni". Null, gdy brakuje którejś daty. */
export function wiek(o: ZDatami): string | null {
  if (o.ukryjDaty) return null;
  const ur = o.urodzenie;
  const zm = o.smierc;
  if (!ur.wartosc || !zm?.wartosc) return null;
  const dokladnie = ur.dokladnosc === "dokladna" && zm.dokladnosc === "dokladna";
  if (dokladnie) {
    const a = new Date(ur.wartosc + "T00:00:00Z");
    const b = new Date(zm.wartosc + "T00:00:00Z");
    let lata = b.getUTCFullYear() - a.getUTCFullYear();
    let miesiace = b.getUTCMonth() - a.getUTCMonth();
    if (b.getUTCDate() < a.getUTCDate()) miesiace -= 1;
    if (miesiace < 0) {
      lata -= 1;
      miesiace += 12;
    }
    if (lata >= 1) return `${lata} ${odmien(lata, "rok", "lata", "lat")}`;
    if (miesiace >= 1) return `${miesiace} ${odmien(miesiace, "miesiąc", "miesiące", "miesięcy")}`;
    const dni = Math.round((b.getTime() - a.getTime()) / 86400000);
    return dni === 0 ? "mniej niż 1 dzień" : `${dni} ${odmien(dni, "dzień", "dni", "dni")}`;
  }
  const lata = rokZdarzenia(zm)! - rokZdarzenia(ur)!;
  return `ok. ${lata} ${odmien(lata, "rok", "lata", "lat")}`;
}

export const ileOsob = (n: number) => `${n} ${odmien(n, "osoba", "osoby", "osób")}`;
export const ilePokolen = (n: number) => `${n} ${odmien(n, "pokolenie", "pokolenia", "pokoleń")}`;
export const ileGalezi = (n: number) => `${n} ${odmien(n, "gałąź", "gałęzie", "gałęzi")}`;

/** "2026-11-11" → "11.11.2026". */
export function dataPL(iso: string): string {
  const [r, m, d] = iso.split("-");
  return `${Number(d)}.${m}.${r}`;
}

/** Stulecie rzymską cyfrą dla roku: 1780 → "XVIII". */
export function stulecie(rok: number): { nr: number; etykieta: string } {
  const nr = Math.floor((rok - 1) / 100) + 1;
  const rzymskie: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let n = nr;
  let s = "";
  for (const [w, z] of rzymskie) while (n >= w) { s += z; n -= w; }
  return { nr, etykieta: `${s} w.` };
}
