import Link from "next/link";
import { Naglowek } from "@/components/Naglowek";
import { Stopka } from "@/components/Stopka";

export default function NieZnaleziono() {
  return (
    <>
      <Naglowek />
      <main id="tresc" className="mx-auto w-full max-w-xl flex-1 px-4 py-20">
        <div className="szklo p-8 text-center">
          <p className="text-6xl font-bold text-akcent">404</p>
          <h1 className="mt-2 text-3xl">Nie ma takiej strony</h1>
          <p className="mt-3 text-tekst-2">Adres może być niepełny, drzewo mogło zmienić nazwę albo osoba ma inny identyfikator.</p>
          <p className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/" className="przycisk">Strona główna</Link>
            <Link href="/drzewa/" className="przycisk przycisk-glowny">Wszystkie drzewa</Link>
          </p>
        </div>
      </main>
      <Stopka />
    </>
  );
}
