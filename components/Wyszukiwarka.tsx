"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { pelneImie } from "@/lib/format";
import { BASE_PATH, sciezkaOsoby } from "@/lib/sciezki";
import { przygotujIndeks, szukaj, type WpisPrzygotowany, type WpisSzukania } from "@/lib/szukaj";
import { obslugaWyboru } from "@/lib/wybor";

type GalazSkrot = { id: string; nazwa: string; kolor: string };

let pamiecIndeksu: Promise<WpisPrzygotowany[]> | null = null;
function pobierzIndeks(): Promise<WpisPrzygotowany[]> {
  pamiecIndeksu ??= fetch(`${BASE_PATH}/dane/szukaj.json`)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<WpisSzukania[]>;
    })
    .then(przygotujIndeks)
    .catch((e) => {
      pamiecIndeksu = null;
      throw e;
    });
  return pamiecIndeksu;
}

export function Wyszukiwarka({ galezie, duza = false }: { galezie: GalazSkrot[]; duza?: boolean }) {
  const router = useRouter();
  const idListy = useId();
  const pole = useRef<HTMLInputElement>(null);
  const [zapytanie, setZapytanie] = useState("");
  const [indeks, setIndeks] = useState<WpisPrzygotowany[] | null>(null);
  const [blad, setBlad] = useState(false);
  const [otwarta, setOtwarta] = useState(false);
  const [aktywny, setAktywny] = useState(0);
  const kolory = useMemo(() => new Map(galezie.map((g) => [g.id, g])), [galezie]);

  const zaladuj = useCallback(() => {
    pobierzIndeks().then(setIndeks, () => setBlad(true));
  }, []);

  // Skróty "/" oraz Ctrl+K (Cmd+K) – z każdego miejsca strony.
  useEffect(() => {
    const naKlawisz = (e: KeyboardEvent) => {
      const cel = e.target as HTMLElement | null;
      const pisze = !!cel && (cel.tagName === "INPUT" || cel.tagName === "TEXTAREA" || cel.tagName === "SELECT" || cel.isContentEditable);
      const skrot = (e.key === "/" && !pisze && !e.ctrlKey && !e.metaKey && !e.altKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k");
      if (!skrot) return;
      // Gdy na stronie są dwie wyszukiwarki (strona główna), pierwszeństwo ma duża.
      const duzaNaStronie = document.querySelector<HTMLInputElement>('input[data-szukaj="duza"]');
      const moja = pole.current;
      if (!moja || (duzaNaStronie && duzaNaStronie !== moja) || moja.offsetParent === null) return;
      e.preventDefault();
      moja.focus();
      moja.select();
    };
    window.addEventListener("keydown", naKlawisz);
    return () => window.removeEventListener("keydown", naKlawisz);
  }, []);

  const wynik = useMemo(() => (indeks ? szukaj(indeks, zapytanie, 8) : { trafienia: [], razem: 0 }), [indeks, zapytanie]);
  const pokazListe = otwarta && zapytanie.trim().length > 0;
  const wiecej = wynik.razem > wynik.trafienia.length;
  const liczbaPozycji = wynik.trafienia.length + (wiecej ? 1 : 0);

  const wybierz = (i: number) => {
    setOtwarta(false);
    if (i >= wynik.trafienia.length) {
      router.push(`/osoby/?q=${encodeURIComponent(zapytanie.trim())}`);
      return;
    }
    const id = wynik.trafienia[i].id;
    setZapytanie("");
    pole.current?.blur();
    const wDrzewie = obslugaWyboru();
    if (wDrzewie) wDrzewie(id);
    else router.push(sciezkaOsoby(id));
  };

  const naKlawisz = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOtwarta(true);
      setAktywny((a) => (liczbaPozycji ? (a + 1) % liczbaPozycji : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktywny((a) => (liczbaPozycji ? (a - 1 + liczbaPozycji) % liczbaPozycji : 0));
    } else if (e.key === "Enter") {
      if (pokazListe && liczbaPozycji) {
        e.preventDefault();
        wybierz(Math.min(aktywny, liczbaPozycji - 1));
      }
    } else if (e.key === "Escape") {
      if (pokazListe) setOtwarta(false);
      else pole.current?.blur();
    }
  };

  return (
    <div className="relative w-full" role="search">
      <label htmlFor={`${idListy}-pole`} className="sr-only">
        Szukaj osoby po imieniu, nazwisku lub roku
      </label>
      <div className="relative">
        <svg aria-hidden="true" viewBox="0 0 20 20" className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-sepia ${duza ? "left-4 size-5" : "left-2.5 size-4"}`}>
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12.8 12.8 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={pole}
          id={`${idListy}-pole`}
          data-szukaj={duza ? "duza" : "mala"}
          type="search"
          role="combobox"
          aria-expanded={pokazListe}
          aria-controls={`${idListy}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={pokazListe && liczbaPozycji ? `${idListy}-opcja-${Math.min(aktywny, liczbaPozycji - 1)}` : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={duza ? "Szukaj: imię, nazwisko lub rok…" : "Szukaj osoby…"}
          value={zapytanie}
          onFocus={() => {
            zaladuj();
            setOtwarta(true);
          }}
          onBlur={() => setOtwarta(false)}
          onChange={(e) => {
            setZapytanie(e.target.value);
            setAktywny(0);
            setOtwarta(true);
          }}
          onKeyDown={naKlawisz}
          className={`w-full border border-kreska bg-papier-jasny text-atrament placeholder:text-sepia/80 shadow-karta [&::-webkit-search-cancel-button]:hidden ${
            duza ? "h-14 rounded-sm pl-12 pr-24 text-lg" : "h-10 rounded-sm pl-8 pr-14 text-[15px]"
          }`}
        />
        <kbd aria-hidden="true" className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 rounded-sm border border-kreska/70 bg-papier px-1.5 font-sans text-xs text-sepia sm:block ${duza ? "right-4" : "right-2"}`}>
          {duza ? "/ lub Ctrl K" : "/"}
        </kbd>
      </div>

      {pokazListe && (
        <ul
          id={`${idListy}-lista`}
          role="listbox"
          aria-label="Podpowiedzi"
          className="etykieta absolute left-0 right-0 z-50 mt-1 max-h-[70dvh] overflow-auto py-1 text-left sm:min-w-80"
          onMouseDown={(e) => e.preventDefault()}
        >
          {!indeks && !blad && <li className="px-4 py-2 text-sm text-sepia">Wczytywanie spisu osób…</li>}
          {blad && <li className="px-4 py-2 text-sm text-bordo">Nie udało się wczytać spisu osób. Odśwież stronę.</li>}
          {indeks && !wynik.trafienia.length && (
            <li className="px-4 py-2 text-sm text-sepia">Brak wyników dla „{zapytanie.trim()}”. Spróbuj samego nazwiska albo roku.</li>
          )}
          {wynik.trafienia.map((w, i) => {
            const g = kolory.get(w.g);
            return (
              <li
                key={w.id}
                id={`${idListy}-opcja-${i}`}
                role="option"
                aria-selected={i === aktywny}
                onMouseEnter={() => setAktywny(i)}
                onClick={() => wybierz(i)}
                className={`relative z-10 flex cursor-pointer items-baseline gap-2 px-4 py-2 ${i === aktywny ? "bg-papier-ciemny" : ""}`}
              >
                <span aria-hidden="true" className="size-2.5 shrink-0 translate-y-px rounded-full" style={{ backgroundColor: g?.kolor }} />
                <span className="szeryf min-w-0 flex-1 truncate text-[17px] leading-tight">
                  {pelneImie({ imie: w.i, nazwisko: w.n })}
                  {w.r && <span className="text-sepia"> z d. {w.r}</span>}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-sepia">{w.l}</span>
                <span className="hidden shrink-0 text-xs text-sepia sm:inline">{g?.nazwa}</span>
              </li>
            );
          })}
          {wiecej && (
            <li
              id={`${idListy}-opcja-${wynik.trafienia.length}`}
              role="option"
              aria-selected={aktywny === wynik.trafienia.length}
              onMouseEnter={() => setAktywny(wynik.trafienia.length)}
              onClick={() => wybierz(wynik.trafienia.length)}
              className={`relative z-10 cursor-pointer border-t border-kreska/40 px-4 py-2 text-sm text-bordo ${aktywny === wynik.trafienia.length ? "bg-papier-ciemny" : ""}`}
            >
              Pokaż wszystkie wyniki ({wynik.razem}) w indeksie osób →
            </li>
          )}
        </ul>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {pokazListe && indeks ? (wynik.razem ? `Liczba wyników: ${wynik.razem}. Strzałki wybierają, Enter otwiera.` : "Brak wyników.") : ""}
      </p>
    </div>
  );
}
