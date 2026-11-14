"use client";

import Link from "next/link";
import { MotywPrzelacznik } from "@/components/MotywPrzelacznik";
import { MenuKonta } from "@/components/konta/MenuKonta";
import { BASE_PATH, sciezkaIndeksuDrzew } from "@/lib/sciezki";
import { LinkStworzDrzewo } from "./StworzDrzewo";

const LINK = "g-link hidden min-h-11 items-center rounded-full px-[18px] text-[15px] font-medium g-t2 sm:flex";
const LINK_AKTYWNY = "g-tag g-akcent hidden min-h-11 items-center rounded-full px-[18px] text-[15px] font-semibold sm:flex";

/** Nagłówek stron w stylu miękkim: logo, „Przegląd drzew”, „Stwórz drzewo”, profil (po zalogowaniu) i przełącznik motywu. */
export function NaglowekGlowna({ aktywny }: { aktywny?: "drzewa" }) {
  return (
    <header className="relative z-20 mx-auto w-full max-w-[1160px] px-4 pt-5 sm:px-8">
      <a href="#tresc" className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-black">
        Przejdź do treści
      </a>
      <nav aria-label="Główna nawigacja" className="g-szklo flex items-center justify-between gap-3 rounded-full py-2 pl-6 pr-2">
        <Link href="/" className="g-display flex min-h-11 items-center gap-2.5 text-xl font-bold tracking-[-0.02em]" aria-label="Przodkowie – strona główna">
          {/* Logo jest czarne na przezroczystym tle; w ciemnym motywie odwracamy kolory. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE_PATH}/przodkowie_logo.png`} alt="" width={28} height={28} className="size-7 dark-odwroc" />
          Przodkowie
        </Link>
        <div className="flex items-center gap-1">
          <Link href={sciezkaIndeksuDrzew()} className={aktywny === "drzewa" ? LINK_AKTYWNY : LINK} aria-current={aktywny === "drzewa" ? "page" : undefined}>
            Przegląd drzew
          </Link>
          <LinkStworzDrzewo className={LINK} />
          <MenuKonta wariant="glowna" />
          <MotywPrzelacznik />
        </div>
      </nav>
    </header>
  );
}
