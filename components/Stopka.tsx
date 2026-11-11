import Link from "next/link";
import type { DrzewoMeta } from "@/lib/schemat-drzewa";

/** Stopka serwisu; na stronach drzewa pokazuje źródło danych i opiekuna. */
export function Stopka({ drzewo }: { drzewo?: Pick<DrzewoMeta, "zrodlo" | "autor" | "politykaDatZyjacych" | "przykladowe"> }) {
  return (
    <footer className="mx-auto mt-16 max-w-7xl px-4 pb-8 text-center text-sm text-tekst-2">
      {drzewo && (
        <p className="mb-2">
          {drzewo.przykladowe ? "Drzewo przykładowe – wszystkie dane są zmyślone. " : "Źródło danych: "}
          {!drzewo.przykladowe && (
            <a className="link" href={drzewo.zrodlo.url} rel="noreferrer">
              {drzewo.zrodlo.nazwa}
            </a>
          )}
          {!drzewo.przykladowe && ". "}
          Opiekun: {drzewo.autor.url ? <a className="link" href={drzewo.autor.url} rel="noreferrer">{drzewo.autor.nazwa}</a> : drzewo.autor.nazwa}.{" "}
          {drzewo.politykaDatZyjacych === "ukryj" ? "Dane osób żyjących są ukryte." : drzewo.politykaDatZyjacych === "tylko-rok" ? "Przy osobach żyjących pokazujemy tylko rok urodzenia." : ""}
        </p>
      )}
      <p>
        <Link href="/" className="font-semibold text-tekst">
          Przodkowie
        </Link>{" "}
        · drzewa genealogiczne rodzin · bez ciasteczek i skryptów śledzących
      </p>
    </footer>
  );
}
