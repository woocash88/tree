import Link from "next/link";
import { sciezkaPolitykiPrywatnosci } from "@/lib/sciezki";

/** Stopka serwisu: na każdej stronie tylko link do polityki prywatności. */
export function Stopka() {
  return (
    <footer className="mx-auto mt-12 max-w-7xl px-4 pb-8 text-center text-sm">
      <Link href={sciezkaPolitykiPrywatnosci()} className="link">
        Polityka prywatności
      </Link>
    </footer>
  );
}
