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

/** Drzewa z bazy mają „slug” d~<id>; ich widoki są jedną stroną /d/ sterowaną parametrami (w=widok, g=gałąź, os=osoba). */
export const PREFIKS_DB = "d~";
export const czyDb = (slug: string) => slug.startsWith(PREFIKS_DB);
export const slugDb = (id: string) => `${PREFIKS_DB}${id}`;
export const idZeSlugu = (slug: string) => slug.slice(PREFIKS_DB.length);
const adresDb = (slug: string, p: Parametry = {}) => `/d/${zapytanie({ id: idZeSlugu(slug), ...p })}`;

export const sciezkaIndeksuDrzew = () => "/drzewa/";
export const sciezkaPolitykiPrywatnosci = () => "/polityka-prywatnosci/";
/** Panel administratora; z kotwicą do wskazanego drzewa. */
export const sciezkaAdmina = (slug?: string) => `/admin/${slug ? `#${slug}` : ""}`;
export const sciezkaDrzewa = (slug: string) => (czyDb(slug) ? adresDb(slug) : `/drzewa/${slug}/`);
export const sciezkaOsoby = (slug: string, id: string) => (czyDb(slug) ? adresDb(slug, { w: "osoba", os: id }) : `/drzewa/${slug}/osoba/${id}/`);
export const sciezkaIndeksuOsob = (slug: string, p?: Parametry) => (czyDb(slug) ? adresDb(slug, { w: "osoby", ...p }) : `/drzewa/${slug}/osoby/${zapytanie(p)}`);
/** Lista gałęzi; `os` – zaznaczona osoba, `rozw` – stan rozwinięcia (patrz lib/lista.ts). */
export const sciezkaGalezi = (slug: string, galaz: string, os?: string | null, rozw?: string) =>
  czyDb(slug) ? adresDb(slug, { w: "galaz", g: galaz, os: os ?? undefined, rozw }) : `/drzewa/${slug}/galaz/${galaz}/${zapytanie({ os: os ?? undefined, rozw })}`;
export const sciezkaDiagramu = (slug: string, galaz: string, os?: string | null) =>
  czyDb(slug) ? adresDb(slug, { w: "diagram", g: galaz, os: os ?? undefined }) : `/drzewa/${slug}/diagram/${galaz}/${zapytanie({ os: os ?? undefined })}`;
export const sciezkaIndeksuSzukania = (slug: string) => `${BASE_PATH}/dane/szukaj-${slug}.json`;
export const sciezkaUstawienDrzewa = (slug: string) => adresDb(slug, { w: "ustawienia" });
export const sciezkaProfilu = () => "/profil/";
