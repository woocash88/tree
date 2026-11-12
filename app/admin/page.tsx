import type { Metadata } from "next";
import { Naglowek } from "@/components/Naglowek";
import { PanelAdmina } from "@/components/PanelAdmina";
import { Stopka } from "@/components/Stopka";
import { pobierzDrzewa } from "@/lib/dane";

export const metadata: Metadata = {
  title: "Administracja",
  description: "Panel administratora serwisu.",
  robots: { index: false, follow: false },
};

export default async function StronaAdmina() {
  const drzewa = await pobierzDrzewa();
  return (
    <>
      <Naglowek />
      <main id="tresc" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-8">
        <PanelAdmina drzewa={drzewa} />
      </main>
      <Stopka />
    </>
  );
}
