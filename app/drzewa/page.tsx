import type { Metadata } from "next";
import { KatalogDrzew } from "@/components/KatalogDrzew";
import { Naglowek } from "@/components/Naglowek";
import { Stopka } from "@/components/Stopka";
import { pobierzDrzewa } from "@/lib/dane";

export const metadata: Metadata = {
  title: "Drzewa",
  description: "Wszystkie drzewa genealogiczne w serwisie Nasi przodkowie: wyszukiwanie po nazwie, nazwisku i regionie oraz sortowanie.",
  openGraph: { title: "Drzewa · Nasi przodkowie", description: "Wszystkie drzewa genealogiczne w serwisie." },
};

export default async function IndeksDrzew() {
  const drzewa = await pobierzDrzewa();
  return (
    <>
      <Naglowek />
      <main id="tresc" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 pt-8">
        <h1 className="text-4xl">Drzewa</h1>
        <p className="mt-1 max-w-2xl text-tekst-2">Wybierz drzewo rodziny, aby przeglądać jego gałęzie, osoby i powiązania.</p>
        <div className="mt-6">
          <KatalogDrzew drzewa={drzewa} />
        </div>
      </main>
      <Stopka />
    </>
  );
}
