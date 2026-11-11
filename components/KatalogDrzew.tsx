"use client";

import { useEffect, useMemo, useState } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane";
import { filtrujDrzewa, SORTOWANIA, sortujDrzewa, type Sortowanie } from "@/lib/szukaj-drzew";
import { KartaDrzewa } from "./KartaDrzewa";

/** Indeks drzew: wyszukiwanie po nazwie, nazwisku i regionie oraz sortowanie. Stan w adresie (?q=&sort=). */
export function KatalogDrzew({ drzewa }: { drzewa: PodsumowanieDrzewa[] }) {
  const [q, setQ] = useState("");
  const [sortowanie, setSortowanie] = useState<Sortowanie>("alfabetycznie");
  const [gotowe, setGotowe] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get("sort");
    /* eslint-disable react-hooks/set-state-in-effect -- jednorazowe odczytanie adresu po zamontowaniu (strona jest statyczna) */
    setQ(p.get("q") ?? "");
    if (SORTOWANIA.some((x) => x.wartosc === s)) setSortowanie(s as Sortowanie);
    setGotowe(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (!gotowe) return;
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sortowanie !== "alfabetycznie") p.set("sort", sortowanie);
    const s = p.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [gotowe, q, sortowanie]);

  const wynik = useMemo(() => sortujDrzewa(filtrujDrzewa(drzewa, q), sortowanie), [drzewa, q, sortowanie]);

  return (
    <div>
      <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={(e) => e.preventDefault()} role="search" aria-label="Szukaj drzew">
        <label className="block text-sm text-tekst-2">
          Nazwa, nazwisko lub region
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="pole mt-1 w-full" placeholder="np. nazwisko rodziny albo region" />
        </label>
        <label className="block text-sm text-tekst-2">
          Sortuj
          <select value={sortowanie} onChange={(e) => setSortowanie(e.target.value as Sortowanie)} className="pole mt-1 block w-full sm:w-56">
            {SORTOWANIA.map((s) => (
              <option key={s.wartosc} value={s.wartosc}>
                {s.etykieta}
              </option>
            ))}
          </select>
        </label>
      </form>
      <p role="status" aria-live="polite" className="mt-4 text-sm text-tekst-2">
        {wynik.length === drzewa.length ? `Drzew: ${drzewa.length}` : `Znaleziono ${wynik.length} z ${drzewa.length} drzew`}
      </p>
      {wynik.length === 0 ? (
        <p className="szklo mt-4 p-6 text-center text-tekst-2">Żadne drzewo nie pasuje do „{q}”. Spróbuj samego nazwiska lub nazwy miejscowości.</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wynik.map((d) => (
            <li key={d.meta.slug}>
              <KartaDrzewa drzewo={d} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
