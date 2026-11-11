import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListaGalezi } from "@/components/ListaGalezi";
import { Stopka } from "@/components/Stopka";
import { daneWidoku, pobierzDrzewa, pobierzDrzewo } from "@/lib/dane";
import { ileOsob } from "@/lib/format";

type Props = { params: Promise<{ drzewo: string; galaz: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const wynik: { drzewo: string; galaz: string }[] = [];
  for (const { meta } of await pobierzDrzewa()) {
    const d = (await pobierzDrzewo(meta.slug))!;
    for (const g of d.galezieLista) wynik.push({ drzewo: meta.slug, galaz: g.id });
  }
  return wynik;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { drzewo, galaz } = await params;
  const d = await pobierzDrzewo(drzewo);
  const s = d?.statystykiGalezi.find((x) => x.galaz.id === galaz);
  if (!d || !s) return {};
  const lata = s.od && s.do ? `, lata ${s.od}–${s.do}` : "";
  const opis = `${s.galaz.opis ? s.galaz.opis + " " : ""}Lista gałęzi „${s.galaz.nazwa}” w drzewie „${d.meta.nazwa}”: ${ileOsob(s.osob)}${lata}.`;
  return { title: `${s.galaz.nazwa} – ${d.meta.nazwa}`, description: opis, openGraph: { title: `${s.galaz.nazwa} – ${d.meta.nazwa}`, description: opis } };
}

export default async function StronaGalezi({ params }: Props) {
  const { drzewo, galaz } = await params;
  const d = await pobierzDrzewo(drzewo);
  const s = d?.statystykiGalezi.find((x) => x.galaz.id === galaz);
  if (!d || !s) notFound();
  return (
    <>
      <ListaGalezi slug={d.meta.slug} {...daneWidoku(d)} galazId={galaz} liczbaOsob={s.osob} />
      <Stopka drzewo={d.meta} />
    </>
  );
}
