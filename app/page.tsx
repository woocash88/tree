import Link from "next/link";
import { KartaDrzewa } from "@/components/KartaDrzewa";
import { Naglowek } from "@/components/Naglowek";
import { Stopka } from "@/components/Stopka";
import { SzukajDrzew } from "@/components/SzukajDrzew";
import { pobierzDrzewa } from "@/lib/dane";
import { sciezkaIndeksuDrzew } from "@/lib/sciezki";

export default async function StronaGlowna() {
  const drzewa = await pobierzDrzewa();
  const wyrozniane = drzewa.filter((d) => d.meta.wyrozniane);
  const polecane = wyrozniane.length ? wyrozniane : drzewa.slice(0, 3);

  return (
    <>
      <Naglowek />
      <main id="tresc" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8">
        <section className="mx-auto max-w-3xl pb-10 pt-12 text-center sm:pt-20">
          <p className="mx-auto w-fit rounded-full border border-kreska bg-najazd px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-tekst">Drzewa genealogiczne rodzin</p>
          <h1 className="mt-5 text-5xl leading-[1.05] sm:text-7xl">Nasi przodkowie</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-tekst-2">
            Przeglądaj pokolenia, szukaj przodków po nazwisku i roku, schodź po gałęziach rodu – na komputerze i na telefonie.
          </p>
          <div className="mt-8">
            <SzukajDrzew drzewa={drzewa} />
          </div>
          <p className="mt-6">
            <Link href={sciezkaIndeksuDrzew()} className="przycisk przycisk-glowny !min-h-11 !px-5">
              Wszystkie drzewa ({drzewa.length})
            </Link>
          </p>
        </section>

        <section aria-labelledby="wyrozniane" className="mt-4">
          <h2 id="wyrozniane" className="text-2xl">
            Wyróżnione drzewa
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {polecane.map((d) => (
              <li key={d.meta.slug}>
                <KartaDrzewa drzewo={d} />
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Stopka />
    </>
  );
}
