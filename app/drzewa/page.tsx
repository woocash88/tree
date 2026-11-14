import type { Metadata } from "next";
import { KatalogDrzew } from "@/components/KatalogDrzew";
import { PowlokaMiekka } from "@/components/glowna/PowlokaMiekka";
import { pobierzDrzewa } from "@/lib/dane";

export const metadata: Metadata = {
  title: "Przegląd drzew",
  description: "Lista drzew genealogicznych w serwisie Przodkowie: alfabetycznie lub według liczby osób, z wyszukiwaniem po nazwisku, nazwie i regionie.",
  openGraph: { title: "Przegląd drzew · Przodkowie", description: "Drzewa genealogiczne w serwisie." },
};

export default async function IndeksDrzew() {
  const drzewa = await pobierzDrzewa();
  return (
    <PowlokaMiekka aktywny="drzewa">
      <main id="tresc" className="mx-auto w-full max-w-[1160px] flex-1 px-4 pb-16 pt-[clamp(24px,4vw,40px)] sm:px-8">
        <h1 className="g-display text-[clamp(30px,4vw,44px)] font-bold leading-[1.1] tracking-[-0.03em]">Przegląd drzew</h1>
        <p className="g-t2 mb-7 mt-3 max-w-2xl text-base leading-relaxed">Wybierz rodzinę, aby przejść do jej drzewa: gałęzi, osób i powiązań. Listę możesz uporządkować alfabetycznie albo według liczby osób.</p>
        <KatalogDrzew drzewa={drzewa} />
      </main>
    </PowlokaMiekka>
  );
}
