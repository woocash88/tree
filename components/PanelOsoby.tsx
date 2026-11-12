"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { idWidoku } from "@/lib/galezie";
import type { OsobaPanelu } from "@/lib/panel";
import type { ParaDrzewa } from "@/lib/drzewo";
import { pelneImie } from "@/lib/format";
import type { Galaz } from "@/lib/schemat";
import { sciezkaDiagramu, sciezkaGalezi, sciezkaOsoby } from "@/lib/sciezki";
import { FormularzDziecka, FormularzEdycji, FormularzNowejOsoby, PasekEdycji } from "./FormularzOsoby";
import type { ApiEdycji } from "./useEdycje";

type Props = {
  slug: string;
  osoba: OsobaPanelu;
  osoby: Map<string, OsobaPanelu>;
  pary: ParaDrzewa[];
  galezie: Galaz[];
  /** Skąd otwarto panel: lista gałęzi (panel przyklejony z boku) albo diagram (nakładka na płótnie). */
  widok: "lista" | "diagram";
  /** Lista: odstęp panelu od góry okna (px) – pod nagłówkiem i belką. */
  gora?: number;
  /** Lokalne edycje osób (zmiana danych, dodawanie dzieci). */
  api: ApiEdycji;
  /** Wywoływane po dodaniu dziecka – widok ma je pokazać i zaznaczyć. */
  naDodane: (id: string) => void;
  naWybor: (id: string) => void;
  naZamkniecie: () => void;
};

/**
 * Panel szczegółów osoby: boczny na dużym ekranie, wysuwana szuflada od dołu na telefonie.
 * To jedna z kilku dużych powierzchni ze szkłem (rozmycie tła).
 */
export function PanelOsoby({ slug, osoba, osoby, pary, galezie, widok, gora = 150, api, naDodane, naWybor, naZamkniecie }: Props) {
  const [tryb, ustawTryb] = useState<{ id: string; tryb: "edycja" | "dziecko" | "malzonek" | "ojciec" | "matka" } | null>(null);
  // Tryb edycji dotyczy jednej osoby – po przejściu do innej wracamy do podglądu.
  // Narzędzia edycji widzą tylko osoby uprawnione do tego drzewa (właściciel, kolaboranci, administrator); pozostali mają czysty podgląd.
  const admin = api.mozeEdytowac;
  const aktywnyTryb = admin && tryb?.id === osoba.id ? tryb.tryb : "podglad";
  const zamknijFormularz = () => ustawTryb(null);
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

  // Fokus trafia do panelu przy każdej zmianie osoby; Esc zamyka i oddaje fokus.
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
    <button type="button" onClick={() => naWybor(o.id)} className="group flex w-full items-baseline gap-2 rounded-lg px-1 py-1 text-left hover:bg-najazd">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: galezie.find((g) => g.id === o.galazId)?.kolor }} />
      <span className="link min-w-0 flex-1 text-[15px] leading-tight">{pelneImie(o)}</span>
      <span className="shrink-0 text-xs tabular-nums text-tekst-2">{o.lata}</span>
    </button>
  );

  const polozenie =
    widok === "lista"
      ? "fixed inset-x-0 bottom-0 z-30 max-h-[62dvh] lg:sticky lg:inset-auto lg:bottom-auto lg:top-[var(--gora)] lg:z-10 lg:max-h-[calc(100dvh-var(--gora)-1rem)] lg:self-start"
      : "fixed inset-x-0 bottom-0 z-30 max-h-[62dvh] sm:absolute sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-[22rem]";

  return (
    <aside
      aria-label={`Szczegóły: ${pelneImie(osoba)}`}
      className={`szklo flex flex-col !rounded-b-none !border-b-0 lg:!rounded-b-[20px] lg:!border-b motion-safe:animate-[wysun_.22s_ease-out] lg:motion-safe:animate-[wjedz_.2s_ease-out] ${polozenie} ${widok === "diagram" ? "sm:!rounded-b-[20px] sm:!border-b" : ""}`}
      style={{ borderTop: `4px solid ${galaz.kolor}`, ["--gora" as string]: `${gora}px` }}
    >
      <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-kreska sm:hidden" />
      <div className="flex items-start gap-2 px-5 pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tekst-2">
            Pokolenie {osoba.pokolenie}{galaz.wspolna ? "" : ` · ${galaz.nazwa}`}
          </p>
          <h2 ref={naglowek} tabIndex={-1} className="mt-0.5 text-2xl leading-tight outline-none">
            {pelneImie(osoba)}
          </h2>
          {osoba.rodowe && <p className="text-tekst-2">z domu {osoba.rodowe}</p>}
        </div>
        <button type="button" onClick={naZamkniecie} aria-label="Zamknij panel osoby" className="przycisk -mr-2 size-10 !min-h-10 !p-0 text-xl leading-none">
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-2">
        {aktywnyTryb === "edycja" ? (
          <FormularzEdycji key={osoba.id} osoba={osoba} api={api} naGotowe={zamknijFormularz} />
        ) : aktywnyTryb === "malzonek" && api.dodajMalzonka ? (
          <FormularzNowejOsoby
            key={`m-${osoba.id}`}
            tytul={`Dodaj małżonka: ${pelneImie(osoba)}`}
            przycisk="Dodaj małżonka"
            domyslnaPlec={osoba.plec === "M" ? "K" : osoba.plec === "K" ? "M" : "nieznana"}
            wszystkieId={new Set(osoby.keys())}
            galazId={osoba.galazId}
            naZapis={(n) => {
              api.dodajMalzonka?.(osoba.id, n);
              naDodane(n.id);
            }}
            naGotowe={zamknijFormularz}
          />
        ) : (aktywnyTryb === "ojciec" || aktywnyTryb === "matka") && api.dodajRodzica ? (
          <FormularzNowejOsoby
            key={`${aktywnyTryb}-${osoba.id}`}
            tytul={`Dodaj ${aktywnyTryb === "ojciec" ? "ojca" : "matkę"}: ${pelneImie(osoba)}`}
            przycisk={aktywnyTryb === "ojciec" ? "Dodaj ojca" : "Dodaj matkę"}
            domyslneNazwisko={aktywnyTryb === "ojciec" ? osoba.nazwisko : ""}
            domyslnaPlec={aktywnyTryb === "ojciec" ? "M" : "K"}
            stalaPlec
            wszystkieId={new Set(osoby.keys())}
            galazId={osoba.galazId}
            naZapis={(n) => {
              api.dodajRodzica?.(osoba.id, aktywnyTryb, n);
              naDodane(n.id);
            }}
            naGotowe={zamknijFormularz}
          />
        ) : aktywnyTryb === "dziecko" ? (
          <FormularzDziecka key={osoba.id} osoba={osoba} malzonkowie={malzonkowie} wszystkieId={new Set(osoby.keys())} api={api} naDodane={naDodane} naGotowe={zamknijFormularz} />
        ) : (
          <>
        {osoba.ukryta ? (
          <p className="text-sm text-tekst-2">Daty i miejsca osób żyjących nie są publikowane.</p>
        ) : (
          (osoba.ur || osoba.zm || osoba.wiek) && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[15px]">
              {osoba.ur && (
                <>
                  <dt className="text-tekst-2">Urodzenie</dt>
                  <dd>{osoba.ur}</dd>
                </>
              )}
              {osoba.zm && (
                <>
                  <dt className="text-tekst-2">
                    <span aria-hidden="true">† </span>Śmierć
                  </dt>
                  <dd>{osoba.zm}</dd>
                </>
              )}
              {osoba.wiek && (
                <>
                  <dt className="text-tekst-2">Wiek</dt>
                  <dd>{osoba.wiek}</dd>
                </>
              )}
            </dl>
          )
        )}
        {osoba.notatka && <p className="mt-2 text-[15px] italic">{osoba.notatka}</p>}

          </>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href={sciezkaOsoby(slug, osoba.id)} className="przycisk przycisk-glowny">
            Widok osoby
          </Link>
          {widok === "lista" ? (
            <Link href={sciezkaDiagramu(slug, idWidoku(galaz), osoba.id)} className="przycisk">
              Pokaż na diagramie
            </Link>
          ) : (
            <Link href={sciezkaGalezi(slug, idWidoku(galaz), osoba.id)} className="przycisk">
              Pokaż na liście
            </Link>
          )}
        </div>

        {api.blad && (
          <p role="alert" className="mt-2 rounded-lg border border-blad p-2 text-sm font-semibold text-blad">
            {api.blad}
          </p>
        )}
        {admin && aktywnyTryb === "podglad" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className="przycisk" onClick={() => ustawTryb({ id: osoba.id, tryb: "edycja" })}>
              ✏️ Edytuj dane
            </button>
            <button type="button" className="przycisk" onClick={() => ustawTryb({ id: osoba.id, tryb: "dziecko" })}>
              👶 Dodaj dziecko
            </button>
            {api.dodajMalzonka && (
              <button type="button" className="przycisk" onClick={() => ustawTryb({ id: osoba.id, tryb: "malzonek" })}>
                💍 Dodaj małżonka
              </button>
            )}
            {api.dodajRodzica && !osoba.ojciecId && (
              <button type="button" className="przycisk" onClick={() => ustawTryb({ id: osoba.id, tryb: "ojciec" })}>
                👨 Dodaj ojca
              </button>
            )}
            {api.dodajRodzica && !osoba.matkaId && (
              <button type="button" className="przycisk" onClick={() => ustawTryb({ id: osoba.id, tryb: "matka" })}>
                👩 Dodaj matkę
              </button>
            )}
          </div>
        )}

        {aktywnyTryb === "podglad" && (
          <>
        {[
          { tytul: "Rodzice", lista: rodzice.map((r) => r.osoba) },
          { tytul: malzonkowie.length > 1 ? "Małżonkowie" : "Małżonek", lista: malzonkowie },
          { tytul: `Dzieci${dzieci.length ? ` (${dzieci.length})` : ""}`, lista: dzieci },
        ].map(
          (sekcja) =>
            sekcja.lista.length > 0 && (
              <section key={sekcja.tytul} className="mt-3 border-t border-kreska pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-tekst-2">{sekcja.tytul}</h3>
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
          </>
        )}
        {admin && !api.dodajMalzonka && <PasekEdycji api={api} />}
      </div>
    </aside>
  );
}
