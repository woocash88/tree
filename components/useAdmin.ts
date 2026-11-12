"use client";

import { useSyncExternalStore } from "react";
import { SKROT_ADMINA, sprawdzHaslo } from "@/lib/admin";

/**
 * Stan trybu administratora w tej przeglądarce (localStorage, klucz „admin”). Zapamiętujemy skrót,
 * na który zalogowano – po zmianie hasła (npm run ustaw-haslo) stare sesje przestają być ważne.
 */
const KLUCZ = "admin";
let wPamieci: string | null = null;
const sluchacze = new Set<() => void>();

function odczytaj(): boolean {
  if (!SKROT_ADMINA) return false;
  try {
    return localStorage.getItem(KLUCZ) === SKROT_ADMINA;
  } catch {
    return wPamieci === SKROT_ADMINA;
  }
}

function ustaw(wartosc: string | null) {
  wPamieci = wartosc;
  try {
    if (wartosc) localStorage.setItem(KLUCZ, wartosc);
    else localStorage.removeItem(KLUCZ);
  } catch {
    /* zablokowany localStorage – sesja trwa do odświeżenia strony */
  }
  sluchacze.forEach((f) => f());
}

function subskrybuj(zmiana: () => void) {
  sluchacze.add(zmiana);
  window.addEventListener("storage", zmiana);
  return () => {
    sluchacze.delete(zmiana);
    window.removeEventListener("storage", zmiana);
  };
}

/** Czy w tej przeglądarce włączony jest tryb administratora. Przy renderowaniu statycznym zawsze false. */
export function useCzyAdmin(): boolean {
  return useSyncExternalStore(subskrybuj, odczytaj, () => false);
}

export async function zalogujAdmina(haslo: string): Promise<boolean> {
  const ok = await sprawdzHaslo(haslo);
  if (ok) ustaw(SKROT_ADMINA);
  return ok;
}

export function wylogujAdmina() {
  ustaw(null);
}
