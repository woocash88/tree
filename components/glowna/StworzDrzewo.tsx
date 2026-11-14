"use client";

import Link from "next/link";
import { useKonto } from "@/components/konta/AuthProvider";
import { ADRES_NOWEGO_DRZEWA, PARAM_PO, WARTOSC_PO_NOWE } from "@/components/konta/cel";

/** Adres, pod który prowadzi „Stwórz drzewo”: zalogowany – prosto do formularza, gość – najpierw logowanie lub rejestracja. */
export function useAdresStworzDrzewo(): string {
  const { status } = useKonto();
  return status === "zalogowany" ? ADRES_NOWEGO_DRZEWA : `/logowanie/?${PARAM_PO}=${WARTOSC_PO_NOWE}`;
}

/** Odnośnik „Stwórz drzewo” w nagłówku strony głównej. Niewidoczny, gdy konta nie są włączone. */
export function LinkStworzDrzewo({ className }: { className?: string }) {
  const { status } = useKonto();
  const adres = useAdresStworzDrzewo();
  if (status === "wylaczone") return null;
  return (
    <Link href={adres} className={className}>
      Stwórz drzewo
    </Link>
  );
}

/** Przycisk w karcie „Stwórz drzewo genealogiczne”: gość – „Zacznij tu” (rejestracja), zalogowany – „Moje drzewa”. */
export function PrzyciskZacznijTu({ className }: { className?: string }) {
  const { status } = useKonto();
  if (status === "wylaczone") return null;
  const zalogowany = status === "zalogowany";
  return (
    <Link href={zalogowany ? "/profil/" : `/rejestracja/?${PARAM_PO}=${WARTOSC_PO_NOWE}`} className={className}>
      {zalogowany ? "Moje drzewa" : "Zacznij tu"}
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
