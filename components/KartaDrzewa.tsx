import Link from "next/link";
import type { PodsumowanieDrzewa } from "@/lib/dane";
import { dataPL, ileGalezi, ileOsob, ilePokolen, rozdzielOpis } from "@/lib/format";
import { sciezkaDrzewa } from "@/lib/sciezki";

/** Karta drzewa w siatce: nazwa, opis, zakres lat, liczby, region i data aktualizacji. Cała karta jest klikalna. */
export function KartaDrzewa({ drzewo, pasujaceNazwiska = [] }: { drzewo: PodsumowanieDrzewa; pasujaceNazwiska?: string[] }) {
  const { meta } = drzewo;
  return (
    <article className="szklo group relative flex h-full flex-col p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <p className="mb-2 flex flex-wrap gap-1.5 text-xs font-semibold">
        <span className="w-fit rounded-full border border-kreska bg-najazd px-2.5 py-0.5 text-tekst">{meta.widocznosc === "prywatne" ? "Prywatne" : "Publiczne"}</span>
        {meta.przykladowe && <span className="w-fit rounded-full border border-kreska bg-najazd px-2.5 py-0.5 text-tekst">Drzewo przykładowe</span>}
      </p>
      <h3 className="text-xl leading-snug">
        <Link href={sciezkaDrzewa(meta.slug)} className="after:absolute after:inset-0 after:content-[''] group-hover:text-akcent">
          {meta.nazwa}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-tekst-2">{rozdzielOpis(meta.opis).opis}</p>
      {pasujaceNazwiska.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="text-tekst-2">Nazwisko w drzewie: </span>
          <strong>{pasujaceNazwiska.join(", ")}</strong>
        </p>
      )}
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
        {meta.region && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-tekst-2">Region</dt>
            <dd className="font-semibold">{meta.region}</dd>
          </div>
        )}
      </dl>
      <p className="mt-4 border-t border-kreska pt-3 text-xs text-tekst-2">Zaktualizowano {dataPL(meta.zaktualizowano)}</p>
    </article>
  );
}
