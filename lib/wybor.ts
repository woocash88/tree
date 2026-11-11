"use client";
/**
 * Most między wyszukiwarką w nagłówku a płótnem drzewa: gdy drzewo jest na ekranie,
 * rejestruje tu swoją obsługę wyboru osoby (rozwiń, przesuń, podświetl).
 * Poza drzewem wybór wyniku prowadzi do widoku osoby.
 */
type Obsluga = (osobaId: string) => void;
let obsluga: Obsluga | null = null;

export function ustawObslugeWyboru(o: Obsluga | null) {
  obsluga = o;
}
export function obslugaWyboru(): Obsluga | null {
  return obsluga;
}
