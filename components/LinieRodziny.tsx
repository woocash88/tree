"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Rysunek = { w: number; h: number; sciezki: string[]; kropki: [number, number][] };

const PROMIEN = 22;

/**
 * Linie łączące rodzinę na stronie osoby (tylko szeroki ekran). Układ kart zależy od wysokości list i szerokości
 * okna, więc współrzędne linii są mierzone w przeglądarce, a linie rysowane jako jeden SVG nad siatką:
 *  1. rodzice → osoba: prosta linia w dół,
 *  2. odnoga w lewo (zaokrąglona) do kolumny rodzeństwa,
 *  3. od znaku „+” przy małżonku w dół, łagodnym łukiem do osi osoby i dalej do dzieci.
 * Elementy do zmierzenia oznaczone są atrybutem data-linia: rodzice, osoba, rodzenstwo, plus.
 */
export function LinieRodziny({ children, maDzieci }: { children: React.ReactNode; maDzieci: boolean }) {
  const kontener = useRef<HTMLDivElement>(null);
  const [rysunek, ustawRysunek] = useState<Rysunek | null>(null);

  const przelicz = useCallback(() => {
    const k = kontener.current;
    if (!k || window.innerWidth < 1024) return ustawRysunek(null);
    const baza = k.getBoundingClientRect();
    const znajdz = (nazwa: string) => {
      const el = k.querySelector(`[data-linia="${nazwa}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - baza.left, y: r.top - baza.top, w: r.width, h: r.height, srodekX: r.left - baza.left + r.width / 2, dol: r.bottom - baza.top };
    };
    const rodzice = znajdz("rodzice");
    const osoba = znajdz("osoba");
    const rodzenstwo = znajdz("rodzenstwo");
    const plus = znajdz("plus");
    if (!osoba) return ustawRysunek(null);
    const wysokosc = baza.height;
    const sciezki: string[] = [];
    const kropki: [number, number][] = [];
    const cx = osoba.srodekX;

    if (rodzice) {
      sciezki.push(`M${cx} ${rodzice.dol}V${osoba.y}`);
      kropki.push([cx, osoba.y]);
      if (rodzenstwo) {
        const yOdnogi = rodzice.dol + 26;
        const sx = rodzenstwo.srodekX;
        const koniec = rodzenstwo.y - 8;
        sciezki.push(`M${cx} ${yOdnogi}H${sx + PROMIEN}A${PROMIEN} ${PROMIEN} 0 0 0 ${sx} ${yOdnogi + PROMIEN}V${koniec}`);
        kropki.push([sx, koniec]);
      }
    }

    if (maDzieci) {
      if (plus) {
        // od „+” w dół, łukiem w stronę osi osoby, potem prosto do dzieci
        const px = plus.srodekX;
        const ym = osoba.dol + 52;
        sciezki.push(`M${px} ${plus.dol}V${ym - PROMIEN}A${PROMIEN} ${PROMIEN} 0 0 1 ${px - PROMIEN} ${ym}H${cx + PROMIEN}A${PROMIEN} ${PROMIEN} 0 0 0 ${cx} ${ym + PROMIEN}V${wysokosc}`);
      } else {
        sciezki.push(`M${cx} ${osoba.dol}V${wysokosc}`);
      }
    }
    ustawRysunek({ w: baza.width, h: wysokosc, sciezki, kropki });
  }, [maDzieci]);

  useEffect(() => {
    // pomiar po zamontowaniu, a potem przy każdej zmianie rozmiaru siatki lub okna
    przelicz();
    const k = kontener.current;
    if (!k) return;
    const obs = new ResizeObserver(przelicz);
    obs.observe(k);
    window.addEventListener("resize", przelicz);
    document.fonts?.ready.then(przelicz);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", przelicz);
    };
  }, [przelicz]);

  return (
    <div ref={kontener} className="relative">
      {children}
      {rysunek && (
        <svg aria-hidden="true" width={rysunek.w} height={rysunek.h} className="pointer-events-none absolute left-0 top-0 hidden overflow-visible text-[color:var(--linia)] lg:block" fill="none">
          {rysunek.sciezki.map((d, i) => (
            <path key={i} d={d} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {rysunek.kropki.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4" className="fill-akcent" />
          ))}
        </svg>
      )}
    </div>
  );
}
