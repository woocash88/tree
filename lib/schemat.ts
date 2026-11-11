import { z } from "zod";

z.config(z.locales.pl());

/** Dokładność daty: pełna data, sam rok, przybliżenie albo brak informacji. */
export const DOKLADNOSCI = ["dokladna", "rok", "okolo", "nieznana"] as const;

const WZOR_DATY = /^\d{4}(-\d{2}-\d{2})?$/;

function poprawnaData(wartosc: string): boolean {
  if (!WZOR_DATY.test(wartosc)) return false;
  if (wartosc.length === 4) return true;
  const [r, m, d] = wartosc.split("-").map(Number);
  const data = new Date(Date.UTC(r, m - 1, d));
  return data.getUTCFullYear() === r && data.getUTCMonth() === m - 1 && data.getUTCDate() === d;
}

export const SchematDaty = z
  .strictObject({
    /** "RRRR" albo "RRRR-MM-DD". Brak przy dokładności "nieznana". */
    wartosc: z.string().optional(),
    dokladnosc: z.enum(DOKLADNOSCI),
    /** Miejsce zdarzenia, np. "Kobylin, Polska". */
    miejsce: z.string().min(1).optional(),
  })
  .superRefine((d, ctx) => {
    const blad = (message: string) => ctx.addIssue({ code: "custom", message });
    if (d.dokladnosc === "nieznana") {
      if (d.wartosc !== undefined) blad('przy dokładności "nieznana" pole "wartosc" musi być puste');
      return;
    }
    if (d.wartosc === undefined) return blad(`dokładność "${d.dokladnosc}" wymaga pola "wartosc"`);
    if (!poprawnaData(d.wartosc)) return blad(`niepoprawna data "${d.wartosc}" (oczekiwano RRRR lub RRRR-MM-DD)`);
    if (d.dokladnosc === "dokladna" && d.wartosc.length !== 10) blad('dokładność "dokladna" wymaga pełnej daty RRRR-MM-DD');
    if (d.dokladnosc === "rok" && d.wartosc.length !== 4) blad('dokładność "rok" wymaga samego roku RRRR');
  });

const Id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id może zawierać tylko małe litery a–z, cyfry i łączniki (np. jan-kowalski-1891)");

export const NIEPEWNE_POLA = ["imie", "nazwisko", "wpis", "miejsce", "rodzice", "plec"] as const;

export const SchematOsoby = z.strictObject({
  id: Id,
  imie: z.string(),
  nazwisko: z.string(),
  nazwiskoRodowe: z.string().min(1).optional(),
  plec: z.enum(["M", "K", "nieznana"]),
  urodzenie: SchematDaty,
  /** Brak pola = brak informacji o śmierci. { dokladnosc: "nieznana" } = osoba zmarła, data nieznana. */
  smierc: SchematDaty.optional(),
  ojciecId: Id.nullable(),
  matkaId: Id.nullable(),
  galazId: Id,
  miejsce: z.string().min(1).optional(),
  notatka: z.string().min(1).optional(),
  /** Osoba żyjąca: jej daty, miejsca i notatki publikujemy zgodnie z polityką drzewa (drzewo.json → politykaDatZyjacych). */
  zyjaca: z.boolean().optional(),
  /** Które informacje są w źródle oznaczone jako niepewne ("??", "?"). */
  niepewne: z.array(z.enum(NIEPEWNE_POLA)).optional(),
  /** Numer wiersza w pliku źródłowym drzewa (ustawiany przez import). */
  wierszZrodla: z.number().int().positive().optional(),
});

export const SchematMalzenstwa = z.strictObject({
  osobaAId: Id,
  osobaBId: Id,
  /** Numer związku (1, 2, …) – istotny, gdy któraś z osób miała więcej niż jeden. */
  kolejnosc: z.number().int().positive().default(1),
});

export const SchematGalezi = z.strictObject({
  id: Id,
  nazwa: z.string().min(1),
  kolor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "kolor w formacie #rrggbb"),
  opis: z.string(),
});

export const SchematRodziny = z.strictObject({
  galezie: z.array(SchematGalezi).min(1),
  osoby: z.array(SchematOsoby).min(1),
  malzenstwa: z.array(SchematMalzenstwa),
});

export type DataZdarzenia = z.infer<typeof SchematDaty>;
export type Osoba = z.infer<typeof SchematOsoby>;
export type Malzenstwo = z.infer<typeof SchematMalzenstwa>;
export type Galaz = z.infer<typeof SchematGalezi>;
export type Rodzina = z.infer<typeof SchematRodziny>;
