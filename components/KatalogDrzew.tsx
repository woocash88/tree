"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane";
import { ileOsob, rozdzielOpis } from "@/lib/format";
import { sciezkaDrzewa } from "@/lib/sciezki";
import { drzewaZNazwiskiem, filtrujDrzewa, pasujaceNazwiska, sortujDrzewa } from "@/lib/szukaj-drzew";
import { LIMIT_KATALOGU } from "@/lib/baza/katalog";
import { useDrzewaPubliczne } from "./db/useDrzewaPubliczne";

/** Od tylu drzew lista dostaje nagłówki z literami (przy kilku drzewach same nagłówki tylko zaśmiecałyby widok). */
const PROG_NAGLOWKOW_LITER = 12;

const pierwszaLitera = (nazwa: string) => {
  const l = nazwa.trim().charAt(0).toLocaleUpperCase("pl");
  return /\p{L}/u.test(l) ? l : "#";
};

/** Indeks drzew: alfabetyczna lista wszystkich publicznych drzew; wyszukiwanie po nazwisku (osób w drzewach), nazwie i regionie. Stan w adresie (?q=). */
export function KatalogDrzew({ drzewa: drzewaZRepozytorium }: { drzewa: PodsumowanieDrzewa[] }) {
  const zBazy = useDrzewaPubliczne();
  const drzewa = useMemo(() => [...drzewaZRepozytorium, ...zBazy], [drzewaZRepozytorium, zBazy]);
  const [q, setQ] = useState("");
  const [gotowe, setGotowe] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- jednorazowe odczytanie adresu po zamontowaniu (strona jest statyczna) */
    setQ(new URLSearchParams(window.location.search).get("q") ?? "");
    setGotowe(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (!gotowe) return;
    window.history.replaceState(null, "", q ? `?${new URLSearchParams({ q })}` : window.location.pathname);
  }, [gotowe, q]);

  const wynik = useMemo(() => sortujDrzewa(filtrujDrzewa(drzewa, q), "alfabetycznie"), [drzewa, q]);
  const zapytanie = q.trim();
  const zNazwiskiem = useMemo(() => (zapytanie ? drzewaZNazwiskiem(drzewa, zapytanie).length : 0), [drzewa, zapytanie]);
  const grupy = useMemo(() => {
    const mapa = new Map<string, PodsumowanieDrzewa[]>();
    for (const d of wynik) mapa.set(pierwszaLitera(d.meta.nazwa), [...(mapa.get(pierwszaLitera(d.meta.nazwa)) ?? []), d]);
    return [...mapa.entries()];
  }, [wynik]);
  const zNaglowkami = wynik.length >= PROG_NAGLOWKOW_LITER;

  const pozycja = (d: PodsumowanieDrzewa) => {
    const nazwiska = pasujaceNazwiska(d, q);
    const opis = [d.meta.region, `${d.meta.zakresLat.od}–${d.meta.zakresLat.do}`].filter(Boolean).join(" · ");
    return (
      <li key={d.meta.slug} className="border-b border-kreska last:border-b-0">
        <Link href={sciezkaDrzewa(d.meta.slug)} className="flex items-baseline gap-4 px-4 py-3 hover:bg-najazd focus-visible:bg-najazd">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-semibold leading-snug">{d.meta.nazwa}</span>
            <span className="block truncate text-sm text-tekst-2" title={rozdzielOpis(d.meta.opis).opis || undefined}>
              {opis}
            </span>
            {nazwiska.length > 0 && (
              <span className="block truncate text-sm">
                <span className="text-tekst-2">Nazwisko w drzewie: </span>
                <strong>{nazwiska.join(", ")}</strong>
              </span>
            )}
          </span>
          <span className="shrink-0 text-sm tabular-nums text-tekst-2">{ileOsob(d.osob)}</span>
          <span aria-hidden="true" className="shrink-0 text-akcent">→</span>
        </Link>
      </li>
    );
  };

  return (
    <div>
      <form onSubmit={(e) => e.preventDefault()} role="search" aria-label="Szukaj drzew">
        <label className="block max-w-xl text-sm text-tekst-2">
          Nazwisko, nazwa drzewa lub region
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="pole mt-1 w-full" placeholder="np. Lulkiewicz, Kobylin" />
        </label>
      </form>
      <p role="status" aria-live="polite" className="mt-4 text-sm text-tekst-2">
        {wynik.length === drzewa.length ? `Drzew: ${drzewa.length}` : `Znaleziono ${wynik.length} z ${drzewa.length} drzew`}
      </p>
      {zapytanie && (
        <p role="status" aria-live="polite" className="szklo mt-3 p-4 text-[15px]">
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
      {zBazy.length >= LIMIT_KATALOGU.wszystkie && <p className="mt-2 text-sm text-tekst-2">Wyświetlono pierwsze {LIMIT_KATALOGU.wszystkie} publicznych drzew użytkowników.</p>}
      {wynik.length === 0 ? (
        <p className="szklo mt-4 p-6 text-center text-tekst-2">Żadne drzewo nie pasuje do „{q}”. Spróbuj samego nazwiska lub nazwy miejscowości.</p>
      ) : (
        <div className="mt-4 space-y-5">
          {grupy.map(([litera, drzewaGrupy]) => (
            <section key={litera} aria-label={zNaglowkami ? `Drzewa na literę ${litera}` : undefined}>
              {zNaglowkami && <h2 className="mb-1.5 px-1 text-sm font-semibold uppercase tracking-[0.16em] text-tekst-2">{litera}</h2>}
              <ul className="szklo overflow-hidden !rounded-2xl">{drzewaGrupy.map(pozycja)}</ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
