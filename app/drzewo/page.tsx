import type { Metadata } from "next";
import { PlotnoDrzewa } from "@/components/PlotnoDrzewa";
import { daneDrzewa, wczytajDane } from "@/lib/dane";

export function generateMetadata(): Metadata {
  const { statystyki: s } = wczytajDane();
  return {
    title: "Drzewo",
    description: `Interaktywne drzewo genealogiczne: ${s.osob} osób w ${s.pokolen} pokoleniach. Przesuwaj, powiększaj, zwijaj i rozwijaj gałęzie.`,
  };
}

export default function StronaDrzewa() {
  return (
    <main className="relative min-h-[30rem] flex-1">
      <PlotnoDrzewa {...daneDrzewa()} />
    </main>
  );
}
