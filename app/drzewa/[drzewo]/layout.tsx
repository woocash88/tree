import { notFound } from "next/navigation";
import { Naglowek } from "@/components/Naglowek";
import { pobierzDrzewa, pobierzDrzewo } from "@/lib/dane";

type Props = { children: React.ReactNode; params: Promise<{ drzewo: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await pobierzDrzewa()).map(({ meta }) => ({ drzewo: meta.slug }));
}

/** Układ wszystkich stron jednego drzewa: nagłówek z nazwą drzewa i wyszukiwarką jego osób. */
export default async function UkladDrzewa({ children, params }: Props) {
  const { drzewo } = await params;
  const d = await pobierzDrzewo(drzewo);
  if (!d) notFound();
  return (
    <>
      <Naglowek drzewo={{ slug: d.meta.slug, nazwa: d.meta.nazwa, galezie: d.galezieLista.map((g) => ({ id: g.id, nazwa: g.nazwa, kolor: g.kolor })) }} />
      <div id="tresc" className="flex flex-1 flex-col">
        {children}
      </div>
    </>
  );
}
