"use client";

import { useMemo } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane-czyste";
import { KartaDrzewa } from "./KartaDrzewa";
import { useDrzewaPubliczne } from "./db/useDrzewaPubliczne";

/** Polecane drzewa na stronie głównej: wyróżnione drzewa z repozytorium, a poza nimi największe i najnowsze publiczne drzewa użytkowników. */
export function PolecaneDrzewa({ zRepozytorium }: { zRepozytorium: PodsumowanieDrzewa[] }) {
  const zBazy = useDrzewaPubliczne();
  const lista = useMemo(() => {
    const wyrozniane = zRepozytorium.filter((d) => d.meta.wyrozniane);
    const reszta = [...zRepozytorium.filter((d) => !d.meta.wyrozniane), ...zBazy].sort((a, b) => b.osob - a.osob || b.meta.zaktualizowano.localeCompare(a.meta.zaktualizowano));
    return [...wyrozniane, ...reszta].slice(0, 6);
  }, [zRepozytorium, zBazy]);
  if (!lista.length) return null;
  return (
    <section aria-labelledby="wyrozniane" className="mt-4">
      <h2 id="wyrozniane" className="text-2xl">
        Polecane drzewa
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
