import type { Metadata } from "next";
import { IndeksOsob, type WierszIndeksu } from "@/components/IndeksOsob";
import { Stopka } from "@/components/Stopka";
import { wczytajDane } from "@/lib/dane";
import { lataZycia, rokZdarzenia, stulecie } from "@/lib/format";

export const metadata: Metadata = {
  title: "Indeks osób",
  description: "Alfabetyczna lista wszystkich osób w drzewie, z filtrami po nazwisku, gałęzi i stuleciu.",
};

export default function StronaIndeksu() {
  const d = wczytajDane();
  const wiersze: WierszIndeksu[] = [...d.osoby.values()].map((o) => {
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
      <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-6">
        <h1 className="text-4xl font-medium">Indeks osób</h1>
        <p className="mt-1 text-sepia">Wszystkie osoby w drzewie, alfabetycznie według nazwiska.</p>
        <IndeksOsob wiersze={wiersze} galezie={d.rodzina.galezie.map((g) => ({ id: g.id, nazwa: g.nazwa, kolor: g.kolor }))} stulecia={stulecia} />
      </main>
      <Stopka zrodlo={d.rodzina.zrodlo} />
    </>
  );
}
