import Link from "next/link";
import { Ornament } from "@/components/Ornament";
import { Stopka } from "@/components/Stopka";
import { Wyszukiwarka } from "@/components/Wyszukiwarka";
import { wczytajDane } from "@/lib/dane";
import { pelneImie } from "@/lib/format";
import { sciezkaDrzewa, sciezkaOsoby } from "@/lib/sciezki";

export default function StronaGlowna() {
  const d = wczytajDane();
  const s = d.statystyki;
  const galezie = d.rodzina.galezie.map((g) => ({ id: g.id, nazwa: g.nazwa, kolor: g.kolor }));
  const korzen = d.osoby.get(d.korzenId)!;
  const liczby = [
    { wartosc: s.osob, opis: "osób" },
    { wartosc: s.pokolen, opis: "pokoleń" },
    { wartosc: s.nazwisk, opis: "nazwisk" },
    ...(s.najstarszy ? [{ wartosc: `${s.najstarszy.osoba.urodzenie.dokladnosc === "okolo" ? "ok. " : ""}${s.najstarszy.rok}`, opis: `najstarszy wpis: ${pelneImie(s.najstarszy.osoba)}`, href: sciezkaOsoby(s.najstarszy.osoba.id) }] : []),
  ];

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 pb-8">
        <section className="mx-auto max-w-3xl pb-10 pt-10 text-center sm:pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sepia">Księga rodowa{s.od && s.do ? ` · ${s.od}–${s.do}` : ""}</p>
          <h1 className="mt-3 text-5xl font-medium leading-[1.05] sm:text-6xl">{d.rodzina.tytul}</h1>
          <Ornament className="mx-auto mt-5" />
          {d.rodzina.opis && <p className="szeryf mx-auto mt-4 max-w-xl text-xl text-sepia">{d.rodzina.opis}</p>}

          <div className="mx-auto mt-8 max-w-2xl">
            <Wyszukiwarka galezie={galezie} duza />
            <p className="mt-2 text-sm text-sepia">Wpisz np. „lukasz”, „Rybacka” albo „1924” – polskie znaki nie są wymagane.</p>
          </div>

          {/* Na telefonie pierwszy jest widok osoby, na większym ekranie – całe drzewo. */}
          <div className="mt-7 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            <Link href={sciezkaOsoby(korzen.id)} className="rounded-sm border border-bordo bg-bordo px-5 py-2.5 font-semibold text-white hover:bg-[#641c28] sm:order-2 sm:border-kreska sm:bg-papier-jasny sm:font-normal sm:text-atrament sm:hover:bg-white">
              Zacznij od przodka: {pelneImie(korzen)}
            </Link>
            <Link href={sciezkaDrzewa()} className="rounded-sm border border-kreska bg-papier-jasny px-5 py-2.5 text-atrament hover:bg-white sm:order-1 sm:border-bordo sm:bg-bordo sm:font-semibold sm:text-white sm:hover:bg-[#641c28]">
              Otwórz całe drzewo
            </Link>
            <Link href="/osoby/" className="rounded-sm border border-kreska bg-papier-jasny px-5 py-2.5 text-atrament hover:bg-white sm:order-3">
              Indeks osób
            </Link>
          </div>
        </section>

        <section aria-label="Statystyki" className="etykieta mx-auto grid max-w-4xl grid-cols-2 divide-kreska/40 px-2 py-4 text-center sm:grid-cols-4 sm:divide-x">
          {liczby.map((l) => (
            <div key={l.opis} className="relative z-10 px-3 py-2">
              <div className="szeryf text-4xl tabular-nums text-atrament">{l.wartosc}</div>
              <div className="mt-0.5 text-sm text-sepia">
                {"href" in l && l.href ? (
                  <Link href={l.href} className="link">
                    {l.opis}
                  </Link>
                ) : (
                  l.opis
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-12" aria-labelledby="galezie">
          <h2 id="galezie" className="text-center text-3xl font-medium">
            Gałęzie rodu
          </h2>
          <Ornament className="mx-auto mt-2" />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {d.statystykiGalezi.map(({ galaz, osob, od, do: doRoku, zalozycielId }) => (
              <li key={galaz.id} className="etykieta flex flex-col border-t-4" style={{ borderTopColor: galaz.kolor }}>
                <div className="relative z-10 flex flex-1 flex-col px-4 pb-4 pt-3">
                  <h3 className="text-2xl font-medium leading-tight">
                    <span aria-hidden="true" className="mr-2 inline-block size-3 rounded-full align-baseline" style={{ backgroundColor: galaz.kolor }} />
                    {galaz.nazwa}
                  </h3>
                  <p className="mt-1 text-[15px] tabular-nums text-sepia">
                    {od && doRoku ? `${od}–${doRoku}` : "brak dat"} · {osob} {osob === 1 ? "osoba" : osob % 10 >= 2 && osob % 10 <= 4 && (osob % 100 < 12 || osob % 100 > 14) ? "osoby" : "osób"}
                  </p>
                  <p className="mt-2 flex-1 text-[15px] leading-snug text-atrament">{galaz.opis}</p>
                  <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
                    <Link href={sciezkaDrzewa(galaz.id)} className="link">
                      Drzewo gałęzi<span className="sr-only">: {galaz.nazwa}</span>
                    </Link>
                    {zalozycielId && (
                      <Link href={sciezkaOsoby(zalozycielId)} className="link">
                        Widok osoby<span className="sr-only">: {pelneImie(d.osoby.get(zalozycielId)!)}</span>
                      </Link>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Stopka zrodlo={d.rodzina.zrodlo} />
    </>
  );
}
