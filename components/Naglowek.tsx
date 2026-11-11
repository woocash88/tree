"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sciezkaDrzewa, sciezkaIndeksuDrzew, sciezkaIndeksuOsob } from "@/lib/sciezki";
import { MotywPrzelacznik } from "./MotywPrzelacznik";
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
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-tekst" aria-label="Nasi przodkowie – strona główna">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 text-akcent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21v-8M12 13c0-3.5-2.5-5-6-5 0 3.5 2 5.5 6 5Zm0-1.5c0-4.5 2.6-7 7-7 0 4.5-2.8 7.6-7 7Z" />
          </svg>
          <span className="max-[480px]:sr-only">Nasi przodkowie</span>
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
        <div className={`flex items-center ${drzewo ? "ml-auto sm:ml-0" : "ml-auto"}`}>
          <MotywPrzelacznik />
        </div>
      </div>
    </header>
  );
}
