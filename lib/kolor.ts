/** Czarny albo biały tekst – zależnie od jasności tła w formacie #rrggbb (kontrast WCAG). */
export function tekstNaKolorze(hex: string): "#ffffff" | "#0b1020" {
  const kanal = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminancja = 0.2126 * kanal(0) + 0.7152 * kanal(1) + 0.0722 * kanal(2);
  // Kontrast z bielą: 1.05 / (L + 0.05); z ciemnym tekstem (L ≈ 0.006): (L + 0.05) / 0.056.
  return 1.05 / (luminancja + 0.05) >= (luminancja + 0.05) / 0.056 ? "#ffffff" : "#0b1020";
}

/** Kolory kropek według pokolenia (od pokolenia 1; po wyczerpaniu paleta się powtarza). Dobrze widoczne w obu motywach. */
export const KOLORY_POKOLEN = ["#3b82f6", "#06b6d4", "#10b981", "#84a50d", "#d89b06", "#f97316", "#ef4444", "#d946ef", "#8b5cf6"];
export const kolorPokolenia = (pokolenie: number): string => KOLORY_POKOLEN[(Math.max(1, pokolenie) - 1) % KOLORY_POKOLEN.length];
