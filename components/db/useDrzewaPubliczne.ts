"use client";

import { useEffect, useState } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane-czyste";
import { listaPublicznych } from "@/lib/baza/api";
import { firebaseSkonfigurowany } from "@/lib/baza/firebase";
import { podsumowanieZBazy } from "@/lib/baza/widok";

/** Publiczne drzewa użytkowników z bazy (ładowane w przeglądarce); przy braku konfiguracji lub błędzie – pusta lista. */
export function useDrzewaPubliczne(): PodsumowanieDrzewa[] {
  const [lista, setLista] = useState<PodsumowanieDrzewa[]>([]);
  useEffect(() => {
    if (!firebaseSkonfigurowany) return;
    let aktywne = true;
    listaPublicznych()
      .then((w) => aktywne && setLista(w.filter((x) => x.meta.statystyki.osob > 0).map((x) => podsumowanieZBazy(x.id, x.meta))))
      .catch(() => {});
    return () => {
      aktywne = false;
    };
  }, []);
  return lista;
}
