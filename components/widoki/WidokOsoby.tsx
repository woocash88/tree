import Link from "next/link";
import { KartaOsoby } from "@/components/KartaOsoby";
import { LinieRodziny } from "@/components/LinieRodziny";
import { czyZmarla, opisZdarzenia, sciezkaPochodzenia, type Drzewo, type OsobaWidoczna } from "@/lib/dane-czyste";
import { lataZycia, pelneImie, wiek } from "@/lib/format";
import { idWidoku } from "@/lib/galezie";
import { sciezkaDiagramu, sciezkaGalezi, sciezkaOsoby } from "@/lib/sciezki";

const NIEPEWNE: Record<string, string> = {
  imie: "imię nieznane",
  nazwisko: "nazwisko nieznane",
  wpis: "wpis niepewny",
  miejsce: "miejsce niepewne",
  rodzice: "rodzice niepewni",
  plec: "płeć przyjęta z kontekstu",
};

function Poziom({ tytul, children, className = "", linia }: { tytul: string; children: React.ReactNode; className?: string; linia?: string }) {
  return (
    <section className={className} data-linia={linia}>
      <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-tekst-2">{tytul}</h2>
      {children}
    </section>
  );
}

function Lacznik() {
  return <div aria-hidden="true" className="mx-auto h-6 w-[2.5px] rounded-full bg-[var(--linia)]" />;
}

/** Treść widoku osoby: wspólna dla stron statycznych drzew z repozytorium i drzew z bazy. Zakłada, że osoba istnieje. */
export function WidokOsoby({ d, id }: { d: Drzewo; id: string }) {
  const o = d.osoby.get(id)!;
  const slug = d.meta.slug;

  const osoba = (x: string | null) => (x ? d.osoby.get(x) : undefined);
  const kolor = (x: OsobaWidoczna) => d.galezie.get(x.galazId)!.kolor;
  const nazwaGalezi = (x: OsobaWidoczna) => d.galezie.get(x.galazId)!.nazwa;
  const karta = (x: OsobaWidoczna, podpis?: string, mala = false, ikona?: string) => <KartaOsoby slug={slug} osoba={x} kolor={kolor(x)} galaz={nazwaGalezi(x)} podpis={podpis} ikona={ikona} mala={mala} />;
  const galaz = d.galezie.get(o.galazId)!;
  const ojciec = osoba(o.ojciecId);
  const matka = osoba(o.matkaId);
  // Puste sekcje (brak dziadków, rodzeństwa, dzieci…) po prostu się nie pojawiają.
  const dziadkowie = [
    { osoba: osoba(ojciec?.ojciecId ?? null), podpis: "ojciec ojca", ikona: "👴" },
    { osoba: osoba(ojciec?.matkaId ?? null), podpis: "matka ojca", ikona: "👵" },
    { osoba: osoba(matka?.ojciecId ?? null), podpis: "ojciec matki", ikona: "👴" },
    { osoba: osoba(matka?.matkaId ?? null), podpis: "matka matki", ikona: "👵" },
  ].filter((x): x is { osoba: OsobaWidoczna; podpis: string; ikona: string } => !!x.osoba);
  const zwiazki = d.malzonkowie.get(o.id) ?? [];
  const dzieci = d.dzieci.get(o.id) ?? [];
  const rodzenstwo = d.osobyLista
    .filter((x) => x.id !== o.id && ((o.ojciecId && x.ojciecId === o.ojciecId) || (o.matkaId && x.matkaId === o.matkaId)))
    .map((x) => ({ osoba: x, przyrodnie: x.ojciecId !== o.ojciecId || x.matkaId !== o.matkaId }));

  // Dzieci pogrupowane według drugiego rodzica (kolejne małżeństwa osobno).
  const grupyDzieci = new Map<string, OsobaWidoczna[]>();
  for (const dz of dzieci) {
    const drugi = (dz.ojciecId === o.id ? dz.matkaId : dz.ojciecId) ?? "";
    grupyDzieci.set(drugi, [...(grupyDzieci.get(drugi) ?? []), dz]);
  }

  const sciezka = sciezkaPochodzenia(d, o.id);
  const lata = lataZycia(o);
  const ileLat = wiek(o);
  const zmarla = czyZmarla(o);
  // Pustą datę śmierci pokazujemy tylko osobom, które według danych nie żyją.
  const smierc = o.smierc ? opisZdarzenia(o.smierc) || "data nieznana" : zmarla ? "data nieznana" : "";

  return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 pt-6">
        {sciezka.length > 1 && (
          <nav aria-label="Ścieżka pochodzenia" className="mb-5 text-sm">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-tekst-2">
              <li className="mr-1 text-xs font-semibold uppercase tracking-[0.16em]">Pochodzenie:</li>
              {sciezka.map((p, i) => (
                <li key={p.id} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true">→</span>}
                  {p.id === o.id ? (
                    <span aria-current="page" className="font-semibold text-tekst">{p.imie || "NN"}</span>
                  ) : (
                    <Link href={sciezkaOsoby(slug, p.id)} className="link" title={pelneImie(p)}>
                      {p.imie || "NN"}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {dziadkowie.length > 0 && (
          <>
            <Poziom tytul="Dziadkowie">
              <ul className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
                {dziadkowie.map((x) => (
                  <li key={x.podpis} className="basis-[calc(50%-0.25rem)] lg:basis-56">{karta(x.osoba, x.podpis, true, x.ikona)}</li>
                ))}
              </ul>
            </Poziom>
            <Lacznik />
          </>
        )}

        <LinieRodziny maDzieci={dzieci.length > 0}>
        {(ojciec || matka) && (
          <>
            <Poziom tytul="Rodzice">
              <ul data-linia="rodzice" className={`mx-auto grid max-w-2xl gap-2 ${ojciec && matka ? "grid-cols-2" : "max-w-xs grid-cols-1"}`}>
                {ojciec && <li>{karta(ojciec, "ojciec", false, "👨")}</li>}
                {matka && <li>{karta(matka, "matka", false, "👩")}</li>}
              </ul>
              {o.niepewne?.includes("rodzice") && <p className="mt-1 text-center text-sm text-tekst-2">Przypisanie rodziców jest w źródle niejednoznaczne.</p>}
            </Poziom>
            {/* na szerokim ekranie miejsce na linie rysowane przez LinieRodziny; na wąskim – prosta kreska */}
            <div className="lg:hidden">
              <Lacznik />
            </div>
            <div aria-hidden="true" className="hidden h-16 lg:block" />
          </>
        )}

        <div className={`grid gap-6 lg:grid-cols-[1fr_minmax(20rem,1fr)_1fr] lg:items-start ${dzieci.length > 0 ? "lg:pb-16" : ""}`}>
          <article data-linia="osoba" className="szklo px-5 py-4 text-center lg:col-start-2 lg:row-start-1" style={{ borderTop: `4px solid ${galaz.kolor}` }}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-tekst-2">
              Pokolenie {d.pokolenie.get(o.id)} ·{" "}
              <Link href={sciezkaGalezi(slug, idWidoku(galaz), o.id)} className="link">
                {galaz.wspolna ? "Całe drzewo" : galaz.nazwa}
              </Link>
            </p>
            <h1 className="mt-1.5 text-2xl leading-tight sm:text-3xl">{pelneImie(o)}</h1>
            {o.nazwiskoRodowe && <p className="mt-1 text-lg text-tekst-2">z domu {o.nazwiskoRodowe}</p>}
            {lata && <p className="mt-1 text-lg font-medium tabular-nums text-tekst-2">{lata}</p>}

            {o.ukryjDaty ? (
              <p className="mt-4 text-sm text-tekst-2">Daty i miejsca osób żyjących nie są publikowane.</p>
            ) : (
              (opisZdarzenia(o.urodzenie) || smierc || ileLat || o.miejsce) && (
                <dl className="mx-auto mt-3 grid max-w-xs grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-left text-[15px]">
                  {opisZdarzenia(o.urodzenie) && (
                    <>
                      <dt className="text-tekst-2">Urodzenie</dt>
                      <dd>{opisZdarzenia(o.urodzenie)}</dd>
                    </>
                  )}
                  {smierc && (
                    <>
                      <dt className="text-tekst-2">
                        <span aria-hidden="true">† </span>Śmierć
                      </dt>
                      <dd>{smierc}</dd>
                    </>
                  )}
                  {ileLat && (
                    <>
                      <dt className="text-tekst-2">Wiek</dt>
                      <dd>{ileLat}</dd>
                    </>
                  )}
                  {o.miejsce && (
                    <>
                      <dt className="text-tekst-2">Miejsce</dt>
                      <dd>{o.miejsce}</dd>
                    </>
                  )}
                </dl>
              )
            )}

            {o.notatka && !o.ukryjDaty && <p className="mx-auto mt-4 max-w-sm border-t border-kreska pt-3 text-[15px] italic">{o.notatka}</p>}
            {!!o.niepewne?.length && <p className="mt-3 text-sm text-tekst-2">W źródle: {o.niepewne.map((n) => NIEPEWNE[n]).join(", ")}.</p>}

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href={sciezkaGalezi(slug, idWidoku(galaz), o.id)} className="przycisk przycisk-glowny">
                Pokaż na liście
              </Link>
              <Link href={sciezkaDiagramu(slug, idWidoku(galaz), o.id)} className="przycisk">
                Pokaż na diagramie
              </Link>
            </div>
          </article>

          {zwiazki.length > 0 && (
            <Poziom tytul={zwiazki.length > 1 ? "Małżonkowie" : "Małżonek"} className="lg:col-start-3 lg:row-start-1 lg:pl-10">
              <ul className="grid gap-2">
                {zwiazki.map((z) => (
                  <li key={z.osoba.id} className="relative">
                    {/* znak „+” łączący osobę z małżonkiem (na szerokim ekranie) */}
                    <span aria-hidden="true" className="absolute -left-16 top-1/2 hidden h-[2.5px] w-16 -translate-y-1/2 items-center justify-center bg-[var(--linia)] lg:flex">
                      <span data-linia={z === zwiazki[0] ? "plus" : undefined} className="flex size-6 items-center justify-center rounded-full border-2 border-akcent bg-lita text-base font-bold leading-none text-akcent">+</span>
                    </span>
                    {karta(z.osoba, zwiazki.length > 1 ? `związek ${z.kolejnosc}` : z.osoba.plec === "K" ? "żona" : z.osoba.plec === "M" ? "mąż" : "małżonek", false, "💍")}
                  </li>
                ))}
              </ul>
            </Poziom>
          )}

          {rodzenstwo.length > 0 && (
            <Poziom tytul={`Rodzeństwo (${rodzenstwo.length})`} className="lg:col-start-1 lg:row-start-1" linia="rodzenstwo">
              <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                {rodzenstwo.map((r) => (
                  <li key={r.osoba.id}>{karta(r.osoba, r.przyrodnie ? "rodzeństwo przyrodnie" : undefined, true)}</li>
                ))}
              </ul>
            </Poziom>
          )}
        </div>
        </LinieRodziny>

        {dzieci.length > 0 && (
          <>
            <Lacznik />
            <Poziom tytul={`Dzieci (${dzieci.length})`}>
              <Lacznik />
              <div className="grid gap-4">
                {[...grupyDzieci.entries()].map(([drugiId, lista]) => {
                  const drugi = osoba(drugiId || null);
                  return (
                    <div key={drugiId || "brak"}>
                      {(grupyDzieci.size > 1 || zwiazki.length > 1) && (
                        <p className="mb-1.5 text-center text-sm text-tekst-2">
                          {drugi ? (
                            <>
                              z:{" "}
                              <Link href={sciezkaOsoby(slug, drugi.id)} className="link">
                                {pelneImie(drugi)}
                              </Link>
                            </>
                          ) : (
                            "drugi rodzic nieustalony"
                          )}
                        </p>
                      )}
                      <ul className="dzieci-linie flex flex-wrap justify-center gap-2">
                        {lista.map((dz) => (
                          <li key={dz.id} className="basis-[calc(50%-0.25rem)] sm:basis-[calc(33.333%-0.34rem)] lg:basis-[calc(25%-0.375rem)] xl:basis-[calc(20%-0.4rem)]">
                            {karta(dz, undefined, true, "👶")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Poziom>
          </>
        )}
      </main>
  );
}
