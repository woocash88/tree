import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlotnoDrzewa } from "@/components/PlotnoDrzewa";
import { daneWidoku, pobierzDrzewa, pobierzDrzewo, statystykaWidoku } from "@/lib/dane";
import { galezieWidoku } from "@/lib/galezie";
import { ileOsob } from "@/lib/format";

type Props = { params: Promise<{ drzewo: string; galaz: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const wynik: { drzewo: string; galaz: string }[] = [];
  for (const { meta } of await pobierzDrzewa()) {
    const d = (await pobierzDrzewo(meta.slug))!;
    for (const g of galezieWidoku(d.galezieLista)) wynik.push({ drzewo: meta.slug, galaz: g.id });
  }
  return wynik;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { drzewo, galaz } = await params;
  const d = await pobierzDrzewo(drzewo);
  const s = d && statystykaWidoku(d, galaz);
  if (!d || !s) return {};
  const opis = `Diagram gałęzi „${s.galaz.nazwa}” w drzewie „${d.meta.nazwa}”: ${ileOsob(s.osob)}. Przesuwaj, powiększaj, zwijaj i rozwijaj pokolenia.`;
  return { title: `Diagram: ${s.galaz.nazwa} – ${d.meta.nazwa}`, description: opis, openGraph: { title: `Diagram: ${s.galaz.nazwa}`, description: opis } };
}

export default async function StronaDiagramu({ params }: Props) {
  const { drzewo, galaz } = await params;
  const d = await pobierzDrzewo(drzewo);
  if (!d || !statystykaWidoku(d, galaz)) notFound();
  return (
    <main className="relative min-h-[30rem] flex-1">
      <PlotnoDrzewa slug={d.meta.slug} {...daneWidoku(d)} galazId={galaz} />
    </main>
  );
}
