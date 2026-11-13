import Link from "next/link";
import { Naglowek } from "@/components/Naglowek";
import { OstatnioDodaneDrzewa } from "@/components/OstatnioDodaneDrzewa";
import { HeroKonta } from "@/components/konta/HeroKonta";
import { Stopka } from "@/components/Stopka";
import { SzukajDrzew } from "@/components/SzukajDrzew";
import { pobierzDrzewa } from "@/lib/dane";
import { sciezkaIndeksuDrzew } from "@/lib/sciezki";

export default async function StronaGlowna() {
  const drzewa = await pobierzDrzewa();

  return (
    <>
      <Naglowek />
      <main id="tresc" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8">
        <section className="mx-auto max-w-3xl pb-10 pt-12 text-center sm:pt-20">
          <p className="mx-auto w-fit rounded-full border border-kreska bg-najazd px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-tekst">Drzewa genealogiczne rodzin</p>
          <h1 className="mt-5 text-5xl leading-[1.05] sm:text-7xl">Przodkowie</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-tekst-2">
            Przeglądaj pokolenia, szukaj przodków po nazwisku i roku, schodź po gałęziach rodu – na komputerze i na telefonie.
          </p>
          <HeroKonta />
          <div className="mt-8">
            <SzukajDrzew drzewa={drzewa} />
          </div>
          <p className="mt-6">
            <Link href={sciezkaIndeksuDrzew()} className="przycisk przycisk-glowny !min-h-11 !px-5">
              Przeglądaj publiczne drzewa
            </Link>
          </p>
        </section>

        <OstatnioDodaneDrzewa zRepozytorium={drzewa} />
      </main>
      <Stopka />
    </>
  );
}
