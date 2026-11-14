import Link from "next/link";
import { sciezkaKontaktu, sciezkaPolitykiPrywatnosci } from "@/lib/sciezki";

/** Stopka serwisu: na każdej stronie linki do polityki prywatności i formularza kontaktowego. */
export function Stopka() {
  return (
    <footer className="mx-auto mt-12 max-w-7xl px-4 pb-8 text-center text-sm">
      <Link href={sciezkaPolitykiPrywatnosci()} className="link">
        Polityka prywatności
      </Link>
      <span aria-hidden="true" className="mx-2 text-tekst-3">
        ·
      </span>
      <Link href={sciezkaKontaktu()} className="link">
        Kontakt
      </Link>
    </footer>
  );
}
