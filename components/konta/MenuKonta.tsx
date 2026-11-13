"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { wyloguj } from "@/lib/baza/konta";
import { sciezkaAdmina } from "@/lib/sciezki";
import { useKonto } from "./AuthProvider";

/** Prawa strona nagłówka: logowanie i rejestracja albo menu zalogowanego użytkownika. */
export function MenuKonta() {
  const konto = useKonto();
  const [otwarte, setOtwarte] = useState(false);
  const korzen = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!otwarte) return;
    const poza = (e: MouseEvent) => !korzen.current?.contains(e.target as Node) && setOtwarte(false);
    const klawisz = (e: KeyboardEvent) => e.key === "Escape" && setOtwarte(false);
    document.addEventListener("mousedown", poza);
    document.addEventListener("keydown", klawisz);
    return () => {
      document.removeEventListener("mousedown", poza);
      document.removeEventListener("keydown", klawisz);
    };
  }, [otwarte]);

  if (konto.status === "wylaczone") return null;
  if (konto.status === "ladowanie") return <span aria-hidden="true" className="inline-block h-8 w-24" />;
  if (konto.status === "gosc") {
    return (
      <div className="flex items-center gap-1.5">
        <Link href="/logowanie/" className="rounded-full px-3 py-1.5 text-sm font-medium text-tekst-2 hover:bg-najazd hover:text-tekst">
          Zaloguj się
        </Link>
        <Link href="/rejestracja/" className="przycisk przycisk-glowny !min-h-8">
          Zarejestruj się
        </Link>
      </div>
    );
  }
  const nazwa = konto.profil ? `${konto.profil.imie} ${konto.profil.nazwisko}` : (konto.email ?? "Konto");
  return (
    <div ref={korzen} className="relative">
      <button type="button" className="przycisk !min-h-8 max-w-48" aria-expanded={otwarte} aria-haspopup="menu" onClick={() => setOtwarte((o) => !o)}>
        <span aria-hidden="true">👤</span>
        <span className="truncate">{konto.profil?.imie ?? "Konto"}</span>
      </button>
      {otwarte && (
        <div role="menu" className="szklo !bg-lita absolute right-0 top-full z-50 mt-2 w-64 p-2 text-sm">
          <p className="truncate px-3 py-2 font-semibold" title={nazwa}>
            {nazwa}
          </p>
          <Link role="menuitem" href="/profil/" className="block rounded-lg px-3 py-2 hover:bg-najazd" onClick={() => setOtwarte(false)}>
            Mój profil i drzewa
          </Link>
          {konto.czyAdmin && (
            <Link role="menuitem" href={sciezkaAdmina()} className="block rounded-lg px-3 py-2 hover:bg-najazd" onClick={() => setOtwarte(false)}>
              Panel administratora
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-najazd"
            onClick={() => {
              setOtwarte(false);
              void wyloguj();
            }}
          >
            Wyloguj
          </button>
        </div>
      )}
    </div>
  );
}
