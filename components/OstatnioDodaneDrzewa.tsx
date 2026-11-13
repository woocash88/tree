"use client";

import { useMemo } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane-czyste";
import { KartaDrzewa } from "./KartaDrzewa";
import { useDrzewaPubliczne } from "./db/useDrzewaPubliczne";

const LICZBA_KART = 6;

/** Ostatnio dodane drzewa na stronie głównej: najnowsze publiczne drzewa użytkowników (i ewentualne drzewa z repozytorium). */
export function OstatnioDodaneDrzewa({ zRepozytorium }: { zRepozytorium: PodsumowanieDrzewa[] }) {
  const zBazy = useDrzewaPubliczne("ostatnie");
  const lista = useMemo(
    () => [...zRepozytorium, ...zBazy].sort((a, b) => (b.utworzono ?? b.meta.zaktualizowano).localeCompare(a.utworzono ?? a.meta.zaktualizowano)).slice(0, LICZBA_KART),
    [zRepozytorium, zBazy],
  );
  if (!lista.length) return null;
  return (
    <section aria-labelledby="ostatnio-dodane" className="mt-4">
      <h2 id="ostatnio-dodane" className="text-2xl">
        Ostatnio dodane drzewa
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((d) => (
          <li key={d.meta.slug}>
            <KartaDrzewa drzewo={d} />
          </li>
        ))}
      </ul>
    </section>
  );
}
