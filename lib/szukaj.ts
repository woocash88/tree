import { normalizuj } from "./format";

/** Wpis indeksu wyszukiwania (krótkie klucze – plik jest pobierany przez przeglądarkę). */
export type WpisSzukania = { id: string; i: string; n: string; r?: string; l: string; g: string; y: number[] };

export type WpisPrzygotowany = WpisSzukania & { slowa: string[]; calosc: string; lata: string[] };

export function przygotujIndeks(indeks: WpisSzukania[]): WpisPrzygotowany[] {
  return indeks.map((w) => {
    const calosc = normalizuj([w.i, w.n, w.r ?? ""].join(" "));
    return { ...w, calosc, slowa: calosc.split(/[\s-]+/).filter(Boolean), lata: w.y.map(String) };
  });
}

/**
 * Szuka po imieniu, nazwisku, nazwisku rodowym i roku. Każde słowo zapytania musi pasować
 * do początku któregoś słowa (albo – słabiej – do jego środka); liczby pasują do lat.
 * Polskie znaki i wielkość liter są ignorowane.
 */
export function szukaj(indeks: WpisPrzygotowany[], zapytanie: string, limit = 8): { trafienia: WpisPrzygotowany[]; razem: number } {
  const slowa = normalizuj(zapytanie).split(/[\s,]+/).filter(Boolean);
  if (!slowa.length) return { trafienia: [], razem: 0 };
  const ocenione: { w: WpisPrzygotowany; ocena: number }[] = [];
  for (const w of indeks) {
    let ocena = 0;
    let pasuje = true;
    for (const s of slowa) {
      let najlepsza = 0;
      if (/^\d+$/.test(s)) {
        if (w.lata.some((r) => r === s)) najlepsza = 8;
        else if (s.length >= 2 && w.lata.some((r) => r.startsWith(s))) najlepsza = 4;
      }
      for (const slowo of w.slowa) {
        if (slowo === s) najlepsza = Math.max(najlepsza, 10);
        else if (slowo.startsWith(s)) najlepsza = Math.max(najlepsza, 7);
        else if (s.length >= 3 && slowo.includes(s)) najlepsza = Math.max(najlepsza, 2);
      }
      if (!najlepsza) {
        pasuje = false;
        break;
      }
      ocena += najlepsza;
    }
    if (pasuje) ocenione.push({ w, ocena });
  }
  ocenione.sort((a, b) => b.ocena - a.ocena || (a.w.y[0] ?? 9999) - (b.w.y[0] ?? 9999) || a.w.calosc.localeCompare(b.w.calosc));
  return { trafienia: ocenione.slice(0, limit).map((o) => o.w), razem: ocenione.length };
}
