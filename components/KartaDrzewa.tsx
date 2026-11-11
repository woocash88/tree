import Link from "next/link";
import type { PodsumowanieDrzewa } from "@/lib/dane";
import { dataPL, ileGalezi, ileOsob, ilePokolen } from "@/lib/format";
import { sciezkaDrzewa } from "@/lib/sciezki";

/** Karta drzewa w siatce: nazwa, opis, zakres lat, liczby, region i data aktualizacji. Cała karta jest klikalna. */
export function KartaDrzewa({ drzewo }: { drzewo: PodsumowanieDrzewa }) {
  const { meta } = drzewo;
  return (
    <article className="szklo group relative flex h-full flex-col p-5 transition-transform duration-200 hover:-translate-y-0.5">
      {meta.przykladowe && <p className="mb-2 w-fit rounded-full border border-kreska bg-najazd px-2.5 py-0.5 text-xs font-semibold text-tekst">Drzewo przykładowe</p>}
      <h3 className="text-xl leading-snug">
        <Link href={sciezkaDrzewa(meta.slug)} className="after:absolute after:inset-0 after:content-[''] group-hover:text-akcent">
          {meta.nazwa}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-tekst-2">{meta.opis}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-tekst-2">Lata</dt>
          <dd className="font-semibold tabular-nums">
            {meta.zakresLat.od}–{meta.zakresLat.do}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-tekst-2">Osoby</dt>
          <dd className="font-semibold tabular-nums">{ileOsob(drzewo.osob)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-tekst-2">Pokolenia</dt>
          <dd className="font-semibold tabular-nums">
            {ilePokolen(drzewo.pokolen)} · {ileGalezi(drzewo.galezi)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-tekst-2">Region</dt>
          <dd className="font-semibold">{meta.region}</dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-kreska pt-3 text-xs text-tekst-2">Zaktualizowano {dataPL(meta.zaktualizowano)}</p>
    </article>
  );
}
