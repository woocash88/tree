"use client";

import { useEffect, useState } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane-czyste";
import { firebaseSkonfigurowany } from "@/lib/baza/firebase";
import { katalogPubliczny, type ZakresKatalogu } from "@/lib/baza/katalog";

/**
 * Publiczne drzewa użytkowników z bazy. Wynik jest wspólny dla wszystkich komponentów i trzymany w pamięci kilka minut
 * (lib/baza/katalog.ts), więc kilka użyć na jednej stronie to jedno zapytanie. `aktywne = false` odkłada pobranie do chwili,
 * gdy lista jest naprawdę potrzebna (np. dopiero po kliknięciu w wyszukiwarkę).
 */
export function useDrzewaPubliczne(zakres: ZakresKatalogu = "wszystkie", aktywne = true): PodsumowanieDrzewa[] {
  const [lista, setLista] = useState<PodsumowanieDrzewa[]>([]);
  useEffect(() => {
    if (!firebaseSkonfigurowany || !aktywne) return;
    let trwa = true;
    katalogPubliczny(zakres)
      .then((w) => trwa && setLista(w))
      .catch(() => {});
    return () => {
      trwa = false;
    };
  }, [zakres, aktywne]);
  return lista;
}
