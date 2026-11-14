"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane-czyste";
import { ileOsob } from "@/lib/format";
import { sciezkaDrzewa, sciezkaIndeksuDrzew } from "@/lib/sciezki";
import { drzewaZNazwiskiem, filtrujDrzewa, pasujaceNazwiska } from "@/lib/szukaj-drzew";
import { useDrzewaPubliczne } from "./db/useDrzewaPubliczne";

/**
 * Wyszukiwarka drzew na stronie głównej (wzór „glass”): wyniki pojawiają się pod polem, „Szukaj” otwiera indeks drzew.
 * Skrót „/” ustawia fokus w polu. Styl pochodzi z klas .glowna (app/globals.css).
 */
export function SzukajDrzew({ drzewa: drzewaZRepozytorium }: { drzewa: PodsumowanieDrzewa[] }) {
  // Pełną listę drzew z bazy pobieramy dopiero, gdy ktoś kliknie w pole wyszukiwania (oszczędność odczytów).
  const [uzywane, setUzywane] = useState(false);
  const zBazy = useDrzewaPubliczne(uzywane);
  const drzewa = useMemo(() => [...drzewaZRepozytorium, ...zBazy], [drzewaZRepozytorium, zBazy]);
  const [q, setQ] = useState("");
  const pole = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const zapytanie = q.trim();
  const wynik = useMemo(() => (zapytanie ? filtrujDrzewa(drzewa, zapytanie).slice(0, 6) : []), [drzewa, zapytanie]);
  const ileZNazwiskiem = useMemo(() => (zapytanie ? drzewaZNazwiskiem(drzewa, zapytanie).length : 0), [drzewa, zapytanie]);

  useEffect(() => {
    const naKlawisz = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const cel = e.target as HTMLElement | null;
      if (cel && (cel.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cel.tagName))) return;
      e.preventDefault();
      pole.current?.focus();
    };
    document.addEventListener("keydown", naKlawisz);
    return () => document.removeEventListener("keydown", naKlawisz);
  }, []);

  return (
    <div role="search" className="mx-auto w-full max-w-[700px] text-left">
      <form
        className="g-szklo g-duzy g-pigulka flex items-center gap-2.5 rounded-full py-2.5 pl-6 pr-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`${sciezkaIndeksuDrzew()}${zapytanie ? `?q=${encodeURIComponent(zapytanie)}` : ""}`);
        }}
      >
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="g-t3 flex-none">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <label htmlFor="szukaj-drzew" className="sr-only">
          Szukaj drzewa po nazwisku, nazwie lub regionie
        </label>
        <input
          id="szukaj-drzew"
          ref={pole}
          type="search"
          value={q}
          onFocus={() => setUzywane(true)}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          placeholder="Nazwisko, nazwa drzewa lub region…"
          className="h-14 min-w-0 flex-1 border-0 bg-transparent text-base outline-0 sm:text-lg"
          style={{ color: "var(--g-tekst)" }}
        />
        <kbd aria-hidden="true" className="g-chip g-t3 hidden flex-none rounded-[10px] px-2.5 py-0.5 text-[13px] sm:block">
          /
        </kbd>
        <button type="submit" className="g-przycisk h-14 flex-none rounded-full px-5 text-base sm:px-7">
          Szukaj
        </button>
      </form>
      {zapytanie && (
        <ul aria-label="Znalezione drzewa" className="g-szklo g-lita mt-2 divide-y overflow-hidden rounded-[28px]" style={{ borderColor: "var(--g-kreska)" }}>
          {wynik.length === 0 && <li className="g-t2 px-4 py-3">Nie znaleziono nazwiska ani drzewa „{zapytanie}” wśród publicznych drzew.</li>}
          {ileZNazwiskiem > 0 && <li className="px-4 py-2 text-sm font-semibold">Tak, takie nazwisko już jest – w {ileZNazwiskiem === 1 ? "1 drzewie" : `${ileZNazwiskiem} drzewach`}.</li>}
          {wynik.map((d) => (
            <li key={d.meta.slug} style={{ borderColor: "var(--g-kreska)" }}>
              <Link href={sciezkaDrzewa(d.meta.slug)} className="g-link flex items-baseline gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{d.meta.nazwa}</span>
                  {pasujaceNazwiska(d, zapytanie, 3).length > 0 && <span className="g-t2 block truncate text-sm">Nazwisko: {pasujaceNazwiska(d, zapytanie, 3).join(", ")}</span>}
                </span>
                <span className="g-t2 hidden shrink-0 text-sm sm:inline">{d.meta.region}</span>
                <span className="g-t2 shrink-0 text-sm tabular-nums">{ileOsob(d.osob)}</span>
              </Link>
            </li>
          ))}
          <li style={{ borderColor: "var(--g-kreska)" }}>
            <Link href={`${sciezkaIndeksuDrzew()}?q=${encodeURIComponent(zapytanie)}`} className="g-link g-akcent block px-4 py-2.5 text-sm font-semibold">
              Pokaż w indeksie drzew →
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
