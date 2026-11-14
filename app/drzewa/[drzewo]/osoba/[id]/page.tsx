import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Stopka } from "@/components/Stopka";
import { pobierzDrzewa, pobierzDrzewo } from "@/lib/dane";
import { WidokOsoby } from "@/components/widoki/WidokOsoby";
import { lataZycia, pelneImie } from "@/lib/format";

type Props = { params: Promise<{ drzewo: string; id: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const wynik: { drzewo: string; id: string }[] = [];
  for (const { meta } of await pobierzDrzewa()) {
    const d = (await pobierzDrzewo(meta.slug))!;
    for (const o of d.osobyLista) wynik.push({ drzewo: meta.slug, id: o.id });
  }
  // Zastępcza strona 404, gdy nie ma opublikowanych drzew (patrz app/drzewa/[drzewo]/layout.tsx).
  return wynik.length ? wynik : [{ drzewo: "brak", id: "brak" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { drzewo, id } = await params;
  const d = await pobierzDrzewo(drzewo);
  const o = d?.osoby.get(id);
  if (!d || !o) return {};
  const lata = lataZycia(o);
  const galaz = d.galezie.get(o.galazId)!;
  const tytul = `${pelneImie(o)}${lata ? ` (${lata})` : ""}`;
  const rodzice = [o.ojciecId, o.matkaId].filter((r): r is string => !!r).map((r) => pelneImie(d.osoby.get(r)!));
  const opis = [`${pelneImie(o)}${lata ? `, ${lata}` : ""} – ${d.meta.nazwa}, ${galaz.nazwa.toLowerCase()}, pokolenie ${d.pokolenie.get(o.id)}.`, rodzice.length ? `Rodzice: ${rodzice.join(" i ")}.` : ""]
    .filter(Boolean)
    .join(" ");
  return { title: `${tytul} – ${d.meta.nazwa}`, description: opis, openGraph: { title: tytul, description: opis } };
}

export default async function StronaOsoby({ params }: Props) {
  const { drzewo, id } = await params;
  const d = await pobierzDrzewo(drzewo);
  if (!d?.osoby.get(id)) notFound();
  return (
    <>
      <WidokOsoby d={d} id={id} />
      <Stopka />
    </>
  );
}
