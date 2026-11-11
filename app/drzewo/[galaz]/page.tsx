import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlotnoDrzewa } from "@/components/PlotnoDrzewa";
import { daneDrzewa, wczytajDane } from "@/lib/dane";

type Props = { params: Promise<{ galaz: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return wczytajDane().rodzina.galezie.map((g) => ({ galaz: g.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { galaz } = await params;
  const s = wczytajDane().statystykiGalezi.find((x) => x.galaz.id === galaz);
  if (!s) return {};
  const lata = s.od && s.do ? `, lata ${s.od}–${s.do}` : "";
  const opis = `${s.galaz.opis} Drzewo gałęzi: ${s.osob} osób${lata}.`;
  return { title: `${s.galaz.nazwa} – drzewo`, description: opis, openGraph: { title: s.galaz.nazwa, description: opis } };
}

export default async function StronaGalezi({ params }: Props) {
  const { galaz } = await params;
  if (!wczytajDane().galezie.has(galaz)) notFound();
  return (
    <main className="relative min-h-[30rem] flex-1">
      <PlotnoDrzewa {...daneDrzewa()} galazId={galaz} />
    </main>
  );
}
