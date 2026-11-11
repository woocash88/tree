"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane";
import { ileOsob } from "@/lib/format";
import { sciezkaDrzewa, sciezkaIndeksuDrzew } from "@/lib/sciezki";
import { filtrujDrzewa } from "@/lib/szukaj-drzew";

/** Wyszukiwarka drzew na stronie głównej: wyniki pojawiają się pod polem. */
export function SzukajDrzew({ drzewa }: { drzewa: PodsumowanieDrzewa[] }) {
  const [q, setQ] = useState("");
  const wynik = useMemo(() => (q.trim() ? filtrujDrzewa(drzewa, q).slice(0, 6) : []), [drzewa, q]);
  return (
    <div role="search" className="mx-auto w-full max-w-2xl text-left">
      <label htmlFor="szukaj-drzew" className="sr-only">
        Szukaj drzewa po nazwie, nazwisku lub regionie
      </label>
      <div className="relative">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tekst-2">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12.8 12.8 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          id="szukaj-drzew"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          placeholder="Szukaj drzewa: nazwisko, region…"
          className="pole !min-h-14 w-full !rounded-2xl !pl-12 text-lg shadow-szklo"
        />
      </div>
      {q.trim() && (
        <ul aria-label="Znalezione drzewa" className="szklo mt-2 divide-y divide-kreska overflow-hidden !rounded-2xl">
          {wynik.length === 0 && <li className="px-4 py-3 text-tekst-2">Brak drzew dla „{q.trim()}”.</li>}
          {wynik.map((d) => (
            <li key={d.meta.slug}>
              <Link href={sciezkaDrzewa(d.meta.slug)} className="flex items-baseline gap-3 px-4 py-3 hover:bg-najazd">
                <span className="min-w-0 flex-1 truncate font-semibold">{d.meta.nazwa}</span>
                <span className="hidden shrink-0 text-sm text-tekst-2 sm:inline">{d.meta.region}</span>
                <span className="shrink-0 text-sm tabular-nums text-tekst-2">{ileOsob(d.osob)}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={`${sciezkaIndeksuDrzew()}?q=${encodeURIComponent(q.trim())}`} className="block px-4 py-2.5 text-sm font-medium text-akcent hover:bg-najazd">
              Pokaż w indeksie drzew →
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
