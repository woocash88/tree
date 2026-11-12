"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BASE_PATH, sciezkaDrzewa, sciezkaIndeksuDrzew, sciezkaIndeksuOsob } from "@/lib/sciezki";
import { MotywPrzelacznik } from "./MotywPrzelacznik";
import { MenuKonta } from "./konta/MenuKonta";
import { Wyszukiwarka } from "./Wyszukiwarka";

type GalazSkrot = { id: string; nazwa: string; kolor: string };
export type KontekstDrzewa = { slug: string; nazwa: string; galezie: GalazSkrot[] };

/** Nagłówek serwisu. W obrębie drzewa dodaje jego nazwę, link do indeksu osób i wyszukiwarkę osób. */
export function Naglowek({ drzewo }: { drzewo?: KontekstDrzewa }) {
  const sciezka = usePathname() ?? "/";
  const linki = [
    { href: sciezkaIndeksuDrzew(), etykieta: "Drzewa", aktywny: sciezka === "/drzewa" || sciezka === "/drzewa/" },
    ...(drzewo
      ? [
          { href: sciezkaDrzewa(drzewo.slug), etykieta: "Drzewo", aktywny: /^\/drzewa\/[^/]+\/?$/.test(sciezka) },
          { href: sciezkaIndeksuOsob(drzewo.slug), etykieta: "Osoby", aktywny: sciezka.includes("/osoby") },
        ]
      : []),
  ];
  return (
    <header className="szklo relative top-0 z-40 !rounded-none !border-x-0 !border-t-0 sm:sticky">
      <a href="#tresc" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-lita focus:px-3 focus:py-2">
        Przejdź do treści
      </a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:flex-nowrap">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-tekst" aria-label="Przodkowie – strona główna">
          {/* Logo jest czarne na przezroczystym tle; w ciemnym motywie odwracamy kolory. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE_PATH}/przodkowie_logo.png`} alt="" width={32} height={32} className="size-8 dark-odwroc" />
          <span className="max-[480px]:sr-only">Przodkowie</span>
        </Link>
        <nav aria-label="Główna nawigacja" className="flex items-center gap-1 text-sm">
          {linki.map((l) => (
            <Link key={l.href} href={l.href} aria-current={l.aktywny ? "page" : undefined} className={`rounded-full px-3 py-1.5 font-medium ${l.aktywny ? "bg-zaznaczenie text-tekst" : "text-tekst-2 hover:bg-najazd hover:text-tekst"}`}>
              {l.etykieta}
            </Link>
          ))}
        </nav>
        {drzewo && (
          <div className="order-last w-full sm:order-none sm:ml-auto sm:w-80">
            <Wyszukiwarka slug={drzewo.slug} galezie={drzewo.galezie} />
          </div>
        )}
        <div className={`flex items-center gap-2 ${drzewo ? "ml-auto sm:ml-0" : "ml-auto"}`}>
          <MenuKonta />
          <MotywPrzelacznik />
        </div>
      </div>
    </header>
  );
}
