import Link from "next/link";
import type { OsobaWidoczna } from "@/lib/dane";
import { lataZycia, pelneImie } from "@/lib/format";
import { sciezkaOsoby } from "@/lib/sciezki";

/** Karta osoby z linkiem do jej widoku. Pasek z lewej ma kolor gałęzi (bez rozmycia tła – kart jest dużo). */
export function KartaOsoby({ slug, osoba, kolor, galaz, podpis, mala = false }: { slug: string; osoba: OsobaWidoczna; kolor: string; galaz: string; podpis?: string; mala?: boolean }) {
  const lata = lataZycia(osoba);
  return (
    <Link
      href={sciezkaOsoby(slug, osoba.id)}
      className={`panel group block border-l-4 text-left transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-najazd ${mala ? "px-3 py-1.5" : "px-3.5 py-2.5"}`}
      style={{ borderLeftColor: kolor }}
    >
      {podpis && <span className="block text-xs uppercase tracking-wider text-tekst-2">{podpis}</span>}
      <span className={`block font-semibold leading-tight group-hover:underline ${mala ? "text-[15px]" : "text-lg"}`}>
        {pelneImie(osoba)}
        {osoba.niepewne?.includes("wpis") && <span title="Wpis niepewny w źródle"> (?)</span>}
      </span>
      {osoba.nazwiskoRodowe && <span className="block text-sm text-tekst-2">z d. {osoba.nazwiskoRodowe}</span>}
      {lata && <span className="block text-sm tabular-nums text-tekst-2">{lata}</span>}
      <span className="sr-only">, gałąź: {galaz}</span>
    </Link>
  );
}
