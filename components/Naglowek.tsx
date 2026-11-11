"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wyszukiwarka } from "./Wyszukiwarka";

type GalazSkrot = { id: string; nazwa: string; kolor: string };

export function Naglowek({ tytul, galezie, korzenId }: { tytul: string; galezie: GalazSkrot[]; korzenId: string }) {
  const sciezka = usePathname() ?? "/";
  const naGlownej = sciezka === "/";
  const linki = [
    // Na telefonie domyślnym widokiem jest widok osoby, dlatego stoi pierwszy.
    { href: `/osoba/${korzenId}/`, etykieta: "Widok osoby", aktywny: sciezka.startsWith("/osoba/"), klasa: "sm:order-2" },
    { href: "/drzewo/", etykieta: "Drzewo", aktywny: sciezka.startsWith("/drzewo"), klasa: "sm:order-1" },
    { href: "/osoby/", etykieta: "Indeks", aktywny: sciezka.startsWith("/osoby"), klasa: "sm:order-3" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-kreska/70 bg-papier/95 backdrop-blur-sm">
      <a href="#tresc" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-papier-jasny focus:px-3 focus:py-2">
        Przejdź do treści
      </a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 sm:flex-nowrap">
        <Link href="/" className="szeryf mr-auto flex items-center gap-2 text-xl font-semibold tracking-wide text-atrament sm:mr-0" aria-label={`${tytul} – strona główna`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 text-bordo">
            <path d="M12 22v-9M12 13c0-4-3-5-6-5 0 4 2 6 6 5Zm0-2c0-5 3-7 7-7 0 5-3 8-7 7Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          <span>Lulkiewiczowie</span>
        </Link>
        <nav aria-label="Główna nawigacja" className="flex items-center gap-1 text-[15px]">
          {linki.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.aktywny ? "page" : undefined}
              className={`${l.klasa} rounded-sm px-2.5 py-1.5 ${l.aktywny ? "bg-papier-ciemny font-semibold text-atrament" : "text-sepia hover:bg-papier-ciemny/60 hover:text-atrament"}`}
            >
              {l.etykieta}
            </Link>
          ))}
        </nav>
        {!naGlownej && (
          <div className="order-last w-full sm:order-none sm:ml-auto sm:w-80">
            <Wyszukiwarka galezie={galezie} />
          </div>
        )}
      </div>
    </header>
  );
}
