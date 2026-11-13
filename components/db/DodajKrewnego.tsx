"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { FormularzDziecka, FormularzNowejOsoby, type OsobaFormularza } from "@/components/FormularzOsoby";
import { pelneImie } from "@/lib/format";
import { KontekstDb } from "./KontekstDb";

export type RodzajKrewnego = "rodzenstwo" | "malzonek" | "dziecko" | "ojciec" | "matka";

type Props = {
  rodzaj: RodzajKrewnego;
  /** Osoba, której dopisujemy bliskiego. */
  osoba: OsobaFormularza;
  /** Dla dziecka: małżonkowie osoby (do wyboru drugiego rodzica). */
  malzonkowie?: OsobaFormularza[];
  /** Identyfikatory wszystkich osób drzewa (nowy identyfikator musi być niepowtarzalny). */
  wszystkieId: string[];
  /** Ilu bliskich tego rodzaju osoba już ma i ile może mieć najwyżej (brak limitu: bez `limit`). */
  ile?: number;
  limit?: number;
  /** Podpowiedź nazwiska nowej osoby (rodzeństwo, rodzic). */
  domyslneNazwisko?: string;
  /** Powód, dla którego dodawanie jest chwilowo niemożliwe (np. rodzeństwo wymaga rodzica). */
  zablokowane?: string;
  /** Wygląd: karta o wysokości kart osób albo niska belka. */
  wyglad?: "karta" | "belka";
};

const NAPISY: Record<RodzajKrewnego, { przycisk: string; limitTekst: string }> = {
  rodzenstwo: { przycisk: "Dodaj rodzeństwo", limitTekst: "rodzeństwa" },
  malzonek: { przycisk: "Dodaj małżonka", limitTekst: "małżonków" },
  dziecko: { przycisk: "Dodaj dziecko", limitTekst: "dzieci" },
  ojciec: { przycisk: "Dodaj ojca", limitTekst: "" },
  matka: { przycisk: "Dodaj matkę", limitTekst: "" },
};

/**
 * Przycisk „+” na stronie osoby drzewa z bazy: otwiera okno z formularzem nowego bliskiego (rodzeństwo, małżonek, dziecko,
 * brakujący rodzic). Widoczny tylko dla osób, które mogą edytować to drzewo – dla pozostałych (i dla drzew z repozytorium) nic nie renderuje.
 */
export function DodajKrewnego({ rodzaj, osoba, malzonkowie = [], wszystkieId, ile = 0, limit, domyslneNazwisko = "", zablokowane, wyglad = "karta" }: Props) {
  const ctx = useContext(KontekstDb);
  const okno = useRef<HTMLDialogElement>(null);
  const [otwarte, setOtwarte] = useState(false);

  useEffect(() => {
    const d = okno.current;
    if (!d) return;
    if (otwarte && !d.open) d.showModal();
    if (!otwarte && d.open) d.close();
  }, [otwarte]);

  if (!ctx || !ctx.api.mozeEdytowac) return null;
  const api = ctx.api;
  const mozliwe =
    (rodzaj === "rodzenstwo" && !!api.dodajRodzenstwo) || (rodzaj === "malzonek" && !!api.dodajMalzonka) || (rodzaj === "dziecko") || ((rodzaj === "ojciec" || rodzaj === "matka") && !!api.dodajRodzica);
  if (!mozliwe) return null;
  const napisy = NAPISY[rodzaj];

  if (limit !== undefined && ile >= limit) {
    return <p className="py-2 text-center text-xs text-tekst-2">Osiągnięto limit {napisy.limitTekst}: {limit}.</p>;
  }

  const zamknij = () => setOtwarte(false);
  const istniejace = new Set(wszystkieId);
  const nazwa = pelneImie(osoba);

  let formularz: React.ReactNode = null;
  if (otwarte) {
    if (rodzaj === "dziecko") {
      formularz = <FormularzDziecka osoba={osoba} malzonkowie={malzonkowie} wszystkieId={istniejace} api={api} naDodane={() => {}} naGotowe={zamknij} />;
    } else {
      const opis =
        rodzaj === "rodzenstwo"
          ? { tytul: `Dodaj rodzeństwo: ${nazwa}`, plec: "nieznana" as const, stala: false }
          : rodzaj === "malzonek"
            ? { tytul: `Dodaj małżonka: ${nazwa}`, plec: osoba.plec === "M" ? ("K" as const) : osoba.plec === "K" ? ("M" as const) : ("nieznana" as const), stala: false }
            : { tytul: `Dodaj ${rodzaj === "ojciec" ? "ojca" : "matkę"}: ${nazwa}`, plec: rodzaj === "ojciec" ? ("M" as const) : ("K" as const), stala: true };
      formularz = (
        <FormularzNowejOsoby
          tytul={opis.tytul}
          przycisk={napisy.przycisk}
          domyslneNazwisko={domyslneNazwisko}
          domyslnaPlec={opis.plec}
          stalaPlec={opis.stala}
          wszystkieId={istniejace}
          galazId={osoba.galazId}
          naZapis={(n) => {
            if (rodzaj === "rodzenstwo") api.dodajRodzenstwo?.(osoba.id, n);
            else if (rodzaj === "malzonek") api.dodajMalzonka?.(osoba.id, n);
            else api.dodajRodzica?.(osoba.id, rodzaj as "ojciec" | "matka", n);
          }}
          naGotowe={zamknij}
        />
      );
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={!!zablokowane}
        onClick={() => setOtwarte(true)}
        className={`group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-kreska px-3 text-sm font-semibold text-akcent transition-colors hover:border-akcent hover:bg-najazd disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-kreska disabled:hover:bg-transparent ${wyglad === "karta" ? "min-h-[4.25rem] py-3" : "min-h-11 py-2"}`}
      >
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-akcent bg-lita text-base font-bold leading-none">+</span>
        {napisy.przycisk}
      </button>
      {zablokowane && <p className="mt-1 text-center text-xs text-tekst-2">{zablokowane}</p>}
      <dialog
        ref={okno}
        onClose={zamknij}
        aria-label={napisy.przycisk}
        className="m-auto max-h-[90dvh] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-kreska bg-lita p-5 text-tekst shadow-xl backdrop:bg-black/40"
      >
        {formularz}
      </dialog>
    </>
  );
}
