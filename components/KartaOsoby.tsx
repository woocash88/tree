import Link from "next/link";
import { lataZycia, pelneImie } from "@/lib/format";
import type { Osoba } from "@/lib/schemat";
import { sciezkaOsoby } from "@/lib/sciezki";

/** Karta-etykieta osoby z linkiem do jej widoku. Pasek z lewej ma kolor gałęzi. */
export function KartaOsoby({ osoba, kolor, podpis, mala = false }: { osoba: Osoba; kolor: string; podpis?: string; mala?: boolean }) {
  const lata = lataZycia(osoba);
  return (
    <Link
      href={sciezkaOsoby(osoba.id)}
      className={`etykieta group block border-l-4 text-left transition-colors hover:bg-white ${mala ? "px-3 py-1.5" : "px-3.5 py-2.5"}`}
      style={{ borderLeftColor: kolor }}
    >
      {podpis && <span className="block text-xs uppercase tracking-wider text-sepia">{podpis}</span>}
      <span className={`szeryf block leading-tight text-atrament group-hover:underline ${mala ? "text-base" : "text-lg"}`}>
        {pelneImie(osoba)}
        {osoba.niepewne?.includes("wpis") && <span title="Wpis niepewny w źródle"> (?)</span>}
      </span>
      {osoba.nazwiskoRodowe && <span className="block text-sm text-sepia">z d. {osoba.nazwiskoRodowe}</span>}
      {lata && <span className="block text-sm tabular-nums text-sepia">{lata}</span>}
    </Link>
  );
}
