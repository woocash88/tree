import Link from "next/link";
import type { DrzewoMeta } from "@/lib/schemat-drzewa";
import { KLUCZ_APP_CHECK } from "@/lib/baza/firebase";
import { sciezkaPolitykiPrywatnosci } from "@/lib/sciezki";

/** Stopka serwisu; na stronach drzewa pokazuje źródło danych i opiekuna. */
export function Stopka({ drzewo }: { drzewo?: Pick<DrzewoMeta, "zrodlo" | "autor" | "politykaDatZyjacych" | "przykladowe"> }) {
  return (
    <footer className="mx-auto mt-16 max-w-7xl px-4 pb-8 text-center text-sm text-tekst-2">
      {drzewo && (
        <p className="mb-2">
          {drzewo.przykladowe ? "Drzewo przykładowe – wszystkie dane są zmyślone. " : drzewo.zrodlo ? "Źródło danych: " : ""}
          {!drzewo.przykladowe && drzewo.zrodlo && (
            <>
              <a className="link" href={drzewo.zrodlo.url} rel="noreferrer">
                {drzewo.zrodlo.nazwa}
              </a>
              {". "}
            </>
          )}
          Opiekun: {drzewo.autor.url ? <a className="link" href={drzewo.autor.url} rel="noreferrer">{drzewo.autor.nazwa}</a> : drzewo.autor.nazwa}.{" "}
          {drzewo.politykaDatZyjacych === "ukryj" ? "Dane osób żyjących są ukryte." : drzewo.politykaDatZyjacych === "tylko-rok" ? "Przy osobach żyjących pokazujemy tylko rok urodzenia." : ""}
        </p>
      )}
      <p>
        <Link href="/" className="font-semibold text-tekst">
          Przodkowie
        </Link>{" "}
        · drzewa genealogiczne rodzin · bez ciasteczek i skryptów śledzących ·{" "}
        <Link href={sciezkaPolitykiPrywatnosci()} className="link">
          Polityka prywatności
        </Link>
      </p>
      {KLUCZ_APP_CHECK && (
        <>
          {/* Plakietkę reCAPTCHA chowamy (zasłaniałaby panele), więc Google wymaga tego oznaczenia w stopce. */}
          <style>{".grecaptcha-badge{visibility:hidden}"}</style>
          <p className="mt-2 text-xs">
            Ta strona jest chroniona przez reCAPTCHA; obowiązują{" "}
            <a className="link" href="https://policies.google.com/privacy" rel="noreferrer">
              Polityka prywatności
            </a>{" "}
            i{" "}
            <a className="link" href="https://policies.google.com/terms" rel="noreferrer">
              Warunki korzystania
            </a>{" "}
            Google.
          </p>
        </>
      )}
    </footer>
  );
}
