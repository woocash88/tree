import type { Metadata } from "next";
import { FormularzKontaktowy } from "@/components/FormularzKontaktowy";
import { Naglowek } from "@/components/Naglowek";
import { Stopka } from "@/components/Stopka";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Napisz do administratora serwisu Przodkowie: pytanie, zgłoszenie błędu, propozycja zmiany albo prośba dotycząca danych.",
};

export default function StronaKontaktu() {
  return (
    <>
      <Naglowek />
      <main id="tresc" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-8 pt-8">
        <h1 className="text-4xl">Kontakt</h1>
        <p className="mb-6 mt-2 text-tekst-2">Masz pytanie, zauważyłeś błąd albo chcesz coś zaproponować? Napisz – wiadomość trafia do administratora serwisu.</p>
        <FormularzKontaktowy />
      </main>
      <Stopka />
    </>
  );
}
