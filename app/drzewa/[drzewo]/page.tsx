import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Stopka } from "@/components/Stopka";
import { Wyszukiwarka } from "@/components/Wyszukiwarka";
import { pobierzDrzewo } from "@/lib/dane";
import { dataPL, ileOsob, ilePokolen, pelneImie } from "@/lib/format";
import { sciezkaDiagramu, sciezkaGalezi, sciezkaIndeksuOsob, sciezkaOsoby } from "@/lib/sciezki";

type Props = { params: Promise<{ drzewo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { drzewo } = await params;
  const d = await pobierzDrzewo(drzewo);
  if (!d) return {};
  const { meta, statystyki: s } = d;
  const opis = `${meta.opis} ${ileOsob(s.osob)}, ${ilePokolen(s.pokolen)}, lata ${meta.zakresLat.od}–${meta.zakresLat.do}.`;
  return { title: meta.nazwa, description: opis, openGraph: { title: meta.nazwa, description: opis } };
}

export default async function StronaDrzewa({ params }: Props) {
  const { drzewo } = await params;
  const d = await pobierzDrzewo(drzewo);
  if (!d) notFound();
  const { meta, statystyki: s } = d;
  const galezie = d.galezieLista.map((g) => ({ id: g.id, nazwa: g.nazwa, kolor: g.kolor }));
  const liczby = [
    { wartosc: s.osob, opis: "osób" },
    { wartosc: s.pokolen, opis: "pokoleń" },
    { wartosc: d.galezieLista.length, opis: d.galezieLista.length === 1 ? "gałąź" : "gałęzi" },
    { wartosc: s.nazwisk, opis: "nazwisk" },
  ];

  return (
    <>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 pt-8">
        <header className="max-w-3xl">
          {meta.przykladowe && (
            <p className="mb-3 w-fit rounded-full border border-kreska bg-najazd px-3 py-1 text-xs font-semibold text-tekst">Drzewo przykładowe – dane są fikcyjne</p>
          )}
          <h1 className="text-4xl sm:text-5xl">{meta.nazwa}</h1>
          <p className="mt-3 text-lg text-tekst-2">{meta.opis}</p>
          <p className="mt-2 text-sm text-tekst-2">
            {meta.zakresLat.od}–{meta.zakresLat.do} · {meta.region}
          </p>
        </header>

        <div className="mt-6 max-w-2xl">
          <Wyszukiwarka slug={meta.slug} galezie={galezie} duza />
          <p className="mt-2 text-sm text-tekst-2">Wpisz np. imię, nazwisko lub rok urodzenia – polskie znaki nie są wymagane.</p>
        </div>

        <section aria-label="Statystyki" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {liczby.map((l) => (
            <div key={l.opis} className="panel px-4 py-3">
              <div className="text-3xl font-bold tabular-nums">{l.wartosc}</div>
              <div className="text-sm text-tekst-2">{l.opis}</div>
            </div>
          ))}
        </section>
        {s.najstarszy && (
          <p className="mt-3 text-sm text-tekst-2">
            Najstarszy wpis:{" "}
            <Link href={sciezkaOsoby(meta.slug, s.najstarszy.osoba.id)} className="link">
              {pelneImie(s.najstarszy.osoba)}
            </Link>{" "}
            ({s.najstarszy.osoba.urodzenie.dokladnosc === "okolo" ? "ok. " : ""}
            {s.najstarszy.rok}).
          </p>
        )}

        <section aria-labelledby="galezie" className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="galezie" className="text-2xl">
              Gałęzie
            </h2>
            <Link href={sciezkaIndeksuOsob(meta.slug)} className="link text-sm">
              Indeks wszystkich osób →
            </Link>
          </div>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {d.statystykiGalezi.map(({ galaz, osob, od, do: doRoku }) => (
              <li key={galaz.id} className="szklo flex flex-col p-4" style={{ borderTop: `4px solid ${galaz.kolor}` }}>
                <h3 className="text-lg leading-tight">
                  <span className="znacznik" style={{ ["--kolor" as string]: galaz.kolor }}>
                    {galaz.nazwa}
                  </span>
                </h3>
                <p className="mt-1 text-sm tabular-nums text-tekst-2">
                  {od && doRoku ? `${od}–${doRoku} · ` : ""}
                  {ileOsob(osob)}
                </p>
                {galaz.opis && <p className="mt-2 flex-1 text-[15px] leading-snug">{galaz.opis}</p>}
                <p className="mt-3 flex flex-wrap gap-2">
                  <Link href={sciezkaGalezi(meta.slug, galaz.id)} className="przycisk przycisk-glowny">
                    Lista<span className="sr-only"> gałęzi: {galaz.nazwa}</span>
                  </Link>
                  <Link href={sciezkaDiagramu(meta.slug, galaz.id)} className="przycisk">
                    Diagram<span className="sr-only"> gałęzi: {galaz.nazwa}</span>
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="zrodlo" className="panel mt-10 max-w-3xl p-5">
          <h2 id="zrodlo" className="text-lg">
            Źródło danych i opiekun
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
            <dt className="text-tekst-2">Źródło</dt>
            <dd>
              <a href={meta.zrodlo.url} className="link" rel="noreferrer">
                {meta.zrodlo.nazwa}
              </a>
            </dd>
            <dt className="text-tekst-2">Opiekun</dt>
            <dd>
              {meta.autor.url ? (
                <a href={meta.autor.url} className="link" rel="noreferrer">
                  {meta.autor.nazwa}
                </a>
              ) : (
                meta.autor.nazwa
              )}
            </dd>
            <dt className="text-tekst-2">Aktualizacja</dt>
            <dd>{dataPL(meta.zaktualizowano)}</dd>
            <dt className="text-tekst-2">Osoby żyjące</dt>
            <dd>{{ ukryj: "daty i miejsca ukryte", "tylko-rok": "tylko rok urodzenia", pokaz: "dane pokazane" }[meta.politykaDatZyjacych]}</dd>
          </dl>
        </section>
      </main>
      <Stopka drzewo={meta} />
    </>
  );
}
