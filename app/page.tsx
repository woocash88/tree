import Link from "next/link";
import { PowlokaMiekka } from "@/components/glowna/PowlokaMiekka";
import { PrzyciskZacznijTu } from "@/components/glowna/StworzDrzewo";
import { SzukajDrzew } from "@/components/SzukajDrzew";
import { pobierzDrzewa } from "@/lib/dane";
import { sciezkaIndeksuDrzew } from "@/lib/sciezki";

const KARTA = "g-szklo flex flex-col gap-4 rounded-[32px] p-8";
const IKONA = "flex size-12 items-center justify-center rounded-[20px]";
const NAGLOWEK_KARTY = "g-display text-[23px] font-semibold leading-snug tracking-[-0.02em]";

/** Strona główna w stylu miękkim (wzór C): nagłówek-pigułka, hasło z wyszukiwarką i trzy karty (wyszukiwanie, stwórz drzewo, o portalu). */
export default async function StronaGlowna() {
  const drzewa = await pobierzDrzewa();

  return (
    <PowlokaMiekka>
      <main id="tresc" className="flex-1">
        <section className="mx-auto max-w-[1160px] px-4 pb-[clamp(48px,7vw,96px)] pt-[clamp(24px,4vw,48px)] text-center sm:px-8">
          <div className="g-tag g-akcent inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[13px] font-semibold tracking-[0.01em]">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: "var(--g-akcent)" }} />
            Drzewa genealogiczne rodzin
          </div>
          <h1 className="g-display mx-auto mt-6 max-w-[820px] text-[clamp(42px,7vw,80px)] font-bold leading-[1.02] tracking-[-0.04em] [text-wrap:balance]">
            Odnajdź swoich <span className="g-akcent">przodków.</span>
          </h1>
          <p className="g-t2 mx-auto mt-6 max-w-[560px] text-[clamp(16px,1.7vw,20px)] leading-relaxed [text-wrap:pretty]">
            Sprawdź, czy Twoje nazwisko już jest w drzewach innych rodzin, i wędruj po gałęziach, pokolenie po pokoleniu.
          </p>
          <div className="mt-10">
            <SzukajDrzew drzewa={drzewa} />
          </div>
          <p className="g-t3 mt-3.5 text-sm">Polskie znaki są opcjonalne: „lukasz” znajdzie „Łukasza”.</p>
          <p className="mt-4 sm:hidden">
            <Link href={sciezkaIndeksuDrzew()} className="g-link g-akcent inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold">
              Przeglądaj publiczne drzewa →
            </Link>
          </p>
        </section>

        <section id="jak-zaczac" className="mx-auto max-w-[1160px] px-4 pb-[clamp(48px,7vw,88px)] sm:px-8">
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            <article className={KARTA}>
              <div aria-hidden="true" className={`${IKONA} g-chip`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--g-akcent-tekst)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </div>
              <h2 className={NAGLOWEK_KARTY}>Wyszukiwanie</h2>
              <p className="g-t2 text-[15.5px] leading-relaxed">
                Wpisz nazwisko, nazwę rodziny albo region, a sprawdzisz, czy w publicznych drzewach ktoś już je nosi. W samym drzewie szukasz też po imieniu i roku, a wybrany wynik przenosi Cię prosto do osoby i jej gałęzi.
              </p>
              <p className="g-t3 mt-auto flex items-center gap-2 text-sm">
                Skrót na stronie głównej:
                <kbd className="g-chip g-t2 rounded-[10px] px-2.5 py-0.5 text-[13px]">/</kbd>
              </p>
            </article>

            <article className={KARTA} aria-label="Stwórz własne drzewo">
              <div aria-hidden="true" className={`${IKONA} g-przycisk`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--akcent-tekst)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <h2 className={NAGLOWEK_KARTY}>Stwórz własne drzewo genealogiczne</h2>
              <p className="g-t2 text-[15.5px] leading-relaxed">
                Stworzenie drzewa to pierwszy krok, aby poznać swoich przodków. Możesz tworzyć je samodzielnie lub wspólnie z członkami rodziny przez opcje kolaboracji. Możesz również zaimportować swoje istniejące drzewo z innych portali. Zacznij od założenia konta.
              </p>
              <PrzyciskZacznijTu className="g-przycisk mt-auto flex min-h-12 items-center justify-between rounded-[20px] px-5 text-[15px]" />
            </article>

            <article id="o-portalu" className={KARTA}>
              <div aria-hidden="true" className={`${IKONA} g-chip`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--g-akcent-tekst)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h2 className={NAGLOWEK_KARTY}>O portalu</h2>
              <p className="g-t2 text-[15.5px] leading-relaxed">
                Przodkowie to darmowy i otwarty serwis do tworzenia drzew genealogicznych. Drzewo rodowe może być prywatne, czyli dostępne tylko dla Ciebie i najbliższych, lub publiczne.
              </p>
            </article>
          </div>
        </section>
      </main>
    </PowlokaMiekka>
  );
}
