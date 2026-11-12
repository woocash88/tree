import { Naglowek } from "@/components/Naglowek";
import { Stopka } from "@/components/Stopka";

/** Wspólny układ stron kont (logowanie, rejestracja, profil). */
export function StronaKonta({ szeroka = false, children }: { szeroka?: boolean; children: React.ReactNode }) {
  return (
    <>
      <Naglowek />
      <main id="tresc" className={`mx-auto w-full flex-1 px-4 pb-8 pt-8 ${szeroka ? "max-w-4xl" : "max-w-md"}`}>
        {children}
      </main>
      <Stopka />
    </>
  );
}
