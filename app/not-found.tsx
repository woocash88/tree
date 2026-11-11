import Link from "next/link";
import { Ornament } from "@/components/Ornament";

export default function NieZnaleziono() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-5xl font-medium">Brak takiej karty</h1>
      <Ornament className="mx-auto mt-4" />
      <p className="szeryf mt-4 text-xl text-sepia">Tej strony nie ma w księdze. Być może adres jest niepełny albo osoba ma inny identyfikator.</p>
      <p className="mt-6 flex justify-center gap-4">
        <Link href="/" className="link">Strona główna</Link>
        <Link href="/osoby/" className="link">Indeks osób</Link>
      </p>
    </main>
  );
}
