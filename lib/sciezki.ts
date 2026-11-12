export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Adres główny serwisu (sitemap.xml, Open Graph). Przy własnej domenie ustaw NEXT_PUBLIC_SITE_URL. */
export const ADRES_SERWISU = (process.env.NEXT_PUBLIC_SITE_URL || "https://woocash88.github.io").replace(/\/$/, "") + BASE_PATH;

type Parametry = Record<string, string | undefined>;
const zapytanie = (p?: Parametry) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p ?? {})) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
};

export const sciezkaIndeksuDrzew = () => "/drzewa/";
export const sciezkaPolitykiPrywatnosci = () => "/polityka-prywatnosci/";
/** Panel administratora; z kotwicą do wskazanego drzewa. */
export const sciezkaAdmina = (slug?: string) => `/admin/${slug ? `#${slug}` : ""}`;
export const sciezkaDrzewa = (slug: string) => `/drzewa/${slug}/`;
export const sciezkaOsoby = (slug: string, id: string) => `/drzewa/${slug}/osoba/${id}/`;
export const sciezkaIndeksuOsob = (slug: string, p?: Parametry) => `/drzewa/${slug}/osoby/${zapytanie(p)}`;
/** Lista gałęzi; `os` – zaznaczona osoba, `rozw` – stan rozwinięcia (patrz lib/lista.ts). */
export const sciezkaGalezi = (slug: string, galaz: string, os?: string | null, rozw?: string) => `/drzewa/${slug}/galaz/${galaz}/${zapytanie({ os: os ?? undefined, rozw })}`;
export const sciezkaDiagramu = (slug: string, galaz: string, os?: string | null) => `/drzewa/${slug}/diagram/${galaz}/${zapytanie({ os: os ?? undefined })}`;
export const sciezkaIndeksuSzukania = (slug: string) => `${BASE_PATH}/dane/szukaj-${slug}.json`;
