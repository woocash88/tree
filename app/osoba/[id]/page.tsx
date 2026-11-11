import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KartaOsoby } from "@/components/KartaOsoby";
import { Stopka } from "@/components/Stopka";
import { czyZmarla, opisZdarzenia, sciezkaPochodzenia, wczytajDane } from "@/lib/dane";
import { lataZycia, pelneImie, wiek } from "@/lib/format";
import type { Osoba } from "@/lib/schemat";
import { sciezkaDrzewa, sciezkaOsoby } from "@/lib/sciezki";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return [...wczytajDane().osoby.keys()].map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = wczytajDane();
  const o = d.osoby.get(id);
  if (!o) return {};
  const lata = lataZycia(o);
  const galaz = d.galezie.get(o.galazId)!;
  const tytul = `${pelneImie(o)}${lata ? ` (${lata})` : ""}`;
  const rodzice = [o.ojciecId, o.matkaId].filter((r): r is string => !!r).map((r) => pelneImie(d.osoby.get(r)!));
  const opis = [
    `${pelneImie(o)}${lata ? `, ${lata}` : ""} – ${galaz.nazwa.toLowerCase()}, pokolenie ${d.pokolenie.get(o.id)}.`,
    rodzice.length ? `Rodzice: ${rodzice.join(" i ")}.` : "",
  ].filter(Boolean).join(" ");
  return { title: tytul, description: opis, openGraph: { title: tytul, description: opis } };
}

const NIEPEWNE: Record<string, string> = {
  imie: "imię nieznane",
  nazwisko: "nazwisko nieznane",
  wpis: "wpis niepewny",
  miejsce: "miejsce niepewne",
  rodzice: "rodzice niepewni",
  plec: "płeć przyjęta z kontekstu",
};

function Poziom({ tytul, children, className = "" }: { tytul: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-sepia">{tytul}</h2>
      {children}
    </section>
  );
}

function Lacznik() {
  return <div aria-hidden="true" className="mx-auto h-6 w-px bg-kreska" />;
}

function Nieznany({ kto }: { kto: string }) {
  return <div className="flex min-h-16 items-center justify-center border border-dashed border-kreska/70 px-3 py-2 text-sm italic text-sepia">{kto}</div>;
}

export default async function StronaOsoby({ params }: Props) {
  const { id } = await params;
  const d = wczytajDane();
  const o = d.osoby.get(id);
  if (!o) notFound();

  const osoba = (x: string | null) => (x ? d.osoby.get(x) : undefined);
  const kolor = (x: Osoba) => d.galezie.get(x.galazId)!.kolor;
  const galaz = d.galezie.get(o.galazId)!;
  const ojciec = osoba(o.ojciecId);
  const matka = osoba(o.matkaId);
  const dziadkowie = [
    { osoba: osoba(ojciec?.ojciecId ?? null), podpis: "ojciec ojca" },
    { osoba: osoba(ojciec?.matkaId ?? null), podpis: "matka ojca" },
    { osoba: osoba(matka?.ojciecId ?? null), podpis: "ojciec matki" },
    { osoba: osoba(matka?.matkaId ?? null), podpis: "matka matki" },
  ];
  const zwiazki = d.malzonkowie.get(o.id) ?? [];
  const dzieci = d.dzieci.get(o.id) ?? [];
  const rodzenstwo = d.rodzina.osoby
    .filter((x) => x.id !== o.id && ((o.ojciecId && x.ojciecId === o.ojciecId) || (o.matkaId && x.matkaId === o.matkaId)))
    .map((x) => ({ osoba: d.osoby.get(x.id)!, przyrodnie: x.ojciecId !== o.ojciecId || x.matkaId !== o.matkaId }));

  // Dzieci pogrupowane według drugiego rodzica (kolejne małżeństwa osobno).
  const grupyDzieci = new Map<string, Osoba[]>();
  for (const dz of dzieci) {
    const drugi = (dz.ojciecId === o.id ? dz.matkaId : dz.ojciecId) ?? "";
    grupyDzieci.set(drugi, [...(grupyDzieci.get(drugi) ?? []), dz]);
  }

  const sciezka = sciezkaPochodzenia(o.id);
  const lata = lataZycia(o);
  const ileLat = wiek(o);
  const zmarla = czyZmarla(o);
  const koncowka = o.plec === "K" ? "a" : o.plec === "M" ? "y" : "y(-a)";

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-5">
        <nav aria-label="Ścieżka pochodzenia" className="mb-6 text-[15px]">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sepia">
            <li className="mr-1 text-xs font-semibold uppercase tracking-[0.18em]">Pochodzenie:</li>
            {sciezka.map((p, i) => (
              <li key={p.id} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">→</span>}
                {p.id === o.id ? (
                  <span aria-current="page" className="szeryf text-lg font-semibold text-atrament">{p.imie || "NN"}</span>
                ) : (
                  <Link href={sciezkaOsoby(p.id)} className="link szeryf text-lg" title={pelneImie(p)}>
                    {p.imie || "NN"}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {dziadkowie.some((x) => x.osoba) && (
          <>
            <Poziom tytul="Dziadkowie">
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {dziadkowie.map((x) =>
                  x.osoba ? <KartaOsoby key={x.podpis} osoba={x.osoba} kolor={kolor(x.osoba)} podpis={x.podpis} mala /> : <Nieznany key={x.podpis} kto={`${x.podpis} – brak danych`} />,
                )}
              </div>
            </Poziom>
            <Lacznik />
          </>
        )}

        {(ojciec || matka) && (
          <>
            <Poziom tytul="Rodzice">
              <div className="mx-auto grid max-w-2xl grid-cols-2 gap-2">
                {ojciec ? <KartaOsoby osoba={ojciec} kolor={kolor(ojciec)} podpis="ojciec" /> : <Nieznany kto="ojciec – brak danych" />}
                {matka ? <KartaOsoby osoba={matka} kolor={kolor(matka)} podpis="matka" /> : <Nieznany kto="matka – brak danych" />}
              </div>
              {o.niepewne?.includes("rodzice") && <p className="mt-1 text-center text-sm italic text-sepia">Przypisanie rodziców jest w źródle niejednoznaczne.</p>}
            </Poziom>
            <Lacznik />
          </>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(22rem,1.25fr)_1fr] lg:items-start">
          <article className="etykieta border-t-4 px-6 py-6 text-center lg:order-2" style={{ borderTopColor: galaz.kolor }}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sepia">
              Pokolenie {d.pokolenie.get(o.id)} ·{" "}
              <Link href={sciezkaDrzewa(galaz.id)} className="link">
                {galaz.nazwa}
              </Link>
            </p>
            <h1 className="mt-2 text-4xl font-medium leading-tight sm:text-5xl">{pelneImie(o)}</h1>
            {o.nazwiskoRodowe && <p className="szeryf mt-1 text-xl italic text-sepia">z domu {o.nazwiskoRodowe}</p>}
            {lata && <p className="szeryf mt-2 text-2xl tabular-nums text-sepia">{lata}</p>}

            {o.ukryjDaty ? (
              <p className="mt-4 text-sm italic text-sepia">Daty i miejsca osób żyjących nie są publikowane.</p>
            ) : (
              <dl className="mx-auto mt-5 grid max-w-sm grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-left text-[15px]">
                {o.urodzenie.wartosc || o.urodzenie.miejsce ? (
                  <>
                    <dt className="text-sepia">Urodzenie</dt>
                    <dd>{opisZdarzenia(o.urodzenie)}</dd>
                  </>
                ) : null}
                {o.smierc && (
                  <>
                    <dt className="text-sepia">
                      <span aria-hidden="true">† </span>Śmierć
                    </dt>
                    <dd>{opisZdarzenia(o.smierc) || "data nieznana"}</dd>
                  </>
                )}
                {ileLat && (
                  <>
                    <dt className="text-sepia">Wiek</dt>
                    <dd>{ileLat}</dd>
                  </>
                )}
                {o.miejsce && (
                  <>
                    <dt className="text-sepia">Miejsce</dt>
                    <dd>{o.miejsce}</dd>
                  </>
                )}
                {!o.smierc && zmarla && (
                  <>
                    <dt className="text-sepia">Śmierć</dt>
                    <dd className="italic text-sepia">brak danych w źródle</dd>
                  </>
                )}
              </dl>
            )}

            {o.notatka && !o.ukryjDaty && <p className="szeryf mx-auto mt-4 max-w-sm border-t border-kreska/50 pt-3 text-lg italic text-atrament">{o.notatka}</p>}
            {!!o.niepewne?.length && (
              <p className="mt-3 text-sm text-sepia">W źródle: {o.niepewne.map((n) => NIEPEWNE[n]).join(", ")}.</p>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href={sciezkaDrzewa(null, o.id)} className="rounded-sm border border-bordo bg-bordo px-4 py-2 text-[15px] font-semibold text-white hover:bg-[#641c28]">
                Pokaż w drzewie
              </Link>
              <Link href={sciezkaDrzewa(galaz.id, o.id)} className="rounded-sm border border-kreska bg-papier-jasny px-4 py-2 text-[15px] text-atrament hover:bg-white">
                Pokaż w gałęzi
              </Link>
            </div>
          </article>

          <Poziom tytul={zwiazki.length > 1 ? "Małżonkowie" : "Małżonek"} className="lg:order-3">
            {zwiazki.length ? (
              <ul className="grid gap-2">
                {zwiazki.map((z) => (
                  <li key={z.osoba.id}>
                    <KartaOsoby osoba={z.osoba} kolor={kolor(z.osoba)} podpis={zwiazki.length > 1 ? `związek ${z.kolejnosc}` : z.osoba.plec === "K" ? "żona" : z.osoba.plec === "M" ? "mąż" : "małżonek"} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm italic text-sepia">Brak danych o małżeństwie.</p>
            )}
          </Poziom>

          <Poziom tytul={`Rodzeństwo${rodzenstwo.length ? ` (${rodzenstwo.length})` : ""}`} className="lg:order-1">
            {rodzenstwo.length ? (
              <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                {rodzenstwo.map((r) => (
                  <li key={r.osoba.id}>
                    <KartaOsoby osoba={r.osoba} kolor={kolor(r.osoba)} podpis={r.przyrodnie ? "rodzeństwo przyrodnie" : undefined} mala />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm italic text-sepia">Brak danych o rodzeństwie.</p>
            )}
          </Poziom>
        </div>

        <Lacznik />
        <Poziom tytul={`Dzieci${dzieci.length ? ` (${dzieci.length})` : ""}`}>
          {dzieci.length ? (
            <div className="grid gap-4">
              {[...grupyDzieci.entries()].map(([drugiId, lista]) => {
                const drugi = osoba(drugiId || null);
                return (
                  <div key={drugiId || "brak"}>
                    {(grupyDzieci.size > 1 || zwiazki.length > 1) && (
                      <p className="mb-1.5 text-center text-sm text-sepia">
                        {drugi ? (
                          <>
                            z:{" "}
                            <Link href={sciezkaOsoby(drugi.id)} className="link">
                              {pelneImie(drugi)}
                            </Link>
                          </>
                        ) : (
                          "drugi rodzic nieustalony"
                        )}
                      </p>
                    )}
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {lista.map((dz) => (
                        <li key={dz.id}>
                          <KartaOsoby osoba={dz} kolor={kolor(dz)} mala />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-sm italic text-sepia">
              {zmarla ? `Źródło nie podaje dzieci tej osoby.` : `Brak wpisanych dzieci.`}
            </p>
          )}
        </Poziom>
        <p className="sr-only">Zmarł{koncowka}: {zmarla ? "tak" : "brak danych"}.</p>
      </main>
      <Stopka zrodlo={d.rodzina.zrodlo} />
    </>
  );
}
