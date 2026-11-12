"use client";

import Link from "next/link";
import { useKonto } from "./AuthProvider";

/**
 * Zaproszenie do rejestracji i logowania w sekcji głównej strony. Znika po zalogowaniu
 * (wtedy użytkownik ma profil w nagłówku) oraz gdy konta nie są włączone.
 */
export function HeroKonta() {
  const { status } = useKonto();
  if (status === "wylaczone" || status === "zalogowany") return null;
  if (status === "ladowanie") return <div aria-hidden="true" className="mx-auto mt-8 min-h-24 max-w-2xl" />;
  return (
    <section aria-label="Rejestracja i logowanie" className="szklo mx-auto mt-8 max-w-2xl p-5 text-left sm:flex sm:items-center sm:gap-6">
      <div className="flex-1">
        <h2 className="text-2xl">Stwórz własne drzewo genealogiczne</h2>
        <p className="mt-1 text-[15px] text-tekst-2">Załóż bezpłatne konto, dodawaj osoby, zapraszaj rodzinę do współpracy i sam decyduj, kto widzi drzewo i dane osób żyjących.</p>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:mt-0 sm:w-44">
        <Link href="/rejestracja/" className="przycisk przycisk-glowny !min-h-11">
          Zarejestruj się
        </Link>
        <Link href="/logowanie/" className="przycisk !min-h-11">
          Zaloguj się
        </Link>
      </div>
    </section>
  );
}
