import type { DataZdarzenia } from "./schemat";

/** Osoba urodzona po tym roku i bez daty śmierci jest domyślnie traktowana jako żyjąca (jej dane podlegają polityce drzewa). */
export const ROK_GRANICZNY_ZYJACYCH = 1925;

export function domyslnieZyjaca(urodzenie?: DataZdarzenia | null, smierc?: DataZdarzenia | null): boolean {
  if (smierc) return false;
  const rok = urodzenie?.wartosc ? Number(urodzenie.wartosc.slice(0, 4)) : null;
  return rok !== null && rok > ROK_GRANICZNY_ZYJACYCH;
}
