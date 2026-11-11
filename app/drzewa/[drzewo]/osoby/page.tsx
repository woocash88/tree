import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndeksOsob, type WierszIndeksu } from "@/components/IndeksOsob";
import { Stopka } from "@/components/Stopka";
import { pobierzDrzewo } from "@/lib/dane";
import { lataZycia, rokZdarzenia, stulecie } from "@/lib/format";

type Props = { params: Promise<{ drzewo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { drzewo } = await params;
  const d = await pobierzDrzewo(drzewo);
  if (!d) return {};
  return {
    title: `Indeks osób – ${d.meta.nazwa}`,
    description: `Alfabetyczna lista ${d.statystyki.osob} osób z drzewa „${d.meta.nazwa}”, z filtrami po nazwisku, gałęzi i stuleciu.`,
  };
}

export default async function StronaIndeksu({ params }: Props) {
  const { drzewo } = await params;
  const d = await pobierzDrzewo(drzewo);
  if (!d) notFound();
  const wiersze: WierszIndeksu[] = d.osobyLista.map((o) => {
    const rok = rokZdarzenia(o.urodzenie) ?? rokZdarzenia(o.smierc);
    return {
      id: o.id,
      imie: o.imie,
      nazwisko: o.nazwisko,
      rodowe: o.nazwiskoRodowe,
      lata: lataZycia(o),
      galazId: o.galazId,
      stulecie: rok !== null ? stulecie(rok).nr : null,
      pokolenie: d.pokolenie.get(o.id)!,
    };
  });
  const stulecia = [...new Set(wiersze.map((w) => w.stulecie).filter((s): s is number => s !== null))]
    .sort((a, b) => a - b)
    .map((nr) => ({ nr, etykieta: stulecie(nr * 100).etykieta }));
  return (
    <>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 pt-8">
        <h1 className="text-4xl">Indeks osób</h1>
        <p className="mt-1 text-tekst-2">{d.meta.nazwa} – wszystkie osoby alfabetycznie według nazwiska.</p>
        <IndeksOsob slug={d.meta.slug} wiersze={wiersze} galezie={d.galezieLista.filter((g) => !g.wspolna).map((g) => ({ id: g.id, nazwa: g.nazwa, kolor: g.kolor }))} stulecia={stulecia} />
      </main>
      <Stopka drzewo={d.meta} />
    </>
  );
}
