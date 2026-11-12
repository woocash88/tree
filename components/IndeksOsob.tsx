"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { normalizuj } from "@/lib/format";
import { sciezkaOsoby } from "@/lib/sciezki";

export type WierszIndeksu = {
  id: string;
  imie: string;
  nazwisko: string;
  rodowe?: string;
  lata: string;
  galazId: string;
  stulecie: number | null;
  pokolenie: number;
};
type GalazSkrot = { id: string; nazwa: string; kolor: string };

const sortuj = new Intl.Collator("pl", { sensitivity: "base" });
const BEZ_DATY = "brak";

export function IndeksOsob({ slug, wiersze, galezie, stulecia }: { slug: string; wiersze: WierszIndeksu[]; galezie: GalazSkrot[]; stulecia: { nr: number; etykieta: string }[] }) {
  const [q, setQ] = useState("");
  const [nazwisko, setNazwisko] = useState("");
  const [galaz, setGalaz] = useState("");
  const [wiek, setWiek] = useState("");
  const [gotowe, setGotowe] = useState(false);

  // Filtry są odzwierciedlone w adresie (?q=&nazwisko=&galaz=&wiek=), więc listę można wysłać linkiem.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect -- jednorazowe odczytanie adresu po zamontowaniu (strona jest statyczna) */
    setQ(p.get("q") ?? "");
    setNazwisko(p.get("nazwisko") ?? "");
    setGalaz(p.get("galaz") ?? "");
    setWiek(p.get("wiek") ?? "");
    setGotowe(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (!gotowe) return;
    // Zachowujemy pozostałe parametry adresu (np. id i widok drzewa z bazy).
    const p = new URLSearchParams(window.location.search);
    for (const [k, v] of [["q", q], ["nazwisko", nazwisko], ["galaz", galaz], ["wiek", wiek]] as const) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [gotowe, q, nazwisko, galaz, wiek]);

  const kolory = useMemo(() => new Map(galezie.map((g) => [g.id, g])), [galezie]);
  const nazwiska = useMemo(() => {
    const licznik = new Map<string, number>();
    for (const w of wiersze) if (w.nazwisko) licznik.set(w.nazwisko, (licznik.get(w.nazwisko) ?? 0) + 1);
    return [...licznik.entries()].sort((a, b) => sortuj.compare(a[0], b[0]));
  }, [wiersze]);

  const grupy = useMemo(() => {
    const slowa = normalizuj(q).split(" ").filter(Boolean);
    const pasujace = wiersze
      .filter((w) => {
        if (nazwisko && w.nazwisko !== nazwisko) return false;
        if (galaz && w.galazId !== galaz) return false;
        if (wiek && (wiek === BEZ_DATY ? w.stulecie !== null : w.stulecie !== Number(wiek))) return false;
        if (slowa.length) {
          const tekst = normalizuj(`${w.imie} ${w.nazwisko} ${w.rodowe ?? ""} ${w.lata}`);
          if (!slowa.every((s) => tekst.includes(s))) return false;
        }
        return true;
      })
      .sort((a, b) => sortuj.compare(a.nazwisko || "￿", b.nazwisko || "￿") || sortuj.compare(a.imie, b.imie) || a.pokolenie - b.pokolenie);
    const wynik: { litera: string; osoby: WierszIndeksu[] }[] = [];
    for (const w of pasujace) {
      const litera = w.nazwisko ? w.nazwisko[0].toLocaleUpperCase("pl") : "NN";
      const ostatnia = wynik[wynik.length - 1];
      if (ostatnia?.litera === litera) ostatnia.osoby.push(w);
      else wynik.push({ litera, osoby: [w] });
    }
    return { wynik, razem: pasujace.length };
  }, [wiersze, q, nazwisko, galaz, wiek]);

  const aktywne = !!(q || nazwisko || galaz || wiek);

  return (
    <div className="mt-5">
      <form className="szklo grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()} aria-label="Filtry indeksu">
        <label className="block text-sm text-tekst-2">
          Imię, nazwisko lub rok
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="pole mt-1 w-full" placeholder="np. kowalski 1924" />
        </label>
        <label className="block text-sm text-tekst-2">
          Nazwisko
          <select value={nazwisko} onChange={(e) => setNazwisko(e.target.value)} className="pole mt-1 w-full">
            <option value="">wszystkie ({nazwiska.length})</option>
            {nazwiska.map(([n, ile]) => (
              <option key={n} value={n}>
                {n} ({ile})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-tekst-2">
          Gałąź
          <select value={galaz} onChange={(e) => setGalaz(e.target.value)} className="pole mt-1 w-full">
            <option value="">wszystkie</option>
            {galezie.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nazwa}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-tekst-2">
          Stulecie urodzenia
          <select value={wiek} onChange={(e) => setWiek(e.target.value)} className="pole mt-1 w-full">
            <option value="">wszystkie</option>
            {stulecia.map((s) => (
              <option key={s.nr} value={s.nr}>
                {s.etykieta}
              </option>
            ))}
            <option value={BEZ_DATY}>bez daty lub data ukryta</option>
          </select>
        </label>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p role="status" aria-live="polite" className="text-sm text-tekst-2">
          {grupy.razem === wiersze.length ? `Osób: ${wiersze.length}` : `Znaleziono ${grupy.razem} z ${wiersze.length} osób`}
        </p>
        {aktywne && (
          <button
            type="button"
            className="link text-sm"
            onClick={() => {
              setQ("");
              setNazwisko("");
              setGalaz("");
              setWiek("");
            }}
          >
            Wyczyść filtry
          </button>
        )}
        <nav aria-label="Skocz do litery" className="flex flex-wrap gap-1 sm:ml-auto">
          {grupy.wynik.map((g) => (
            <a key={g.litera} href={`#litera-${g.litera}`} className="panel min-w-8 px-1.5 py-0.5 text-center text-sm font-medium hover:bg-najazd">
              {g.litera}
            </a>
          ))}
        </nav>
      </div>

      {grupy.razem === 0 && <p className="mt-8 text-center text-tekst-2">Żadna osoba nie pasuje do wybranych filtrów.</p>}

      {grupy.wynik.map((g) => (
        <section key={g.litera} aria-labelledby={`litera-${g.litera}`} className="mt-6">
          <h2 id={`litera-${g.litera}`} className="border-b border-kreska pb-1 text-2xl text-akcent">
            {g.litera === "NN" ? "Nazwisko nieznane" : g.litera}
          </h2>
          <ul className="mt-2 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {g.osoby.map((w) => (
              <li key={w.id} className="border-b border-kreska">
                <Link href={sciezkaOsoby(slug, w.id)} className="group flex items-baseline gap-2 py-1.5">
                  <span aria-hidden="true" className="size-2.5 shrink-0 translate-y-px rounded-full" style={{ backgroundColor: kolory.get(w.galazId)?.kolor }} title={kolory.get(w.galazId)?.nazwa} />
                  <span className="min-w-0 flex-1 text-[15px] leading-tight group-hover:underline">
                    <span className="font-semibold">{w.nazwisko || "NN"}</span> {w.imie || "NN"}
                    {w.rodowe && <span className="text-tekst-2"> z d. {w.rodowe}</span>}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-tekst-2">{w.lata}</span>
                  <span className="sr-only">, {kolory.get(w.galazId)?.nazwa}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
