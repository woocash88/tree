"use client";

import { useEffect, useMemo, useState } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane";
import { drzewaZNazwiskiem, filtrujDrzewa, pasujaceNazwiska, SORTOWANIA, sortujDrzewa, type Sortowanie } from "@/lib/szukaj-drzew";
import { KartaDrzewa } from "./KartaDrzewa";
import { LIMIT_KATALOGU } from "@/lib/baza/katalog";
import { useDrzewaPubliczne } from "./db/useDrzewaPubliczne";

/** Najwięcej drzew pokazywanych naraz na stronie przeglądu (szukanie obejmuje wszystkie pobrane drzewa, nie tylko te pokazane). */
export const LIMIT_WYSWIETLANIA = 20;

/** Indeks drzew: wyszukiwanie po nazwisku (osób w drzewach), nazwie drzewa i regionie oraz sortowanie. Stan w adresie (?q=&sort=). */
export function KatalogDrzew({ drzewa: drzewaZRepozytorium }: { drzewa: PodsumowanieDrzewa[] }) {
  const zBazy = useDrzewaPubliczne();
  const drzewa = useMemo(() => [...drzewaZRepozytorium, ...zBazy], [drzewaZRepozytorium, zBazy]);
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
  const zapytanie = q.trim();
  const zNazwiskiem = useMemo(() => (zapytanie ? drzewaZNazwiskiem(drzewa, zapytanie).length : 0), [drzewa, zapytanie]);

  return (
    <div>
      <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={(e) => e.preventDefault()} role="search" aria-label="Szukaj drzew">
        <label className="block text-sm text-tekst-2">
          Nazwisko, nazwa drzewa lub region
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="pole mt-1 w-full" placeholder="np. Lulkiewicz, Kobylin" />
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
        {wynik.length > LIMIT_WYSWIETLANIA && ` · pokazano pierwsze ${LIMIT_WYSWIETLANIA} – wpisz nazwisko, nazwę lub region, aby zawęzić`}
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
      {zBazy.length >= LIMIT_KATALOGU.wszystkie && (
        <p className="mt-2 text-sm text-tekst-2">Wyświetlono pierwsze {LIMIT_KATALOGU.wszystkie} publicznych drzew użytkowników.</p>
      )}
      {wynik.length === 0 ? (
        <p className="szklo mt-4 p-6 text-center text-tekst-2">Żadne drzewo nie pasuje do „{q}”. Spróbuj samego nazwiska lub nazwy miejscowości.</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wynik.slice(0, LIMIT_WYSWIETLANIA).map((d) => (
            <li key={d.meta.slug}>
              <KartaDrzewa drzewo={d} pasujaceNazwiska={pasujaceNazwiska(d, q)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
