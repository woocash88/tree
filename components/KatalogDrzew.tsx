"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane";
import { ileOsob } from "@/lib/format";
import { sciezkaDrzewa } from "@/lib/sciezki";
import { drzewaZNazwiskiem, filtrujDrzewa, pasujaceNazwiska, sortujDrzewa, type Sortowanie } from "@/lib/szukaj-drzew";
import { LIMIT_KATALOGU } from "@/lib/baza/katalog";
import { useDrzewaPubliczne } from "./db/useDrzewaPubliczne";

/** Od tylu drzew lista alfabetyczna dostaje nagłówki z literami (przy kilku drzewach same nagłówki tylko zaśmiecałyby widok). */
const PROG_NAGLOWKOW_LITER = 12;

/** Dwa sposoby uporządkowania listy: alfabetycznie albo od drzew z największą liczbą osób. */
const UKLADY: { wartosc: Extract<Sortowanie, "alfabetycznie" | "najwieksze">; adres: string | null; etykieta: string }[] = [
  { wartosc: "alfabetycznie", adres: null, etykieta: "Alfabetycznie" },
  { wartosc: "najwieksze", adres: "osoby", etykieta: "Najwięcej osób" },
];

const pierwszaLitera = (nazwa: string) => {
  const l = nazwa.trim().charAt(0).toLocaleUpperCase("pl");
  return /\p{L}/u.test(l) ? l : "#";
};

/**
 * Przegląd drzew (styl miękki): lista wszystkich publicznych drzew, uporządkowana alfabetycznie albo według liczby osób;
 * wyszukiwanie po nazwisku (osób w drzewach), nazwie i regionie. Stan w adresie (?q=&sort=osoby).
 */
export function KatalogDrzew({ drzewa: drzewaZRepozytorium }: { drzewa: PodsumowanieDrzewa[] }) {
  const zBazy = useDrzewaPubliczne();
  const drzewa = useMemo(() => [...drzewaZRepozytorium, ...zBazy], [drzewaZRepozytorium, zBazy]);
  const [q, setQ] = useState("");
  const [uklad, setUklad] = useState<(typeof UKLADY)[number]["wartosc"]>("alfabetycznie");
  const [gotowe, setGotowe] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect -- jednorazowe odczytanie adresu po zamontowaniu (strona jest statyczna) */
    setQ(p.get("q") ?? "");
    if (p.get("sort") === "osoby") setUklad("najwieksze");
    setGotowe(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (!gotowe) return;
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const adres = UKLADY.find((u) => u.wartosc === uklad)?.adres;
    if (adres) p.set("sort", adres);
    const s = p.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [gotowe, q, uklad]);

  const wynik = useMemo(() => sortujDrzewa(filtrujDrzewa(drzewa, q), uklad), [drzewa, q, uklad]);
  const zapytanie = q.trim();
  const zNazwiskiem = useMemo(() => (zapytanie ? drzewaZNazwiskiem(drzewa, zapytanie).length : 0), [drzewa, zapytanie]);
  const zNaglowkami = uklad === "alfabetycznie" && wynik.length >= PROG_NAGLOWKOW_LITER;
  const grupy = useMemo(() => {
    if (!zNaglowkami) return [["", wynik] as [string, PodsumowanieDrzewa[]]];
    const mapa = new Map<string, PodsumowanieDrzewa[]>();
    for (const d of wynik) mapa.set(pierwszaLitera(d.meta.nazwa), [...(mapa.get(pierwszaLitera(d.meta.nazwa)) ?? []), d]);
    return [...mapa.entries()];
  }, [wynik, zNaglowkami]);

  const pozycja = (d: PodsumowanieDrzewa) => {
    const nazwiska = pasujaceNazwiska(d, q);
    const opis = [d.meta.region, `${d.meta.zakresLat.od}–${d.meta.zakresLat.do}`].filter(Boolean).join(" · ");
    return (
      <li key={d.meta.slug}>
        <Link href={sciezkaDrzewa(d.meta.slug)} className="g-wiersz grid min-h-[58px] grid-cols-[1fr_auto_16px] items-center gap-3.5 rounded-2xl px-4 py-2">
          <span className="min-w-0">
            <span className="block truncate text-[15.5px] font-semibold leading-snug">{d.meta.nazwa}</span>
            <span className="g-t3 block truncate text-[13px] leading-snug">{opis}</span>
            {nazwiska.length > 0 && (
              <span className="block truncate text-[13px] leading-snug">
                <span className="g-t3">Nazwisko w drzewie: </span>
                <strong>{nazwiska.join(", ")}</strong>
              </span>
            )}
          </span>
          <span className="g-tag rounded-full px-2.5 py-0.5 text-[13px] font-semibold tabular-nums">{ileOsob(d.osob)}</span>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g-akcent-tekst)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      </li>
    );
  };

  return (
    <div>
      <form onSubmit={(e) => e.preventDefault()} role="search" aria-label="Szukaj drzew" className="g-szklo g-duzy g-pigulka flex h-16 items-center gap-2.5 rounded-full pl-6 pr-2.5">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="g-t3 flex-none">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <label htmlFor="szukaj-w-katalogu" className="sr-only">
          Nazwisko, nazwa drzewa lub region
        </label>
        <input
          id="szukaj-w-katalogu"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          placeholder="Nazwisko, nazwa drzewa lub region, np. Lulkiewicz, Kobylin…"
          className="h-14 min-w-0 flex-1 border-0 bg-transparent text-base outline-0 sm:text-[17px]"
          style={{ color: "var(--g-tekst)" }}
        />
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p role="status" aria-live="polite" className="g-t3 text-sm">
          {wynik.length === drzewa.length ? `Drzew: ${drzewa.length}` : `Znaleziono ${wynik.length} z ${drzewa.length} drzew`}
        </p>
        <div role="group" aria-label="Kolejność drzew" className="g-szklo flex gap-1 rounded-full p-1">
          {UKLADY.map((u) => (
            <button
              key={u.wartosc}
              type="button"
              aria-pressed={uklad === u.wartosc}
              onClick={() => setUklad(u.wartosc)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold ${uklad === u.wartosc ? "g-przycisk" : "g-link g-t2"}`}
            >
              {u.etykieta}
            </button>
          ))}
        </div>
      </div>

      {zapytanie && (
        <p role="status" aria-live="polite" className="g-szklo mt-4 rounded-3xl p-5 text-[15px]">
          {zNazwiskiem > 0 ? (
            <>
              <strong>Tak, takie nazwisko już jest.</strong> Nazwisko „{zapytanie}” (lub podobne) występuje w {zNazwiskiem === 1 ? "1 drzewie" : `${zNazwiskiem} drzewach`} – zobacz poniżej.
            </>
          ) : (
            <>
              <strong>Nie znaleziono nazwiska „{zapytanie}”</strong> w żadnym z publicznych drzew. Drzewa prywatne nie są przeszukiwane, a nazwiska w drzewach tworzonych dawniej pojawiają się po ich ponownym otwarciu przez właściciela.
            </>
          )}
        </p>
      )}
      {zBazy.length >= LIMIT_KATALOGU.wszystkie && <p className="g-t3 mt-3 text-sm">Wyświetlono pierwsze {LIMIT_KATALOGU.wszystkie} publicznych drzew użytkowników.</p>}

      {wynik.length === 0 ? (
        <p className="g-szklo g-t2 mt-5 rounded-3xl p-6 text-center">Żadne drzewo nie pasuje do „{q}”. Spróbuj samego nazwiska lub nazwy miejscowości.</p>
      ) : (
        <div className="mt-5 space-y-5">
          {grupy.map(([litera, lista]) => (
            <section key={litera || "wszystkie"} aria-label={litera ? `Drzewa na literę ${litera}` : undefined}>
              {litera && <h2 className="g-t3 mb-1.5 px-2 text-xs font-semibold uppercase tracking-[0.08em]">{litera}</h2>}
              <ul className="g-szklo rounded-[28px] p-2">{lista.map(pozycja)}</ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
