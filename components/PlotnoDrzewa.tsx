"use client";

import { Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { naPanelu } from "@/lib/edycje";
import { galezieWidoku, idWidoku, znajdzGalaz } from "@/lib/galezie";
import type { OsobaPanelu } from "@/lib/panel";
import {
  KARTA_SZER,
  KARTA_WYS,
  ODSTEP_PARY,
  kartyJednostki,
  lasGalezi,
  przodkowieJednostki,
  przodkowieWWidoku,
  rozwinDoPoziomu,
  ulozLas,
  wWidoku,
  type Jednostka,
  type Las,
  type ParaDrzewa,
  type Pozycja,
} from "@/lib/drzewo";
import { odmien, pelneImie } from "@/lib/format";
import { tekstNaKolorze } from "@/lib/kolor";
import type { Galaz } from "@/lib/schemat";
import { sciezkaDiagramu, sciezkaGalezi } from "@/lib/sciezki";
import { ustawObslugeWyboru } from "@/lib/wybor";
import { PanelOsoby } from "./PanelOsoby";
import { useEdycje } from "./useEdycje";

const DOMYSLNE_POZIOMY = 3;
/** Najmniejsze powiększenie, przy którym daty na kartach (12 px) są czytelne bez przybliżania. */
const MIN_ZOOM_PC = 0.9;
const MIN_ZOOM_TELEFON = 0.8;
const MARGINES = 24;

const minZoom = () => (typeof window !== "undefined" && window.innerWidth < 640 ? MIN_ZOOM_TELEFON : MIN_ZOOM_PC);

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

const odmienOsoby = (n: number) => odmien(n, "osoba", "osoby", "osób");

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
            <div className="absolute h-[5px] border-y border-tekst-2" style={{ left: lewo, width: ODSTEP_PARY, top: KARTA_WYS / 2 - 2 }} />
            {j.partnerzy.length > 1 && (
              <span className="absolute z-10 flex size-4 items-center justify-center rounded-full border border-tekst-2 bg-lita text-[10px] leading-none text-tekst" style={{ left: lewo + ODSTEP_PARY / 2 - 8, top: KARTA_WYS / 2 - 8 }}>
                {karta.kolejnosc}
              </span>
            )}
            {partnerzyZDziecmi.has(nrPartnera) && <div className="absolute w-px bg-tekst-2" style={{ left: uklad.uchwyty[nrPartnera], top: KARTA_WYS / 2 + 3, height: KARTA_WYS / 2 - 3 }} />}
          </div>
        ) : (
          <div key={`l-${karta.osobaId}`} aria-hidden="true" className="absolute h-2.5 border-x border-t border-tekst-2" style={{ left: glownaX + KARTA_SZER / 2, width: karta.x - glownaX, top: -10 }}>
            <span className="absolute -top-2 left-1/2 flex size-4 -translate-x-1/2 items-center justify-center rounded-full border border-tekst-2 bg-lita text-[10px] leading-none text-tekst">{karta.kolejnosc}</span>
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
            // Karta na płótnie: półprzezroczyste tło BEZ rozmycia (kart są setki).
            className={`panel absolute top-0 block cursor-pointer !rounded-xl border-l-4 px-2.5 py-1.5 text-left transition-colors hover:bg-najazd ${karta.odsylacz ? "border-dashed" : ""} ${wybrana ? "z-20 ring-2 ring-akcent" : ""} ${k.podswietlona === o.id ? "podswietlona z-20" : ""}`}
            style={{ left: karta.x, width: KARTA_SZER, height: KARTA_WYS, borderLeftColor: k.kolory.get(o.galazId) }}
          >
            <span className="block truncate text-[14px] font-semibold leading-[1.2]">
              {o.imie || "NN"}
              {o.niepewna && <span className="font-normal text-tekst-2"> ?</span>}
            </span>
            <span className="block truncate text-[14px] leading-[1.2]">{o.nazwisko || "NN"}</span>
            <span className="block truncate text-[12px] leading-tight tabular-nums text-tekst-2">{karta.odsylacz ? "↗ ma własną kartę" : o.lata}</span>
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
          className={`absolute z-30 flex h-[24px] min-w-[24px] -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border px-1.5 text-[12px] font-bold leading-none tabular-nums shadow-sm ${
            rozwinieta ? "border-tekst-2 bg-lita text-tekst hover:bg-najazd" : "border-akcent bg-akcent text-akcent-tekst hover:brightness-110"
          }`}
          style={{ left: xPrzycisku, top: KARTA_WYS + 6 }}
        >
          {rozwinieta ? "−" : `+${j.potomkow}`}
        </button>
      )}
    </div>
  );
});

const TYPY_WEZLOW = { jednostka: Jednostka_ };

type Props = { slug: string; osoby: OsobaPanelu[]; pary: ParaDrzewa[]; galezie: Galaz[]; galazId: string };

function Plotno({ slug, osoby: osobyBazowe, pary, galezie, galazId }: Props) {
  const router = useRouter();
  const rf = useReactFlow();
  const api = useEdycje(slug);
  const osoby = useMemo(() => naPanelu(osobyBazowe, api.edycje), [osobyBazowe, api.edycje]);
  const [oczekujaca, setOczekujaca] = useState<string | null>(null);
  const mapaOsob = useMemo(() => new Map(osoby.map((o) => [o.id, o])), [osoby]);
  const { las, korzenie, maxPoziomow } = useMemo(() => lasGalezi(osoby, pary, galazId), [osoby, pary, galazId]);
  const kolory = useMemo(() => new Map(galezie.map((g) => [g.id, g.kolor])), [galezie]);

  const [rozwiniete, setRozwiniete] = useState<Set<string>>(() => rozwinDoPoziomu(las, korzenie, DOMYSLNE_POZIOMY));
  const [poziomy, setPoziomy] = useState(Math.min(DOMYSLNE_POZIOMY, maxPoziomow));
  const [wybrana, setWybrana] = useState<string | null>(null);
  const [podswietlona, setPodswietlona] = useState<string | null>(null);
  const [komunikat, setKomunikat] = useState<string | null>(null);
  const [gotowe, setGotowe] = useState(false);
  /** Zadanie do wykonania po przeliczeniu układu: przesuń do osoby / dopasuj / utrzymaj węzeł w miejscu. */
  const poUkladzie = useRef<{ rodzaj: "osoba"; id: string } | { rodzaj: "dopasuj" } | { rodzaj: "kotwica"; id: string; x: number; y: number } | null>(null);
  const [licznikUkladu, setLicznikUkladu] = useState(0);

  const pozycje = useMemo(() => ulozLas(las, korzenie, rozwiniete), [las, korzenie, rozwiniete]);
  const mapaPozycji = useMemo(() => new Map(pozycje.map((p) => [p.id, p])), [pozycje]);

  const ustawAdres = useCallback((osobaId: string | null) => {
    const adres = new URL(window.location.href);
    if (osobaId) adres.searchParams.set("os", osobaId);
    else adres.searchParams.delete("os");
    window.history.replaceState(null, "", adres.pathname + adres.search);
  }, []);

  /** Pokazuje osobę: rozwija potrzebne gałęzie, płynnie przesuwa widok i podświetla kartę. */
  const pokazOsobe = useCallback(
    (osobaId: string, opcje: { przesun?: boolean } = {}) => {
      const jednostkaId = las.jednostkaOsoby.get(osobaId);
      const o = mapaOsob.get(osobaId);
      if (!jednostkaId || !o) return;
      if (!wWidoku(las, korzenie, jednostkaId)) {
        router.push(sciezkaDiagramu(slug, idWidoku(galezie.find((g) => g.id === o.galazId) ?? znajdzGalaz(galezie, galazId)), osobaId));
        return;
      }
      setWybrana(osobaId);
      ustawAdres(osobaId);
      if (opcje.przesun === false) return;
      setPodswietlona(osobaId);
      const doRozwiniecia = przodkowieWWidoku(las, korzenie, jednostkaId);
      poUkladzie.current = { rodzaj: "osoba", id: osobaId };
      setRozwiniete((stare) => {
        if (doRozwiniecia.every((id) => stare.has(id))) return stare;
        const nowe = new Set(stare);
        doRozwiniecia.forEach((id) => nowe.add(id));
        return nowe;
      });
      setLicznikUkladu((n) => n + 1);
    },
    [las, korzenie, mapaOsob, router, slug, ustawAdres, galezie, galazId],
  );

  useEffect(() => {
    if (oczekujaca && las.jednostkaOsoby.has(oczekujaca)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- zadanie jednorazowe: pokazanie dopiero co dodanej osoby
      pokazOsobe(oczekujaca);
      setOczekujaca(null);
    }
  }, [oczekujaca, las, pokazOsobe]);

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

  // ── dopasowanie widoku ──
  // Zasada: karty muszą być czytelne (daty bez przybliżania) i nie może zostawać duże puste pole nad drzewem.
  // Gdy całość mieści się przy czytelnym powiększeniu – dopasowujemy całość, wyrównaną do góry.
  // W przeciwnym razie dopasowujemy do wybranej osoby (jej poddrzewa) i podpowiadamy, co zrobić.
  const obszar = useRef<HTMLDivElement>(null);
  const dopasuj = useCallback(
    (animuj: boolean) => {
      const el = obszar.current;
      if (!el || !pozycje.length) return;
      const W = el.clientWidth;
      const H = el.clientHeight;
      const granice = (lista: Pozycja[]) => ({
        x0: Math.min(...lista.map((p) => p.x)),
        x1: Math.max(...lista.map((p) => p.x + p.szerokosc)),
        y0: Math.min(...lista.map((p) => p.y)),
        y1: Math.max(...lista.map((p) => p.y)) + KARTA_WYS + 34,
      });
      const zFit = (g: ReturnType<typeof granice>) => Math.min((W - 2 * MARGINES) / (g.x1 - g.x0), (H - 2 * MARGINES) / (g.y1 - g.y0));
      const opcje = animuj ? { duration: 400 } : undefined;
      const minimum = minZoom();

      const calosc = granice(pozycje);
      const zCalosci = zFit(calosc);
      if (zCalosci >= minimum) {
        const zoom = Math.min(1, zCalosci);
        rf.setViewport({ x: (W - (calosc.x1 - calosc.x0) * zoom) / 2 - calosc.x0 * zoom, y: MARGINES - calosc.y0 * zoom, zoom }, opcje);
        setKomunikat(null);
        return;
      }

      // Całość się nie mieści: ostrość na wybranej osobie (albo na pierwszym korzeniu) i jej widocznych potomkach.
      const fokusJ = (wybrana && las.jednostkaOsoby.get(wybrana)) || korzenie[0];
      const fokusPoz = mapaPozycji.get(fokusJ) ?? pozycje[0];
      const poddrzewo: Pozycja[] = [];
      const idz = (id: string) => {
        const p = mapaPozycji.get(id);
        if (!p) return;
        poddrzewo.push(p);
        if (rozwiniete.has(id)) las.jednostki.get(id)!.dzieci.forEach(idz);
      };
      idz(fokusPoz.id);
      const g = granice(poddrzewo);
      const zoom = Math.max(minimum, Math.min(1, zFit(g)));
      const srodekX = (g.x1 - g.x0) * zoom <= W - 2 * MARGINES ? (g.x0 + g.x1) / 2 : fokusPoz.x + fokusPoz.szerokosc / 2;
      rf.setViewport({ x: W / 2 - srodekX * zoom, y: MARGINES - fokusPoz.y * zoom, zoom }, opcje);
      const nazwa = pelneImie(mapaOsob.get(las.jednostki.get(fokusPoz.id)!.glowna)!);
      setKomunikat(`Całe drzewo nie mieści się w czytelnym powiększeniu – widok dopasowano do osoby: ${nazwa}. Użyj wyszukiwarki lub zwijania pokoleń.`);
    },
    [pozycje, mapaPozycji, rozwiniete, las, korzenie, wybrana, rf, mapaOsob],
  );

  const naStart = useCallback(() => {
    dopasuj(false);
    setGotowe(true);
  }, [dopasuj]);

  // Po każdej zmianie układu wykonaj zaplanowany ruch kamery.
  useEffect(() => {
    const zadanie = poUkladzie.current;
    if (!gotowe || !zadanie) return;
    poUkladzie.current = null;
    if (zadanie.rodzaj === "dopasuj") {
      requestAnimationFrame(() => dopasuj(true));
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
      const zoom = Math.max(rf.getZoom(), minZoom());
      // Na telefonie dolną część ekranu zajmuje szuflada – celujemy nieco wyżej.
      const telefon = window.innerWidth < 640;
      const przesuniecieY = telefon ? 110 / zoom : 0;
      const przesuniecieX = telefon ? 0 : 180 / zoom; // połowa szerokości panelu bocznego
      rf.setCenter(p.x + (karta?.x ?? 0) + KARTA_SZER / 2 + przesuniecieX, p.y + KARTA_WYS / 2 + przesuniecieY, { zoom: Math.min(zoom, 1.25), duration: 700 });
    }
  }, [licznikUkladu, gotowe, mapaPozycji, las, rf, dopasuj]);

  useEffect(() => {
    if (!podswietlona) return;
    const t = setTimeout(() => setPodswietlona(null), 3600);
    return () => clearTimeout(t);
  }, [podswietlona]);

  // Stan w adresie: ?os=<id osoby> (także przy „wstecz” w przeglądarce).
  useEffect(() => {
    if (!gotowe) return;
    const zAdresu = () => {
      const id = new URLSearchParams(window.location.search).get("os");
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
        style: naSciezce ? { stroke: "var(--akcent)", strokeWidth: 2.5 } : undefined,
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
  const galazAktywna = znajdzGalaz(galezie, galazId);

  return (
    <KontekstPlotna.Provider value={kontekst}>
      <div className="absolute inset-0 flex flex-col">
        <div className="z-20 flex flex-col gap-2 border-b border-kreska bg-lita/90 px-3 py-2 2xl:flex-row 2xl:items-center">
          <nav aria-label="Gałęzie – pokaż diagram wybranej" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:flex-wrap md:pb-0">
            {galezieWidoku(galezie).map((g) => {
              const aktywna = g.id === galazId;
              return (
                <Link
                  key={g.id}
                  href={sciezkaDiagramu(slug, g.id)}
                  aria-current={aktywna ? "page" : undefined}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
                  style={aktywna ? { backgroundColor: g.kolor, borderColor: g.kolor, color: tekstNaKolorze(g.kolor) } : { borderColor: "var(--kreska)" }}
                >
                  {!aktywna && <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: g.kolor }} />}
                  {g.nazwa}
                </Link>
              );
            })}
          </nav>

          <div role="toolbar" aria-label="Sterowanie widokiem drzewa" className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 2xl:ml-auto 2xl:flex-nowrap [&>*]:shrink-0">
            <div className="flex items-center gap-1" role="group" aria-label="Liczba rozwiniętych pokoleń">
              <span className="mr-0.5 hidden text-sm text-tekst-2 sm:inline">Pokolenia</span>
              <button type="button" className="przycisk !min-h-9 !min-w-9 !px-2" onClick={() => ustawPoziomy(poziomy - 1)} disabled={poziomy <= 1} aria-label="Zwiń jedno pokolenie">
                −
              </button>
              <output className="min-w-12 text-center text-sm tabular-nums" aria-live="polite">
                {poziomy} z {maxPoziomow}
              </output>
              <button type="button" className="przycisk !min-h-9 !min-w-9 !px-2" onClick={() => ustawPoziomy(poziomy + 1)} disabled={poziomy >= maxPoziomow} aria-label="Rozwiń kolejne pokolenie">
                +
              </button>
            </div>
            <button type="button" className="przycisk !min-h-9" onClick={() => ustawPoziomy(wszystkoRozwiniete ? DOMYSLNE_POZIOMY : maxPoziomow)}>
              {wszystkoRozwiniete ? "Zwiń do 3" : "Rozwiń wszystko"}
            </button>
            <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-kreska sm:block" />
            <button type="button" className="przycisk !min-h-9 !min-w-9 !px-2 max-sm:hidden" onClick={() => rf.zoomOut({ duration: 200 })} aria-label="Pomniejsz">
              <Lupa znak="minus" />
            </button>
            <button type="button" className="przycisk !min-h-9 !min-w-9 !px-2 max-sm:hidden" onClick={() => rf.zoomIn({ duration: 200 })} aria-label="Powiększ">
              <Lupa znak="plus" />
            </button>
            <button type="button" className="przycisk !min-h-9" onClick={() => dopasuj(true)}>
              Dopasuj<span className="max-sm:sr-only">&nbsp;do ekranu</span>
            </button>
            <Link href={sciezkaGalezi(slug, galazId, wybrana)} className="przycisk przycisk-glowny !min-h-9">
              Pokaż jako listę
            </Link>
          </div>
        </div>

        <div ref={obszar} className="relative min-h-0 flex-1">
          <h1 className="sr-only">Diagram – {galazAktywna.nazwa}</h1>
          <p className="sr-only" role="status" aria-live="polite">
            Widocznych osób: {widocznychOsob}.
          </p>
          <ReactFlow
            nodes={wezly}
            edges={krawedzie}
            nodeTypes={TYPY_WEZLOW}
            onInit={naStart}
            minZoom={0.05}
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
              nodeColor={(n) => kolory.get(mapaOsob.get(las.jednostki.get(n.id)?.glowna ?? "")?.galazId ?? "") ?? "#64748b"}
              nodeStrokeWidth={0}
              nodeBorderRadius={6}
            />
          </ReactFlow>

          {komunikat && !wybrana && (
            <p role="status" className="panel absolute bottom-3 left-1/2 z-10 flex w-[min(40rem,calc(100%-1.5rem))] sm:w-[min(40rem,calc(100%-18.5rem))] -translate-x-1/2 items-start gap-2 !rounded-xl bg-lita px-3 py-2 text-sm shadow-szklo sm:left-[17rem] sm:translate-x-0">
              <span className="flex-1">{komunikat}</span>
              <button type="button" onClick={() => setKomunikat(null)} aria-label="Ukryj podpowiedź" className="-my-1 -mr-1 size-8 shrink-0 rounded-lg text-lg leading-none text-tekst-2 hover:bg-najazd">
                <span aria-hidden="true">×</span>
              </button>
            </p>
          )}

          {wybrana && mapaOsob.has(wybrana) && <PanelOsoby slug={slug} osoba={mapaOsob.get(wybrana)!} osoby={mapaOsob} pary={pary} galezie={galezie} widok="diagram" api={api} naDodane={setOczekujaca} naWybor={pokazOsobe} naZamkniecie={zamknijPanel} />}
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
    return <p className="absolute inset-0 flex items-center justify-center text-tekst-2">Rozkładanie drzewa…</p>;
  }
  return (
    <ReactFlowProvider>
      {/* key: przejście między gałęziami zaczyna od domyślnego stanu rozwinięcia */}
      <Plotno key={props.galazId} {...props} />
    </ReactFlowProvider>
  );
}
