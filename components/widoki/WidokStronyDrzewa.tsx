import Link from "next/link";
import { IdDrzewa } from "@/components/IdDrzewa";
import { Wyszukiwarka } from "@/components/Wyszukiwarka";
import type { Drzewo } from "@/lib/dane-czyste";
import { dataPL, ileOsob, pelneImie, rozdzielOpis } from "@/lib/format";
import { sciezkaDiagramu, sciezkaGalezi, sciezkaIndeksuDrzew, sciezkaIndeksuOsob, sciezkaOsoby } from "@/lib/sciezki";

const POLITYKI = { ukryj: "Daty osób żyjących są ukryte.", "tylko-rok": "Dla osób żyjących pokazujemy tylko rok urodzenia.", pokaz: "Dane osób żyjących są pokazane." } as const;

/** Opis zakresu lat gałęzi w wierszu listy: „od ok. 1807”, „od 1820” albo „1780–1850”. */
function lataGalezi(od: number | null, doRoku: number | null): string {
  if (od === null) return "";
  return doRoku !== null && doRoku !== od ? `${od}–${doRoku}` : `od ${od}`;
}

/**
 * Strona główna drzewa (styl miękki, wzór C): wyszukiwarka osób, karta z opisem, liczbami i podziałem na gałęzie,
 * lista gałęzi oraz ramka ze źródłem i opiekunem. Wspólna dla drzew z repozytorium i z bazy; oprawę (nagłówek, stopka) dodaje wywołujący.
 */
export function WidokStronyDrzewa({ d, numer }: { d: Drzewo; numer?: string }) {
  const { meta, statystyki: s } = d;
  const galezie = d.galezieLista.map((g) => ({ id: g.id, nazwa: g.nazwa, kolor: g.kolor }));
  const lista = d.statystykiGalezi.filter((x) => !x.galaz.wspolna);
  // Zdanie o źródle z opisu przenosimy do ramki na dole strony.
  const { opis, zrodlo: zrodloZOpisu } = rozdzielOpis(meta.opis);
  const zrodlo = meta.zrodlo ?? zrodloZOpisu;
  const lata = `${meta.zakresLat.od}–${meta.zakresLat.do}`;

  return (
    <main id="tresc" className="mx-auto w-full max-w-[1160px] flex-1 px-4 pb-14 pt-[clamp(24px,4vw,40px)] sm:px-8">
      <Link href={sciezkaIndeksuDrzew()} className="g-link g-t2 -ml-3 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        Przegląd drzew
      </Link>

      <div className="mt-3">
        <Wyszukiwarka slug={meta.slug} galezie={galezie} duza />
      </div>

      <article className="g-szklo mt-7 grid gap-8 rounded-[32px] p-6 sm:p-8 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
        <div className="flex flex-col gap-6">
          <div>
            {meta.przykladowe && <p className="g-tag g-akcent mb-3 w-fit rounded-full px-3 py-1 text-xs font-semibold">Drzewo przykładowe – dane są fikcyjne</p>}
            {meta.region && <div className="g-t3 text-xs font-semibold uppercase tracking-[0.08em]">{meta.region}</div>}
            <h1 className="g-display mt-2 text-[clamp(28px,3.4vw,36px)] font-bold leading-[1.1] tracking-[-0.03em]">{meta.nazwa}</h1>
            <IdDrzewa numer={numer} className="mt-3" />
            {opis && <p className="g-t2 mt-3 text-base leading-relaxed">{opis}</p>}
            {s.najstarszy && (
              <p className="g-t3 mt-2 text-sm">
                Najstarszy wpis:{" "}
                <Link href={sciezkaOsoby(meta.slug, s.najstarszy.osoba.id)} className="g-akcent font-semibold underline-offset-2 hover:underline">
                  {pelneImie(s.najstarszy.osoba)}
                </Link>{" "}
                ({s.najstarszy.osoba.urodzenie.dokladnosc === "okolo" ? "ok. " : ""}
                {s.najstarszy.rok}).
              </p>
            )}
          </div>

          <section aria-label="Statystyki" className="flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <div className="text-[28px] font-bold tracking-[-0.03em] tabular-nums">{s.osob}</div>
              <div className="g-t3 text-[13px]">osób</div>
            </div>
            <div>
              <div className="text-[28px] font-bold tracking-[-0.03em] tabular-nums">{s.pokolen}</div>
              <div className="g-t3 text-[13px]">pokoleń</div>
            </div>
            <div>
              <div className="text-[28px] font-bold tracking-[-0.03em] tabular-nums">{lata}</div>
              <div className="g-t3 text-[13px]">lata</div>
            </div>
          </section>

          {lista.length > 0 && (
            <div>
              <div
                role="img"
                aria-label={`Podział osób na ${lista.length} ${lista.length === 1 ? "gałąź" : "gałęzie"}: ${lista.map((x) => `${x.galaz.nazwa} ${x.osob}`).join(", ")}`}
                className="flex h-3 gap-[3px]"
              >
                {lista.map((x) => (
                  <span key={x.galaz.id} className="min-w-1 rounded-full" style={{ flex: `${x.osob} 1 0`, background: x.galaz.kolor }} />
                ))}
              </div>
              <div className="g-t3 mt-2.5 text-[13px]">{lista.length === 1 ? "1 gałąź" : `${lista.length} gałęzi`}</div>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-3">
            <Link href={sciezkaGalezi(meta.slug, "cale")} className="g-przycisk flex min-h-14 items-center justify-between rounded-full px-6 text-base">
              Otwórz całe drzewo
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
              <Link href={sciezkaDiagramu(meta.slug, "cale")} className="g-akcent inline-flex min-h-11 items-center underline-offset-2 hover:underline">
                Diagram całego drzewa
              </Link>
              <Link href={sciezkaIndeksuOsob(meta.slug)} className="g-akcent inline-flex min-h-11 items-center underline-offset-2 hover:underline">
                Indeks wszystkich osób
              </Link>
            </div>
          </div>
        </div>

        <div className="g-panel rounded-3xl p-[18px]">
          <div id="galezie" className="g-t3 flex items-center justify-between gap-3 px-3.5 pb-3 pt-0.5 text-xs font-semibold uppercase tracking-[0.06em]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.06em]">Gałęzie</h2>
            <span>Osób</span>
          </div>
          <ul aria-labelledby="galezie">
            {lista.map(({ galaz, osob, od, do: doRoku }) => (
              <li key={galaz.id}>
                <Link href={sciezkaGalezi(meta.slug, galaz.id)} className="g-wiersz grid min-h-[54px] grid-cols-[12px_1fr_auto_16px] items-center gap-3.5 rounded-2xl px-3.5">
                  <span aria-hidden="true" className="size-3 rounded-full" style={{ background: galaz.kolor }} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15.5px] font-semibold leading-snug">{galaz.nazwa}</span>
                    {lataGalezi(od, doRoku) && <span className="g-t3 block text-[13px] leading-snug">{lataGalezi(od, doRoku)}</span>}
                  </span>
                  <span className="rounded-full px-2.5 py-0.5 text-[13px] font-semibold tabular-nums" style={{ background: "var(--g-szklo)" }} aria-label={ileOsob(osob)}>
                    {osob}
                  </span>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--g-akcent-tekst)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              </li>
            ))}
            {lista.length === 0 && <li className="g-t2 px-3.5 py-3 text-sm">To drzewo nie ma jeszcze gałęzi z osobami.</li>}
          </ul>
        </div>
      </article>

      <aside aria-label="Źródło danych i opiekun" className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl px-7 py-5" style={{ background: "color-mix(in srgb, var(--g-szklo) 60%, transparent)" }}>
        <div aria-hidden="true" className="g-chip flex size-11 flex-none items-center justify-center rounded-2xl">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--g-akcent-tekst)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
            <path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20" />
          </svg>
        </div>
        <div className="min-w-0 flex-[1_1_320px]">
          <div className="g-t3 text-xs font-semibold uppercase tracking-[0.08em]">Źródło danych i opiekun</div>
          <div className="mt-0.5 break-words text-[15px]">
            {zrodlo && (
              <>
                {zrodlo.url ? (
                  <a href={zrodlo.url} className="g-akcent font-semibold underline-offset-2 hover:underline" rel="noreferrer">
                    {zrodlo.nazwa}
                  </a>
                ) : (
                  zrodlo.nazwa
                )}
                {" · "}
              </>
            )}
            Opiekun:{" "}
            {meta.autor.url ? (
              <a href={meta.autor.url} className="g-akcent font-semibold underline-offset-2 hover:underline" rel="noreferrer">
                {meta.autor.nazwa}
              </a>
            ) : (
              meta.autor.nazwa
            )}
            {" · "}aktualizacja {dataPL(meta.zaktualizowano)}
          </div>
        </div>
        <div className="g-t2 text-sm">{POLITYKI[meta.politykaDatZyjacych]}</div>
      </aside>
    </main>
  );
}
