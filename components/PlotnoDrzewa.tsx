"use client";

import { Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { OsobaPanelu } from "@/lib/dane";
import {
  KARTA_SZER,
  KARTA_WYS,
  ODSTEP_PARY,
  kartyJednostki,
  przodkowieJednostki,
  rozwinDoPoziomu,
  ulozLas,
  zbudujLas,
  type Jednostka,
  type Las,
  type ParaDrzewa,
} from "@/lib/drzewo";
import { pelneImie } from "@/lib/format";
import type { Galaz } from "@/lib/schemat";
import { sciezkaDrzewa, sciezkaOsoby } from "@/lib/sciezki";
import { ustawObslugeWyboru } from "@/lib/wybor";
import { PanelOsoby } from "./PanelOsoby";

const DOMYSLNE_POZIOMY = 3;

type Kontekst = {
  las: Las;
  osoby: Map<string, OsobaPanelu>;
  kolory: Map<string, string>;
  rozwiniete: ReadonlySet<string>;
  wybrana: string | null;
  podswietlona: string | null;
  wybierz: (osobaId: string) => void;
  przelacz: (jednostkaId: string) => void;
};
const KontekstPlotna = createContext<Kontekst | null>(null);

type DaneWezla = { jednostkaId: string };
type WezelJednostki = Node<DaneWezla, "jednostka">;

function odmienOsoby(n: number) {
  if (n === 1) return "osoba";
  return n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "osoby" : "osób";
}

const Jednostka_ = memo(function WezelJednostkiWidok({ data }: NodeProps<WezelJednostki>) {
  const k = useContext(KontekstPlotna)!;
  const j = k.las.jednostki.get(data.jednostkaId)!;
  const uklad = useMemo(() => kartyJednostki(j), [j]);
  const glownaX = uklad.karty.find((x) => x.rola === "glowna")!.x;
  const rozwinieta = k.rozwiniete.has(j.id);
  const pierwszeDziecko = j.dzieci.length ? k.las.jednostki.get(j.dzieci[0])! : null;
  const xPrzycisku = pierwszeDziecko && pierwszeDziecko.zPartnerem >= 0 ? uklad.uchwyty[pierwszeDziecko.zPartnerem] : uklad.uchwytGlownej;
  const partnerzyZDziecmi = new Set(j.dzieci.map((d) => k.las.jednostki.get(d)!.zPartnerem));
  const glowna = k.osoby.get(j.glowna)!;

  return (
    <div className="pointer-events-auto relative" style={{ width: uklad.szerokosc, height: KARTA_WYS }}>
      <Handle type="target" position={Position.Top} id="gora" style={{ left: glownaX + KARTA_SZER / 2 }} isConnectable={false} />

      {/* Łączniki małżeńskie */}
      {uklad.karty.map((karta) => {
        if (karta.rola !== "partner") return null;
        const sasiad = Math.abs(karta.x - glownaX) === KARTA_SZER + ODSTEP_PARY;
        const lewo = Math.min(karta.x, glownaX) + KARTA_SZER;
        const nrPartnera = j.partnerzy.findIndex((p) => p.id === karta.osobaId);
        return sasiad ? (
          <div key={`l-${karta.osobaId}`} aria-hidden="true">
            <div className="absolute h-[5px] border-y border-kreska" style={{ left: lewo, width: ODSTEP_PARY, top: KARTA_WYS / 2 - 2 }} />
            {j.partnerzy.length > 1 && (
              <span className="absolute z-10 flex size-4 items-center justify-center rounded-full border border-kreska bg-papier-jasny text-[10px] leading-none text-sepia" style={{ left: lewo + ODSTEP_PARY / 2 - 8, top: KARTA_WYS / 2 - 8 }}>
                {karta.kolejnosc}
              </span>
            )}
            {partnerzyZDziecmi.has(nrPartnera) && <div className="absolute w-px bg-kreska" style={{ left: uklad.uchwyty[nrPartnera], top: KARTA_WYS / 2 + 3, height: KARTA_WYS / 2 - 3 }} />}
          </div>
        ) : (
          <div key={`l-${karta.osobaId}`} aria-hidden="true" className="absolute h-2.5 border-x border-t border-kreska" style={{ left: glownaX + KARTA_SZER / 2, width: karta.x - glownaX, top: -10 }}>
            <span className="absolute -top-2 left-1/2 flex size-4 -translate-x-1/2 items-center justify-center rounded-full border border-kreska bg-papier-jasny text-[10px] leading-none text-sepia">{karta.kolejnosc}</span>
          </div>
        );
      })}

      {uklad.karty.map((karta) => {
        const o = k.osoby.get(karta.osobaId)!;
        const wybrana = k.wybrana === o.id;
        return (
          <button
            key={karta.osobaId}
            type="button"
            data-osoba={o.id}
            onClick={() => k.wybierz(o.id)}
            aria-pressed={wybrana}
            aria-label={`${pelneImie(o)}${o.lata ? `, ${o.lata}` : ""}${karta.rola === "partner" ? `, małżonek osoby ${pelneImie(glowna)}` : ""}${karta.odsylacz ? " (odsyłacz do własnej karty)" : ""}`}
            title={pelneImie(o)}
            className={`etykieta absolute top-0 block cursor-pointer border-l-4 px-2.5 py-1.5 text-left hover:bg-white ${karta.rola === "partner" ? "bg-papier" : ""} ${karta.odsylacz ? "border-dashed" : ""} ${wybrana ? "z-20 ring-2 ring-bordo" : ""} ${k.podswietlona === o.id ? "podswietlona z-20" : ""}`}
            style={{ left: karta.x, width: KARTA_SZER, height: KARTA_WYS, borderLeftColor: k.kolory.get(o.galazId) }}
          >
            <span className="szeryf block truncate text-[16px] font-semibold leading-[1.15] text-atrament">
              {o.imie || "NN"}
              {o.niepewna && <span className="font-normal text-sepia"> ?</span>}
            </span>
            <span className="szeryf block truncate text-[15px] leading-[1.15] text-atrament">{o.nazwisko || "NN"}</span>
            <span className="block truncate text-[12px] leading-tight tabular-nums text-sepia">{karta.odsylacz ? "↗ ma własną kartę" : o.lata}</span>
          </button>
        );
      })}

      {uklad.uchwyty.map((x, i) => (
        <Handle key={i} type="source" position={Position.Bottom} id={`p${i}`} style={{ left: x }} isConnectable={false} />
      ))}
      <Handle type="source" position={Position.Bottom} id="g" style={{ left: uklad.uchwytGlownej }} isConnectable={false} />

      {j.dzieci.length > 0 && (
        <button
          type="button"
          onClick={() => k.przelacz(j.id)}
          aria-expanded={rozwinieta}
          aria-label={`${rozwinieta ? "Zwiń" : "Rozwiń"} potomków: ${pelneImie(glowna)} (${j.potomkow} ${odmienOsoby(j.potomkow)})`}
          title={rozwinieta ? "Zwiń potomków" : `Rozwiń potomków (${j.potomkow} ${odmienOsoby(j.potomkow)})`}
          className={`absolute z-30 flex h-[22px] min-w-[22px] -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border px-1.5 text-[12px] font-semibold leading-none tabular-nums shadow-sm ${
            rozwinieta ? "border-kreska bg-papier-jasny text-sepia hover:bg-white" : "border-bordo bg-bordo text-white hover:bg-[#641c28]"
          }`}
          style={{ left: xPrzycisku, top: KARTA_WYS + 7 }}
        >
          {rozwinieta ? "−" : `+${j.potomkow}`}
        </button>
      )}
    </div>
  );
});

const TYPY_WEZLOW = { jednostka: Jednostka_ };

type Props = { osoby: OsobaPanelu[]; pary: ParaDrzewa[]; galezie: Galaz[]; galazId?: string };

function Plotno({ osoby, pary, galezie, galazId }: Props) {
  const router = useRouter();
  const rf = useReactFlow();
  const mapaOsob = useMemo(() => new Map(osoby.map((o) => [o.id, o])), [osoby]);
  const las = useMemo(() => {
    const pelny = zbudujLas(osoby, pary);
    if (!galazId) return pelny;
    // Widok jednej gałęzi: pod jednostkami zostają tylko dzieci z tej samej gałęzi.
    const jednostki = new Map([...pelny.jednostki].map(([id, j]) => [id, { ...j, dzieci: j.dzieci.filter((d) => mapaOsob.get(d)!.galazId === galazId) }]));
    return { ...pelny, jednostki };
  }, [osoby, pary, galazId, mapaOsob]);
  const kolory = useMemo(() => new Map(galezie.map((g) => [g.id, g.kolor])), [galezie]);

  // Korzenie widoku: całe drzewo albo pierwsze jednostki wybranej gałęzi.
  const korzenie = useMemo(() => {
    if (!galazId) return las.korzenie;
    return [...las.jednostki.values()]
      .filter((j) => mapaOsob.get(j.glowna)!.galazId === galazId && (!j.rodzicId || mapaOsob.get(las.jednostki.get(j.rodzicId)!.glowna)!.galazId !== galazId))
      .map((j) => j.id);
  }, [las, mapaOsob, galazId]);
  const maxPoziomow = useMemo(() => {
    const glebokosc = (id: string): number => 1 + Math.max(0, ...las.jednostki.get(id)!.dzieci.map(glebokosc));
    return Math.max(1, ...korzenie.map(glebokosc));
  }, [las, korzenie]);

  const [rozwiniete, setRozwiniete] = useState<Set<string>>(() => rozwinDoPoziomu(las, korzenie, DOMYSLNE_POZIOMY));
  const [poziomy, setPoziomy] = useState(Math.min(DOMYSLNE_POZIOMY, maxPoziomow));
  const [wybrana, setWybrana] = useState<string | null>(null);
  const [podswietlona, setPodswietlona] = useState<string | null>(null);
  const [gotowe, setGotowe] = useState(false);
  /** Zadanie do wykonania po przeliczeniu układu: przesuń do osoby / dopasuj / utrzymaj węzeł w miejscu. */
  const poUkladzie = useRef<{ rodzaj: "osoba"; id: string } | { rodzaj: "dopasuj" } | { rodzaj: "kotwica"; id: string; x: number; y: number } | null>(null);
  const [licznikUkladu, setLicznikUkladu] = useState(0);

  const pozycje = useMemo(() => ulozLas(las, korzenie, rozwiniete), [las, korzenie, rozwiniete]);
  const mapaPozycji = useMemo(() => new Map(pozycje.map((p) => [p.id, p])), [pozycje]);

  const wGalezi = useCallback(
    (jednostkaId: string) => korzenie.includes(jednostkaId) || przodkowieJednostki(las, jednostkaId).some((p) => korzenie.includes(p)),
    [las, korzenie],
  );

  const ustawAdres = useCallback((osobaId: string | null) => {
    const adres = new URL(window.location.href);
    if (osobaId) adres.searchParams.set("osoba", osobaId);
    else adres.searchParams.delete("osoba");
    window.history.replaceState(null, "", adres.pathname + adres.search);
  }, []);

  /** Pokazuje osobę: rozwija potrzebne gałęzie, płynnie przesuwa widok i podświetla kartę. */
  const pokazOsobe = useCallback(
    (osobaId: string, opcje: { przesun?: boolean } = {}) => {
      const jednostkaId = las.jednostkaOsoby.get(osobaId);
      if (!jednostkaId) return;
      if (!wGalezi(jednostkaId)) {
        router.push(sciezkaDrzewa(null, osobaId));
        return;
      }
      setWybrana(osobaId);
      ustawAdres(osobaId);
      if (opcje.przesun === false) return;
      setPodswietlona(osobaId);
      const doRozwiniecia = przodkowieJednostki(las, jednostkaId);
      poUkladzie.current = { rodzaj: "osoba", id: osobaId };
      setRozwiniete((stare) => {
        if (doRozwiniecia.every((id) => stare.has(id))) return stare;
        const nowe = new Set(stare);
        doRozwiniecia.forEach((id) => nowe.add(id));
        return nowe;
      });
      setLicznikUkladu((n) => n + 1);
    },
    [las, wGalezi, router, ustawAdres],
  );

  const zamknijPanel = useCallback(() => {
    const poprzednia = wybrana;
    setWybrana(null);
    ustawAdres(null);
    if (poprzednia) document.querySelector<HTMLElement>(`[data-osoba="${poprzednia}"]`)?.focus({ preventScroll: true });
  }, [wybrana, ustawAdres]);

  const przelacz = useCallback(
    (jednostkaId: string) => {
      const p = mapaPozycji.get(jednostkaId);
      if (p) poUkladzie.current = { rodzaj: "kotwica", id: jednostkaId, x: p.x, y: p.y };
      setRozwiniete((stare) => {
        const nowe = new Set(stare);
        if (nowe.has(jednostkaId)) nowe.delete(jednostkaId);
        else nowe.add(jednostkaId);
        return nowe;
      });
      setLicznikUkladu((n) => n + 1);
    },
    [mapaPozycji],
  );

  const ustawPoziomy = useCallback(
    (n: number) => {
      const nowe = Math.max(1, Math.min(maxPoziomow, n));
      setPoziomy(nowe);
      poUkladzie.current = { rodzaj: "dopasuj" };
      setRozwiniete(rozwinDoPoziomu(las, korzenie, nowe));
      setLicznikUkladu((x) => x + 1);
    },
    [las, korzenie, maxPoziomow],
  );

  // Widok początkowy: całość, jeśli mieści się w czytelnym powiększeniu; w przeciwnym razie
  // korzeń drzewa u góry ekranu (resztę widać na minimapie i po przesunięciu).
  const obszar = useRef<HTMLDivElement>(null);
  const naStart = useCallback(() => {
    const el = obszar.current;
    if (el && pozycje.length) {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const x0 = Math.min(...pozycje.map((p) => p.x));
      const x1 = Math.max(...pozycje.map((p) => p.x + p.szerokosc));
      const y0 = Math.min(...pozycje.map((p) => p.y));
      const y1 = Math.max(...pozycje.map((p) => p.y)) + KARTA_WYS + 30;
      const zoom = Math.max(W < 640 ? 0.7 : 0.6, Math.min(1, (W - 48) / (x1 - x0), (H - 48) / (y1 - y0)));
      const pierwsze = pozycje.filter((p) => korzenie.includes(p.id));
      const srodek = pierwsze.length ? (Math.min(...pierwsze.map((p) => p.x)) + Math.max(...pierwsze.map((p) => p.x + p.szerokosc))) / 2 : (x0 + x1) / 2;
      const wys = (y1 - y0) * zoom;
      rf.setViewport({ x: W / 2 - srodek * zoom, y: wys < H ? (H - wys) / 2 - y0 * zoom : 28 - y0 * zoom, zoom });
    }
    setGotowe(true);
  }, [pozycje, korzenie, rf]);

  // Po każdej zmianie układu wykonaj zaplanowany ruch kamery.
  useEffect(() => {
    const zadanie = poUkladzie.current;
    if (!gotowe || !zadanie) return;
    poUkladzie.current = null;
    if (zadanie.rodzaj === "dopasuj") {
      requestAnimationFrame(() => rf.fitView({ padding: 0.12, maxZoom: 1, duration: 400 }));
    } else if (zadanie.rodzaj === "kotwica") {
      const p = mapaPozycji.get(zadanie.id);
      if (!p) return;
      const v = rf.getViewport();
      rf.setViewport({ x: v.x - (p.x - zadanie.x) * v.zoom, y: v.y - (p.y - zadanie.y) * v.zoom, zoom: v.zoom });
    } else {
      const jednostkaId = las.jednostkaOsoby.get(zadanie.id)!;
      const p = mapaPozycji.get(jednostkaId);
      if (!p) return;
      const karta = kartyJednostki(las.jednostki.get(jednostkaId)!).karty.find((x) => x.osobaId === zadanie.id);
      const zoom = Math.max(rf.getZoom(), window.innerWidth < 640 ? 0.8 : 1);
      // Na telefonie dolną część ekranu zajmuje szuflada – celujemy nieco wyżej.
      const telefon = window.innerWidth < 640;
      const przesuniecieY = telefon ? 110 / zoom : 0;
      const przesuniecieX = telefon ? 0 : 180 / zoom; // szerokość panelu bocznego / 2
      rf.setCenter(p.x + (karta?.x ?? 0) + KARTA_SZER / 2 + przesuniecieX, p.y + KARTA_WYS / 2 + przesuniecieY, { zoom: Math.min(zoom, 1.25), duration: 700 });
    }
  }, [licznikUkladu, gotowe, mapaPozycji, las, rf]);

  useEffect(() => {
    if (!podswietlona) return;
    const t = setTimeout(() => setPodswietlona(null), 3600);
    return () => clearTimeout(t);
  }, [podswietlona]);

  // Stan w adresie: ?osoba=<id> (także przy „wstecz” w przeglądarce).
  useEffect(() => {
    if (!gotowe) return;
    const zAdresu = () => {
      const id = new URLSearchParams(window.location.search).get("osoba");
      if (id && las.jednostkaOsoby.has(id)) pokazOsobe(id);
      else if (!id) setWybrana(null);
    };
    zAdresu();
    window.addEventListener("popstate", zAdresu);
    return () => window.removeEventListener("popstate", zAdresu);
  }, [gotowe, las, pokazOsobe]);

  // Wyszukiwarka z nagłówka steruje płótnem, dopóki jest ono na ekranie.
  useEffect(() => {
    ustawObslugeWyboru((id) => pokazOsobe(id));
    return () => ustawObslugeWyboru(null);
  }, [pokazOsobe]);

  // Kliknięcie karty: na komputerze widok zostaje w miejscu; na telefonie karta wyjeżdża nad szufladę.
  const wybierz = useCallback((id: string) => pokazOsobe(id, { przesun: window.innerWidth < 640 }), [pokazOsobe]);

  const sciezkaWybranej = useMemo(() => {
    const j = wybrana ? las.jednostkaOsoby.get(wybrana) : undefined;
    return new Set(j ? [j, ...przodkowieJednostki(las, j)] : []);
  }, [las, wybrana]);

  const wezly: WezelJednostki[] = useMemo(
    () =>
      pozycje.map((p) => ({
        id: p.id,
        type: "jednostka" as const,
        position: { x: p.x, y: p.y },
        data: { jednostkaId: p.id },
        width: p.szerokosc,
        height: KARTA_WYS,
        draggable: false,
        selectable: false,
        focusable: false,
      })),
    [pozycje],
  );
  const krawedzie: Edge[] = useMemo(() => {
    const wynik: Edge[] = [];
    for (const p of pozycje) {
      const j: Jednostka = las.jednostki.get(p.id)!;
      if (!j.rodzicId || !mapaPozycji.has(j.rodzicId)) continue;
      const naSciezce = sciezkaWybranej.has(j.id);
      wynik.push({
        id: `${j.rodzicId}>${j.id}`,
        source: j.rodzicId,
        target: j.id,
        sourceHandle: j.zPartnerem >= 0 ? `p${j.zPartnerem}` : "g",
        targetHandle: "gora",
        type: "smoothstep",
        pathOptions: { borderRadius: 5 },
        focusable: false,
        selectable: false,
        zIndex: naSciezce ? 1 : 0,
        style: naSciezce ? { stroke: "var(--color-bordo)", strokeWidth: 2 } : undefined,
      } as Edge);
    }
    return wynik;
  }, [pozycje, las, mapaPozycji, sciezkaWybranej]);

  const kontekst: Kontekst = useMemo(
    () => ({ las, osoby: mapaOsob, kolory, rozwiniete, wybrana, podswietlona, wybierz, przelacz }),
    [las, mapaOsob, kolory, rozwiniete, wybrana, podswietlona, wybierz, przelacz],
  );

  const widocznychOsob = useMemo(() => pozycje.reduce((s, p) => s + 1 + las.jednostki.get(p.id)!.partnerzy.length, 0), [pozycje, las]);
  const wszystkoRozwiniete = pozycje.length === korzenie.reduce((s, k) => s + 1 + liczJednostki(las, k), 0);
  const przycisk = "flex h-9 min-w-9 shrink-0 items-center whitespace-nowrap justify-center rounded-sm border border-kreska bg-papier-jasny px-2 text-[15px] text-atrament shadow-karta hover:bg-white disabled:opacity-45";
  const galazAktywna = galezie.find((g) => g.id === galazId);
  const startMobilny = wybrana ?? (korzenie[0] ? las.jednostki.get(korzenie[0])!.glowna : null);

  return (
    <KontekstPlotna.Provider value={kontekst}>
      <div className="absolute inset-0 flex flex-col">
        <div className="z-20 flex flex-col gap-2 border-b border-kreska/60 bg-papier/90 px-3 py-2 2xl:flex-row 2xl:items-center">
          <nav aria-label="Legenda gałęzi – pokaż tylko wybraną" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:flex-wrap md:pb-0">
            <Link href={sciezkaDrzewa()} aria-current={!galazId ? "page" : undefined} className={`shrink-0 rounded-full border px-3 py-1 text-sm ${!galazId ? "border-atrament bg-atrament text-white" : "border-kreska bg-papier-jasny text-atrament hover:bg-white"}`}>
              Wszystkie gałęzie
            </Link>
            {galezie.map((g) => {
              const aktywna = g.id === galazId;
              return (
                <Link
                  key={g.id}
                  href={sciezkaDrzewa(g.id)}
                  aria-current={aktywna ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${aktywna ? "text-white" : "border-kreska bg-papier-jasny text-atrament hover:bg-white"}`}
                  style={aktywna ? { backgroundColor: g.kolor, borderColor: g.kolor } : undefined}
                >
                  <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: aktywna ? "#fff" : g.kolor }} />
                  {g.nazwa}
                </Link>
              );
            })}
          </nav>

          <div role="toolbar" aria-label="Sterowanie widokiem drzewa" className="flex flex-wrap items-center gap-1.5 2xl:ml-auto 2xl:flex-nowrap">
            <div className="flex items-center gap-1" role="group" aria-label="Liczba rozwiniętych pokoleń">
              <span className="mr-0.5 hidden text-sm text-sepia sm:inline">Pokolenia</span>
              <button type="button" className={przycisk} onClick={() => ustawPoziomy(poziomy - 1)} disabled={poziomy <= 1} aria-label="Zwiń jedno pokolenie">
                −
              </button>
              <output className="min-w-12 text-center text-sm tabular-nums text-atrament" aria-live="polite">
                {poziomy} z {maxPoziomow}
              </output>
              <button type="button" className={przycisk} onClick={() => ustawPoziomy(poziomy + 1)} disabled={poziomy >= maxPoziomow} aria-label="Rozwiń kolejne pokolenie">
                +
              </button>
            </div>
            <button type="button" className={przycisk} onClick={() => ustawPoziomy(wszystkoRozwiniete ? DOMYSLNE_POZIOMY : maxPoziomow)}>
              {wszystkoRozwiniete ? "Zwiń do 3" : "Rozwiń wszystko"}
            </button>
            <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-kreska/60 sm:block" />
            <button type="button" className={`${przycisk} max-sm:hidden`} onClick={() => rf.zoomOut({ duration: 200 })} aria-label="Pomniejsz">
              <Lupa znak="minus" />
            </button>
            <button type="button" className={`${przycisk} max-sm:hidden`} onClick={() => rf.zoomIn({ duration: 200 })} aria-label="Powiększ">
              <Lupa znak="plus" />
            </button>
            <button type="button" className={przycisk} onClick={() => rf.fitView({ padding: 0.12, maxZoom: 1, duration: 400 })}>
              Dopasuj<span className="max-sm:sr-only">&nbsp;do ekranu</span>
            </button>
          </div>
        </div>

        <div ref={obszar} className="relative min-h-0 flex-1">
          <h1 className="sr-only">{galazAktywna ? `Drzewo – ${galazAktywna.nazwa}` : "Drzewo genealogiczne"}</h1>
          <p className="sr-only" role="status" aria-live="polite">
            Widocznych osób: {widocznychOsob} z {osoby.length}.
          </p>
          <ReactFlow
            nodes={wezly}
            edges={krawedzie}
            nodeTypes={TYPY_WEZLOW}
            onInit={naStart}
            minZoom={0.03}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            edgesFocusable={false}
            elementsSelectable={false}
            zoomOnDoubleClick={false}
            onlyRenderVisibleElements
            onPaneClick={() => wybrana && zamknijPanel()}
            aria-label="Płótno drzewa genealogicznego. Przeciągnij, aby przesunąć; kółko myszy lub gest szczypania zmienia powiększenie."
          >
            <MiniMap
              position="bottom-left"
              pannable
              zoomable
              ariaLabel="Minimapa drzewa"
              className="!hidden sm:!block"
              nodeColor={(n) => kolory.get(mapaOsob.get(n.id)?.galazId ?? "") ?? "#a08a6c"}
              nodeStrokeWidth={0}
              nodeBorderRadius={6}
            />
          </ReactFlow>

          {!wybrana && startMobilny && (
            <p className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex justify-center sm:hidden">
              <Link href={sciezkaOsoby(startMobilny)} className="etykieta pointer-events-auto px-3 py-2 text-center text-sm text-atrament">
                Mały ekran? Wygodniejszy jest <span className="link">widok osoby</span>
              </Link>
            </p>
          )}

          {wybrana && <PanelOsoby osoba={mapaOsob.get(wybrana)!} osoby={mapaOsob} pary={pary} galezie={galezie} naWybor={pokazOsobe} naZamkniecie={zamknijPanel} />}
        </div>
      </div>
    </KontekstPlotna.Provider>
  );
}

function Lupa({ znak }: { znak: "plus" | "minus" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M12.8 12.8 17 17M6 8.5h5" />
      {znak === "plus" && <path d="M8.5 6v5" />}
    </svg>
  );
}

function liczJednostki(las: Las, id: string): number {
  return las.jednostki.get(id)!.dzieci.reduce((s, d) => s + 1 + liczJednostki(las, d), 0);
}

export function PlotnoDrzewa(props: Props) {
  const [zamontowane, setZamontowane] = useState(false);
  // Płótno mierzy okno przeglądarki, dlatego rysujemy je dopiero po stronie klienta.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- celowe: przełączenie z wersji statycznej na interaktywną
  useEffect(() => setZamontowane(true), []);
  if (!zamontowane) {
    return <p className="absolute inset-0 flex items-center justify-center text-sepia">Rozkładanie drzewa…</p>;
  }
  return (
    <ReactFlowProvider>
      {/* key: przejście między gałęziami zaczyna od domyślnego stanu rozwinięcia */}
      <Plotno key={props.galazId ?? "wszystkie"} {...props} />
    </ReactFlowProvider>
  );
}
