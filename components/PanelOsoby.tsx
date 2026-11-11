"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import type { OsobaPanelu } from "@/lib/dane";
import type { ParaDrzewa } from "@/lib/drzewo";
import { pelneImie } from "@/lib/format";
import type { Galaz } from "@/lib/schemat";
import { sciezkaDrzewa, sciezkaOsoby } from "@/lib/sciezki";

type Props = {
  osoba: OsobaPanelu;
  osoby: Map<string, OsobaPanelu>;
  pary: ParaDrzewa[];
  galezie: Galaz[];
  naWybor: (id: string) => void;
  naZamkniecie: () => void;
};

/** Panel szczegółów osoby: z prawej na dużym ekranie, wysuwana szuflada od dołu na telefonie. */
export function PanelOsoby({ osoba, osoby, pary, galezie, naWybor, naZamkniecie }: Props) {
  const naglowek = useRef<HTMLHeadingElement>(null);
  const galaz = galezie.find((g) => g.id === osoba.galazId)!;

  const { rodzice, malzonkowie, dzieci } = useMemo(() => {
    const rodzice = [
      { etykieta: "Ojciec", osoba: osoba.ojciecId ? osoby.get(osoba.ojciecId) : undefined },
      { etykieta: "Matka", osoba: osoba.matkaId ? osoby.get(osoba.matkaId) : undefined },
    ].filter((r): r is { etykieta: string; osoba: OsobaPanelu } => !!r.osoba);
    const malzonkowie = pary
      .filter((p) => p.a === osoba.id || p.b === osoba.id)
      .sort((x, y) => x.kolejnosc - y.kolejnosc)
      .map((p) => osoby.get(p.a === osoba.id ? p.b : p.a)!);
    const dzieci = [...osoby.values()].filter((o) => o.ojciecId === osoba.id || o.matkaId === osoba.id);
    return { rodzice, malzonkowie, dzieci };
  }, [osoba, osoby, pary]);

  // Fokus trafia do panelu przy każdej zmianie osoby; Esc zamyka i oddaje fokus karcie.
  useEffect(() => {
    naglowek.current?.focus({ preventScroll: true });
  }, [osoba.id]);
  useEffect(() => {
    const naKlawisz = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement)) naZamkniecie();
    };
    window.addEventListener("keydown", naKlawisz);
    return () => window.removeEventListener("keydown", naKlawisz);
  }, [naZamkniecie]);

  const Odnosnik = ({ o }: { o: OsobaPanelu }) => (
    <button type="button" onClick={() => naWybor(o.id)} className="group flex w-full items-baseline gap-2 py-1 text-left">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: galezie.find((g) => g.id === o.galazId)?.kolor }} />
      <span className="szeryf link min-w-0 flex-1 text-[17px] leading-tight">{pelneImie(o)}</span>
      <span className="shrink-0 text-xs tabular-nums text-sepia">{o.lata}</span>
    </button>
  );

  return (
    <aside
      aria-label={`Szczegóły: ${pelneImie(osoba)}`}
      className="etykieta fixed inset-x-0 bottom-0 z-30 flex max-h-[62dvh] flex-col rounded-t-xl border-t-4 shadow-[0_-8px_24px_-8px_rgba(43,33,24,0.35)] motion-safe:animate-[wysun_.22s_ease-out] sm:absolute sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-[22rem] sm:rounded-none sm:shadow-karta sm:motion-safe:animate-[wjedz_.2s_ease-out]"
      style={{ borderTopColor: galaz.kolor }}
    >
      <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-kreska/60 sm:hidden" />
      <div className="relative z-10 flex items-start gap-2 px-5 pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sepia">
            Pokolenie {osoba.pokolenie} · {galaz.nazwa}
          </p>
          <h2 ref={naglowek} tabIndex={-1} className="mt-0.5 text-[28px] font-medium leading-tight outline-none">
            {pelneImie(osoba)}
          </h2>
          {osoba.rodowe && <p className="szeryf italic text-sepia">z domu {osoba.rodowe}</p>}
        </div>
        <button type="button" onClick={naZamkniecie} aria-label="Zamknij panel osoby" className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-sm text-2xl leading-none text-sepia hover:bg-papier-ciemny hover:text-atrament">
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-2">
        {osoba.ukryta ? (
          <p className="text-sm italic text-sepia">Daty i miejsca osób żyjących nie są publikowane.</p>
        ) : osoba.ur || osoba.zm || osoba.wiek ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[15px]">
            {osoba.ur && (
              <>
                <dt className="text-sepia">Urodzenie</dt>
                <dd>{osoba.ur}</dd>
              </>
            )}
            {osoba.zm && (
              <>
                <dt className="text-sepia">
                  <span aria-hidden="true">† </span>Śmierć
                </dt>
                <dd>{osoba.zm}</dd>
              </>
            )}
            {osoba.wiek && (
              <>
                <dt className="text-sepia">Wiek</dt>
                <dd>{osoba.wiek}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="text-sm italic text-sepia">Źródło nie podaje dat.</p>
        )}
        {osoba.notatka && <p className="szeryf mt-2 text-base italic">{osoba.notatka}</p>}

        <Link href={sciezkaOsoby(osoba.id)} className="mt-3 block rounded-sm border border-bordo bg-bordo px-4 py-2 text-center text-[15px] font-semibold text-white hover:bg-[#641c28]">
          Przejdź do widoku osoby
        </Link>

        {[
          { tytul: "Rodzice", lista: rodzice.map((r) => r.osoba) },
          { tytul: malzonkowie.length > 1 ? "Małżonkowie" : "Małżonek", lista: malzonkowie },
          { tytul: `Dzieci${dzieci.length ? ` (${dzieci.length})` : ""}`, lista: dzieci },
        ].map(
          (sekcja) =>
            sekcja.lista.length > 0 && (
              <section key={sekcja.tytul} className="mt-3 border-t border-kreska/40 pt-2">
                <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-sepia">{sekcja.tytul}</h3>
                <ul>
                  {sekcja.lista.map((o) => (
                    <li key={o.id}>
                      <Odnosnik o={o} />
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )}

        <p className="mt-3 border-t border-kreska/40 pt-2 text-sm">
          <Link href={sciezkaDrzewa(galaz.id, osoba.id)} className="link">
            Pokaż tylko: {galaz.nazwa}
          </Link>
        </p>
      </div>
    </aside>
  );
}
