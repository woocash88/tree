import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WidokIndeksuOsob } from "@/components/widoki/WidokIndeksuOsob";
import { Stopka } from "@/components/Stopka";
import { pobierzDrzewo } from "@/lib/dane";

type Props = { params: Promise<{ drzewo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { drzewo } = await params;
  const d = await pobierzDrzewo(drzewo);
  if (!d) return {};
  return {
    title: `Indeks osób – ${d.meta.nazwa}`,
    description: `Alfabetyczna lista ${d.statystyki.osob} osób z drzewa „${d.meta.nazwa}”, z filtrami po nazwisku, gałęzi i stuleciu.`,
  };
}

export default async function StronaIndeksu({ params }: Props) {
  const { drzewo } = await params;
  const d = await pobierzDrzewo(drzewo);
  if (!d) notFound();
  return (
    <>
      <WidokIndeksuOsob d={d} />
      <Stopka drzewo={d.meta} />
    </>
  );
}
