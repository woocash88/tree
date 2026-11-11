"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { OsobaPanelu } from "@/lib/dane";
import { lasGalezi, przodkowieWWidoku, rozwinDoPoziomu, wWidoku, type ParaDrzewa } from "@/lib/drzewo";
import { naPanelu } from "@/lib/edycje";
import { ileOsob, pelneImie } from "@/lib/format";
import { galezieWidoku, idWidoku, znajdzGalaz } from "@/lib/galezie";
import { kolorPokolenia, tekstNaKolorze } from "@/lib/kolor";
import { dekodujRozwiniecie, kodujRozwiniecie, rozwinDo, zbudujWiersze, type WierszListy } from "@/lib/lista";
import type { Galaz } from "@/lib/schemat";
import { sciezkaDiagramu, sciezkaGalezi } from "@/lib/sciezki";
import { ustawObslugeWyboru } from "@/lib/wybor";
import { PanelOsoby } from "./PanelOsoby";
import { useEdycje } from "./useEdycje";

const WCIECIE = 22;
const WYSOKOSC_PC = 30;
const WYSOKOSC_TELEFON = 44;

type Props = { slug: string; osoby: OsobaPanelu[]; pary: ParaDrzewa[]; galezie: Galaz[]; galazId: string; liczbaOsob: number };

/** Odczyt zapytania medialnego bez ostrzeżeń o niezgodności renderowania (SSR → klient). */
function useZapytanieMedialne(zapytanie: string): boolean {
  return useSyncExternalStore(
    (zmiana) => {
      const m = window.matchMedia(zapytanie);
      m.addEventListener("change", zmiana);
      return () => m.removeEventListener("change", zmiana);
    },
    () => window.matchMedia(zapytanie).matches,
    () => false,
  );
}

/** Wysokość elementu (px) śledzona przez ResizeObserver – potrzebna do przyklejenia belki pod nagłówkiem. */
function useWysokosc(el: () => Element | null): number {
  const [wys, setWys] = useState(0);
  useEffect(() => {
    const cel = el();
    if (!cel) return;
    const odczyt = () => setWys(Math.round(cel.getBoundingClientRect().height));
    odczyt();
    const obs = new ResizeObserver(odczyt);
    obs.observe(cel);
    return () => obs.disconnect();
  }, [el]);
  return wys;
}

const pobierzNaglowek = () => document.querySelector("header");

function ListaGaleziWnetrze({ slug, osoby: osobyBazowe, pary, galezie, galazId, liczbaOsob }: Props) {
  const router = useRouter();
  const api = useEdycje(slug);
  const osoby = useMemo(() => naPanelu(osobyBazowe, api.edycje), [osobyBazowe, api.edycje]);
  const mapa = useMemo(() => new Map(osoby.map((o) => [o.id, o])), [osoby]);
  const galaz = znajdzGalaz(galezie, galazId);
  const widokOsoby = useCallback(
    (id: string) => {
      const g = galezie.find((x) => x.id === mapa.get(id)?.galazId);
      return g ? idWidoku(g) : galazId;
    },
    [galezie, mapa, galazId],
  );
  /** Dopiero co dodana osoba: pokazujemy ją, gdy pojawi się w liście. */
  const [oczekujaca, setOczekujaca] = useState<string | null>(null);
  const { las, korzenie, maxPoziomow } = useMemo(() => lasGalezi(osoby, pary, galazId), [osoby, pary, galazId]);
  const pokolenieStartu = useMemo(() => Math.min(...korzenie.map((k) => mapa.get(las.jednostki.get(k)!.glowna)!.pokolenie)), [korzenie, las, mapa]);

  const [rozwiniete, setRozwiniete] = useState<Set<string> | null>(null);
  const gotowe = rozwiniete !== null;
  const [poziomy, setPoziomy] = useState(1);
  const [wybrana, setWybrana] = useState<string | null>(null);
  const [aktywnyId, setAktywnyId] = useState<string | null>(null);
  const [podswietlona, setPodswietlona] = useState<string | null>(null);
  /** Wiersz, do którego trzeba przewinąć po przeliczeniu listy. */
  const [cel, setCel] = useState<{ id: string; wyrownanie: "center" | "start" | "auto" } | null>(null);
  const fokusPo = useRef<string | null>(null);

  const telefon = useZapytanieMedialne("(max-width: 1023px)");
  const wysokoscWiersza = telefon ? WYSOKOSC_TELEFON : WYSOKOSC_PC;
  // Nagłówek jest przyklejony od szerokości 640 px; na telefonie przewija się razem ze stroną.
  const naglowekPrzyklejony = useZapytanieMedialne("(min-width: 640px)");
  const naglowekPx = useWysokosc(pobierzNaglowek);
  const gora = naglowekPrzyklejony ? naglowekPx : 0;
  const belka = useRef<HTMLDivElement>(null);
  const [belkaPx, setBelkaPx] = useState(0);
  useEffect(() => {
    const el = belka.current;
    if (!el) return;
    const odczyt = () => setBelkaPx(Math.round(el.getBoundingClientRect().height));
    odczyt();
    const obs = new ResizeObserver(odczyt);
    obs.observe(el);
    return () => obs.disconnect();
  }, [gotowe]);

  const wiersze = useMemo<WierszListy[]>(() => (rozwiniete ? zbudujWiersze(las, korzenie, rozwiniete) : []), [las, korzenie, rozwiniete]);

  // ── stan w adresie: ?os=<id osoby>&rozw=<poziomy,+id,-id> ──
  const zastosujAdres = useCallback(() => {
    const p = new URLSearchParams(window.location.search);
    const { rozwiniete: r, poziomy: poz } = dekodujRozwiniecie(las, korzenie, p.get("rozw"), maxPoziomow);
    const os = p.get("os");
    const jednostka = os ? las.jednostkaOsoby.get(os) : undefined;
    let nowe = r;
    if (os && jednostka && wWidoku(las, korzenie, jednostka)) nowe = rozwinDo(r, przodkowieWWidoku(las, korzenie, jednostka));
    setPoziomy(poz);
    setRozwiniete(nowe);
    if (os && jednostka && wWidoku(las, korzenie, jednostka)) {
      setWybrana(os);
      setAktywnyId(jednostka);
      setCel({ id: jednostka, wyrownanie: "center" });
    } else if (os && mapa.has(os)) {
      router.replace(sciezkaGalezi(slug, widokOsoby(os), os));
    } else {
      setWybrana(null);
    }
  }, [las, korzenie, maxPoziomow, mapa, router, slug, widokOsoby]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- jednorazowe odczytanie adresu po zamontowaniu (strona jest statyczna)
    zastosujAdres();
    window.addEventListener("popstate", zastosujAdres);
    return () => window.removeEventListener("popstate", zastosujAdres);
  }, [zastosujAdres]);

  useEffect(() => {
    if (!rozwiniete) return;
    const adres = new URL(window.location.href);
    if (wybrana) adres.searchParams.set("os", wybrana);
    else adres.searchParams.delete("os");
    const rozw = kodujRozwiniecie(las, korzenie, rozwiniete, poziomy);
    if (rozw) adres.searchParams.set("rozw", rozw);
    else adres.searchParams.delete("rozw");
    window.history.replaceState(null, "", adres.pathname + adres.search);
  }, [wybrana, rozwiniete, poziomy, las, korzenie]);

  // ── wirtualizacja ──
  const lista = useRef<HTMLDivElement>(null);
  const [margines, setMargines] = useState(0);
  useEffect(() => {
    const odczyt = () => lista.current && setMargines(Math.round(lista.current.getBoundingClientRect().top + window.scrollY));
    odczyt();
    window.addEventListener("resize", odczyt);
    return () => window.removeEventListener("resize", odczyt);
  }, [belkaPx, naglowekPx, gotowe]);

  const wirtualizator = useWindowVirtualizer({
    count: wiersze.length,
    estimateSize: () => wysokoscWiersza,
    overscan: 14,
    scrollMargin: margines,
    scrollPaddingStart: gora + belkaPx + 8,
    scrollPaddingEnd: telefon ? Math.round(window.innerHeight * 0.55) : 24,
    getItemKey: (i) => wiersze[i]?.id ?? i,
  });
  useEffect(() => {
    wirtualizator.measure();
  }, [wirtualizator, wysokoscWiersza]);

  // Po zmianie listy przewiń do wskazanego wiersza.
  useEffect(() => {
    if (!cel) return;
    const i = wiersze.findIndex((w) => w.id === cel.id);
    if (i < 0) return;
    wirtualizator.scrollToIndex(i, { align: cel.wyrownanie });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- zadanie jednorazowe: czyścimy je po wykonaniu
    setCel(null);
  }, [cel, wiersze, wirtualizator]);

  // Przeniesienie fokusu na wiersz po ruchu strzałkami (wiersz może jeszcze nie być narysowany).
  useEffect(() => {
    const id = fokusPo.current;
    if (!id || id !== aktywnyId) return;
    let ramka = 0;
    let proby = 0;
    const probuj = () => {
      const el = lista.current?.querySelector<HTMLElement>(`[data-wiersz="${id}"]`);
      if (el) {
        el.focus({ preventScroll: true });
        fokusPo.current = null;
      } else if (proby++ < 10) ramka = requestAnimationFrame(probuj);
    };
    probuj();
    return () => cancelAnimationFrame(ramka);
  }, [aktywnyId, wiersze, wirtualizator.range?.startIndex]);

  useEffect(() => {
    if (!podswietlona) return;
    const t = setTimeout(() => setPodswietlona(null), 3600);
    return () => clearTimeout(t);
  }, [podswietlona]);

  // ── działania ──
  /** Pokazuje osobę: rozwija ścieżkę przodków, przewija do wiersza, podświetla go i otwiera panel. */
  const pokazOsobe = useCallback(
    (osobaId: string, opcje: { przewin?: "center" | "start" | "auto" | false } = {}) => {
      const jednostka = las.jednostkaOsoby.get(osobaId);
      const o = mapa.get(osobaId);
      if (!jednostka || !o) return;
      if (!wWidoku(las, korzenie, jednostka)) {
        router.push(sciezkaGalezi(slug, widokOsoby(osobaId), osobaId));
        return;
      }
      setWybrana(osobaId);
      setAktywnyId(jednostka);
      const przewin = opcje.przewin === undefined ? "center" : opcje.przewin;
      if (przewin) {
        setPodswietlona(jednostka);
        setRozwiniete((stare) => rozwinDo(stare ?? new Set(), przodkowieWWidoku(las, korzenie, jednostka)));
        setCel({ id: jednostka, wyrownanie: przewin });
      }
    },
    [las, korzenie, mapa, router, slug, widokOsoby],
  );

  useEffect(() => {
    if (oczekujaca && las.jednostkaOsoby.has(oczekujaca)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- zadanie jednorazowe: pokazanie dopiero co dodanej osoby
      pokazOsobe(oczekujaca);
      setOczekujaca(null);
    }
  }, [oczekujaca, las, pokazOsobe]);

  useEffect(() => {
    ustawObslugeWyboru((id) => pokazOsobe(id));
    return () => ustawObslugeWyboru(null);
  }, [pokazOsobe]);

  const zamknijPanel = useCallback(() => {
    const poprzednia = wybrana;
    setWybrana(null);
    const j = poprzednia ? las.jednostkaOsoby.get(poprzednia) : undefined;
    if (j) {
      setAktywnyId(j);
      // Fokus wraca na wiersz, z którego otwarto panel.
      requestAnimationFrame(() => lista.current?.querySelector<HTMLElement>(`[data-wiersz="${j}"]`)?.focus({ preventScroll: true }));
    }
  }, [wybrana, las]);

  const przelacz = useCallback((id: string) => {
    setRozwiniete((stare) => {
      const nowe = new Set(stare);
      if (nowe.has(id)) nowe.delete(id);
      else nowe.add(id);
      return nowe;
    });
  }, []);

  const ustawPoziomy = useCallback(
    (n: number) => {
      const nowe = Math.max(1, Math.min(maxPoziomow, n));
      setPoziomy(nowe);
      setRozwiniete(rozwinDoPoziomu(las, korzenie, nowe));
      // Zaznaczona osoba, która znika przy zwijaniu, zostaje w adresie; panel pokazuje ją nadal.
    },
    [las, korzenie, maxPoziomow],
  );

  const wDol = (i: number) => {
    const w = wiersze[Math.max(0, Math.min(wiersze.length - 1, i))];
    if (!w) return;
    fokusPo.current = w.id;
    setAktywnyId(w.id);
    wirtualizator.scrollToIndex(wiersze.indexOf(w), { align: "auto" });
  };

  const naKlawisz = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = Math.max(0, wiersze.findIndex((w) => w.id === aktywnyId));
    const w = wiersze[i];
    if (!w || e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case "ArrowDown":
        wDol(i + 1);
        break;
      case "ArrowUp":
        wDol(i - 1);
        break;
      case "Home":
        wDol(0);
        break;
      case "End":
        wDol(wiersze.length - 1);
        break;
      case "ArrowRight":
        if (w.maDzieci && !w.rozwiniety) przelacz(w.id);
        else if (w.rozwiniety) wDol(i + 1);
        break;
      case "ArrowLeft":
        if (w.rozwiniety) przelacz(w.id);
        else if (w.rodzicId) wDol(wiersze.findIndex((x) => x.id === w.rodzicId));
        break;
      case "Enter":
      case " ":
        pokazOsobe(w.id, { przewin: false });
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const wybranaOsoba = wybrana ? mapa.get(wybrana) : undefined;
  const jednostkaWybranej = wybrana ? las.jednostkaOsoby.get(wybrana) : undefined;
  const przyciskDiagram = sciezkaDiagramu(slug, galazId, wybrana);
  const wszystkoRozwiniete = gotowe && wiersze.length === liczJednostki(las, korzenie);
  const kolorGalezi = galaz.kolor;
  const koloryGalezi = new Map(galezie.map((g) => [g.id, g.kolor]));

  if (!rozwiniete) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6">
        <h1 className="sr-only">{galaz.nazwa}</h1>
        <p role="status" className="py-16 text-center text-tekst-2">
          Rozkładanie listy…
        </p>
      </main>
    );
  }

  return (
    <>
      <div ref={belka} className="sticky z-30 border-b border-kreska bg-lita/90" style={{ top: gora }}>
        <div className="mx-auto max-w-7xl space-y-1.5 px-4 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="min-w-0 text-lg leading-tight sm:text-xl">
              <span className="znacznik" style={{ ["--kolor" as string]: kolorGalezi }}>
                <span className="truncate">{galaz.nazwa}</span>
              </span>
              <span className="ml-2 text-sm font-normal text-tekst-2">{ileOsob(liczbaOsob + api.edycje.dodane.filter((n) => galazId === "cale" || n.galazId === galazId).length)}</span>
            </h1>
            <div role="toolbar" aria-label="Sterowanie listą" className="-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1.5 overflow-x-auto px-1 pb-0.5 sm:ml-auto sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0 [&>*]:shrink-0">
              <div className="flex items-center gap-1" role="group" aria-label="Pokaż pokolenia do numeru">
                <span className="mr-0.5 hidden text-xs text-tekst-2 sm:inline">Pokolenia do</span>
                {Array.from({ length: maxPoziomow }, (_, k) => k + 1).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="przycisk !min-h-8 !min-w-8 !px-2 text-xs tabular-nums"
                    aria-pressed={poziomy === k}
                    aria-label={`Zwiń do pokolenia ${pokolenieStartu + k - 1}`}
                    title={`Zwiń do pokolenia ${pokolenieStartu + k - 1}`}
                    onClick={() => ustawPoziomy(k)}
                  >
                    <span aria-hidden="true" className="mr-1 size-2 rounded-full" style={{ backgroundColor: kolorPokolenia(pokolenieStartu + k - 1) }} />
                    {pokolenieStartu + k - 1}
                  </button>
                ))}
              </div>
              <button type="button" className="przycisk !min-h-8 !px-3 text-xs" onClick={() => ustawPoziomy(maxPoziomow)} disabled={wszystkoRozwiniete}>
                Rozwiń wszystko
              </button>
              <button type="button" className="przycisk !min-h-8 !px-3 text-xs" onClick={() => ustawPoziomy(1)} disabled={wiersze.length === korzenie.length}>
                Zwiń wszystko
              </button>
              <Link href={przyciskDiagram} className="przycisk przycisk-glowny !min-h-8 !px-3 text-xs">
                Pokaż jako diagram
              </Link>
            </div>
          </div>
          <nav aria-label="Gałęzie tego drzewa" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            {galezieWidoku(galezie).map((g) => {
              const aktywna = g.id === galazId;
              return (
                <Link
                  key={g.id}
                  href={sciezkaGalezi(slug, g.id)}
                  aria-current={aktywna ? "page" : undefined}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium"
                  style={aktywna ? { backgroundColor: g.kolor, borderColor: g.kolor, color: tekstNaKolorze(g.kolor) } : { borderColor: "var(--kreska)" }}
                >
                  {!aktywna && <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: g.kolor }} />}
                  {g.nazwa}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-3">
        <p className="sr-only" role="status" aria-live="polite">
          Widocznych wierszy: {wiersze.length}.
        </p>
        <div className={`grid items-start gap-4 ${wybranaOsoba ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : ""} ${wybranaOsoba ? "max-lg:pb-[55dvh]" : ""}`}>
          <div className="panel overflow-hidden !rounded-2xl">
            <div
              ref={lista}
              role="tree"
              aria-label={`Lista osób: ${galaz.nazwa}. Strzałki poruszają po wierszach, lewo i prawo zwija i rozwija, Enter otwiera panel osoby.`}
              onKeyDown={naKlawisz}
              className="relative"
              style={{ height: wirtualizator.getTotalSize() }}
            >
              {wirtualizator.getVirtualItems().map((v) => {
                const w = wiersze[v.index];
                if (!w) return null;
                const o = mapa.get(w.id)!;
                const aktywny = (aktywnyId ?? wiersze[0]?.id) === w.id;
                return (
                  <div
                    key={v.key}
                    data-wiersz={w.id}
                    role="treeitem"
                    aria-level={w.poziom + 1}
                    aria-expanded={w.maDzieci ? w.rozwiniety : undefined}
                    aria-selected={jednostkaWybranej === w.id}
                    tabIndex={aktywny ? 0 : -1}
                    onClick={() => pokazOsobe(w.id, { przewin: telefon ? "start" : false })}
                    onFocus={() => setAktywnyId(w.id)}
                    className={`wiersz-listy absolute left-0 top-0 flex w-full cursor-pointer items-center outline-offset-[-2px] ${podswietlona === w.id ? "podswietlona" : ""}`}
                    style={{ height: wysokoscWiersza, transform: `translateY(${v.start - wirtualizator.options.scrollMargin}px)`, borderLeft: galazId === "cale" ? `3px solid ${koloryGalezi.get(o.galazId) ?? "transparent"}` : undefined }}
                  >
                    <Polaczenia ostatni={w.ostatni} wysokosc={wysokoscWiersza} />
                    <div className="relative flex min-w-0 flex-1 items-center gap-2 pr-3" style={{ paddingLeft: w.poziom * WCIECIE + 8 }}>
                      {w.maDzieci ? (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            przelacz(w.id);
                          }}
                          aria-label={`${w.rozwiniety ? "Zwiń" : "Rozwiń"} potomków: ${pelneImie(o)} (${ileOsob(w.potomkow)})`}
                          className="flex size-6 shrink-0 items-center justify-center rounded-md text-tekst-2 transition-colors hover:bg-zaznaczenie hover:text-tekst"
                        >
                          <svg aria-hidden="true" viewBox="0 0 12 12" className={`size-3 transition-transform duration-150 ${w.rozwiniety ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 2l4 4-4 4" />
                          </svg>
                        </button>
                      ) : (
                        <span aria-hidden="true" className="size-6 shrink-0" />
                      )}
                      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: kolorPokolenia(o.pokolenie) }} title={`Pokolenie ${o.pokolenie}`} />
                      <span className="shrink-0 text-[15px] font-semibold">
                        {pelneImie(o)}
                        {o.niepewna && <span className="font-normal text-tekst-2"> ?</span>}
                      </span>
                      {o.lata && <span className="shrink-0 text-xs tabular-nums text-tekst-2">{o.lata}</span>}
                      {w.malzonkowie.length > 0 && (
                        <span className="min-w-0 truncate text-xs text-tekst-2">
                          mał.{" "}
                          {w.malzonkowie.map((m, i) => {
                            const s = mapa.get(m.id)!;
                            return (
                              <span key={m.id}>
                                {i > 0 && ", "}
                                {pelneImie(s)}
                                {s.lata && ` (${s.lata})`}
                              </span>
                            );
                          })}
                        </span>
                      )}
                      {w.maDzieci && !w.rozwiniety && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            przelacz(w.id);
                          }}
                          aria-label={`Rozwiń potomków: ${pelneImie(o)} (${ileOsob(w.potomkow)})`}
                          className="ml-auto shrink-0 rounded-full bg-akcent px-2 text-[11px] font-bold leading-5 tabular-nums text-akcent-tekst"
                        >
                          +{w.potomkow}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {wybranaOsoba && <PanelOsoby slug={slug} osoba={wybranaOsoba} osoby={mapa} pary={pary} galezie={galezie} widok="lista" gora={gora + belkaPx + 12} api={api} naDodane={setOczekujaca} naWybor={(id) => pokazOsobe(id)} naZamkniecie={zamknijPanel} />}
        </div>
      </main>
    </>
  );
}

/**
 * Linie łączące wiersz z rodzicem i rodzeństwem (jak w eksploratorze plików): pionowa linia pod rodzicem,
 * od niej poziome odnogi do każdego dziecka, a przy ostatnim dziecku zaokrąglone zakończenie.
 */
function Polaczenia({ ostatni, wysokosc }: { ostatni: boolean[]; wysokosc: number }) {
  const p = ostatni.length;
  if (!p) return null;
  const srodek = wysokosc / 2;
  const d: string[] = [];
  for (let l = 1; l <= p; l++) {
    const x = (l - 1) * WCIECIE + 20.5;
    if (l < p) {
      if (!ostatni[l - 1]) d.push(`M${x} 0V${wysokosc}`); // linia rodzeństwa przodka biegnie dalej
    } else if (ostatni[l - 1]) {
      d.push(`M${x} 0V${srodek - 5}a5 5 0 0 0 5 5H${x + 11}`);
    } else {
      d.push(`M${x} 0V${wysokosc}M${x} ${srodek}H${x + 11}`);
    }
  }
  return (
    <svg aria-hidden="true" width={p * WCIECIE + 20} height={wysokosc} className="pointer-events-none absolute left-0 top-0 text-tekst-2/60" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d={d.join("")} />
    </svg>
  );
}

function liczJednostki(las: ReturnType<typeof lasGalezi>["las"], korzenie: string[]): number {
  const idz = (id: string): number => las.jednostki.get(id)!.dzieci.reduce((s, d) => s + 1 + idz(d), 0);
  return korzenie.reduce((s, k) => s + 1 + idz(k), 0);
}

const bezSubskrypcji = () => () => {};

/** Lista mierzy okno przeglądarki, więc rysujemy ją dopiero po stronie klienta. */
export function ListaGalezi(props: Props) {
  const klient = useSyncExternalStore(bezSubskrypcji, () => true, () => false);
  if (!klient) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6">
        <h1 className="text-xl">{znajdzGalaz(props.galezie, props.galazId).nazwa}</h1>
        <p role="status" className="py-16 text-center text-tekst-2">
          Rozkładanie listy…
        </p>
      </main>
    );
  }
  return <ListaGaleziWnetrze key={props.galazId} {...props} />;
}
