"use client";

import { useEffect, useState } from "react";

/**
 * „Stwórz drzewo” ze strony głównej przekierowuje niezalogowanych do logowania lub rejestracji z parametrem ?po=nowe.
 * Po zalogowaniu użytkownik trafia do profilu z otwartym formularzem nowego drzewa (?nowe=1).
 */
export const PARAM_PO = "po";
export const WARTOSC_PO_NOWE = "nowe";
export const ADRES_NOWEGO_DRZEWA = "/profil/?nowe=1";

const czyPoNowe = () => {
  try {
    return new URLSearchParams(window.location.search).get(PARAM_PO) === WARTOSC_PO_NOWE;
  } catch {
    return false;
  }
};

/** Dokąd przejść po udanym logowaniu lub rejestracji. */
export const celPoLogowaniu = () => (czyPoNowe() ? ADRES_NOWEGO_DRZEWA : "/profil/");

/** Czy użytkownik przyszedł tu z przycisku „Stwórz drzewo” (pokazujemy wtedy wyjaśnienie i zachowujemy cel przy przełączaniu logowanie ↔ rejestracja). */
export function useChceStworzycDrzewo(): boolean {
  const [tak, setTak] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- jednorazowy odczyt adresu po zamontowaniu (strona jest statyczna)
    setTak(czyPoNowe());
  }, []);
  return tak;
}
