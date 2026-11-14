"use client";

import { useCallback, useEffect, useState } from "react";
import { liczbaNieprzeczytanych, ZDARZENIE_WIADOMOSCI } from "@/lib/baza/api";
import { useKonto } from "./AuthProvider";

const CO_ILE_MS = 3 * 60 * 1000;

/**
 * Liczba nowych wiadomości z formularza kontaktowego – tylko dla administratora (dla pozostałych zawsze 0 i bez zapytań).
 * Odświeża się przy wejściu, po powrocie do karty, co kilka minut i po przeczytaniu/usunięciu wiadomości w panelu.
 */
export function useNieprzeczytane(): number {
  const { czyAdmin } = useKonto();
  const [ile, setIle] = useState(0);
  const odswiez = useCallback(async () => {
    try {
      setIle(await liczbaNieprzeczytanych());
    } catch {
      /* licznik jest dodatkiem – błąd go nie wyświetla */
    }
  }, []);
  useEffect(() => {
    if (!czyAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pierwsze pobranie licznika po zalogowaniu administratora
    void odswiez();
    const stoper = setInterval(odswiez, CO_ILE_MS);
    window.addEventListener("focus", odswiez);
    window.addEventListener(ZDARZENIE_WIADOMOSCI, odswiez);
    return () => {
      clearInterval(stoper);
      window.removeEventListener("focus", odswiez);
      window.removeEventListener(ZDARZENIE_WIADOMOSCI, odswiez);
    };
  }, [czyAdmin, odswiez]);
  return czyAdmin ? ile : 0;
}
