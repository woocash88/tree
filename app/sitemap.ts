import type { MetadataRoute } from "next";
import { pobierzDrzewa, pobierzDrzewo } from "@/lib/dane";
import { galezieWidoku } from "@/lib/galezie";
import { ADRES_SERWISU, sciezkaDrzewa, sciezkaGalezi, sciezkaIndeksuDrzew, sciezkaIndeksuOsob, sciezkaOsoby, sciezkaPolitykiPrywatnosci } from "@/lib/sciezki";

export const dynamic = "force-static";

/** Mapa strony generowana z listy drzew: serwis, drzewa, gałęzie, indeksy osób i osoby. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const adres = (sciezka: string) => `${ADRES_SERWISU}${sciezka}`;
  const wpisy: MetadataRoute.Sitemap = [
    { url: adres("/"), changeFrequency: "weekly", priority: 1 },
    { url: adres(sciezkaIndeksuDrzew()), changeFrequency: "weekly", priority: 0.9 },
    { url: adres(sciezkaPolitykiPrywatnosci()), changeFrequency: "yearly", priority: 0.2 },
  ];
  for (const { meta } of await pobierzDrzewa()) {
    const d = (await pobierzDrzewo(meta.slug))!;
    const zmiana = new Date(meta.zaktualizowano);
    wpisy.push({ url: adres(sciezkaDrzewa(meta.slug)), lastModified: zmiana, priority: 0.8 });
    wpisy.push({ url: adres(sciezkaIndeksuOsob(meta.slug)), lastModified: zmiana, priority: 0.5 });
    for (const g of galezieWidoku(d.galezieLista)) wpisy.push({ url: adres(sciezkaGalezi(meta.slug, g.id)), lastModified: zmiana, priority: 0.7 });
    for (const o of d.osobyLista) wpisy.push({ url: adres(sciezkaOsoby(meta.slug, o.id)), lastModified: zmiana, priority: 0.4 });
  }
  return wpisy;
}
