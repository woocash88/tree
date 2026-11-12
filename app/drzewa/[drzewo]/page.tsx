import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Stopka } from "@/components/Stopka";
import { WidokStronyDrzewa } from "@/components/widoki/WidokStronyDrzewa";
import { pobierzDrzewo } from "@/lib/dane";
import { ileOsob, ilePokolen } from "@/lib/format";

type Props = { params: Promise<{ drzewo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { drzewo } = await params;
  const d = await pobierzDrzewo(drzewo);
  if (!d) return {};
  const { meta, statystyki: s } = d;
  const opis = `${meta.opis} ${ileOsob(s.osob)}, ${ilePokolen(s.pokolen)}, lata ${meta.zakresLat.od}–${meta.zakresLat.do}.`;
  return { title: meta.nazwa, description: opis, openGraph: { title: meta.nazwa, description: opis } };
}
export default async function StronaDrzewa({ params }: Props) {
  const { drzewo } = await params;
  const d = await pobierzDrzewo(drzewo);
  if (!d) notFound();
  return (
    <>
      <WidokStronyDrzewa d={d} />
      <Stopka drzewo={d.meta} />
    </>
  );
}
