import { pobierzDrzewa, pobierzIndeksSzukania } from "@/lib/dane";

// Statyczne pliki JSON z indeksem wyszukiwania osób – osobny dla każdego drzewa (szukaj-<slug>.json),
// pobierany przez przeglądarkę dopiero na stronie danego drzewa.
export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ plik: string }> };

export async function generateStaticParams() {
  const lista = (await pobierzDrzewa()).map(({ meta }) => ({ plik: `szukaj-${meta.slug}.json` }));
  // Eksport statyczny wymaga co najmniej jednego pliku; bez opublikowanych drzew jest to pusty indeks.
  return lista.length ? lista : [{ plik: "szukaj-brak.json" }];
}

export async function GET(_zadanie: Request, { params }: Props) {
  const { plik } = await params;
  const slug = plik.replace(/^szukaj-/, "").replace(/\.json$/, "");
  return Response.json(await pobierzIndeksSzukania(slug));
}
