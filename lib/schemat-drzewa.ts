import { z } from "zod";

z.config(z.locales.pl());

/** Slug drzewa: część adresu (/drzewa/<slug>/), małe litery bez polskich znaków, cyfry i łączniki. */
export const Slug = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug może zawierać tylko małe litery a–z, cyfry i łączniki (np. rodzina-kowalskich)");

/** Jak publikujemy dane osób żyjących: ukryj = tylko imię i nazwisko, tylko-rok = rok urodzenia, pokaz = wszystko. */
export const POLITYKI_DAT = ["ukryj", "tylko-rok", "pokaz"] as const;
export type PolitykaDat = (typeof POLITYKI_DAT)[number];

export const SchematDrzewa = z
  .strictObject({
    slug: Slug,
    nazwa: z.string().min(1),
    opis: z.string().min(1),
    zakresLat: z.strictObject({ od: z.number().int().min(1000).max(2200), do: z.number().int().min(1000).max(2200) }),
    region: z.string().min(1),
    zrodlo: z.strictObject({ nazwa: z.string().min(1), url: z.url() }).optional(),
    autor: z.strictObject({ nazwa: z.string().min(1), url: z.url().optional() }),
    /** Data ostatniej aktualizacji danych, RRRR-MM-DD. */
    zaktualizowano: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data w formacie RRRR-MM-DD"),
    widocznosc: z.enum(["publiczne", "prywatne"]),
    politykaDatZyjacych: z.enum(POLITYKI_DAT).default("ukryj"),
    /** Drzewo fikcyjne, pokazywane z wyraźnym oznaczeniem. */
    przykladowe: z.boolean().optional(),
    /** Czy pokazać na stronie głównej. */
    wyrozniane: z.boolean().optional(),
    /** Kopia źródłowa w repozytorium, która NIE jest publikowana na stronie (np. drzewo przeniesione do bazy albo dane testowe). */
    archiwalne: z.boolean().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.zakresLat.od > d.zakresLat.do) ctx.addIssue({ code: "custom", path: ["zakresLat"], message: '"od" nie może być późniejsze niż "do"' });
    const data = new Date(d.zaktualizowano + "T00:00:00Z");
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== d.zaktualizowano) {
      ctx.addIssue({ code: "custom", path: ["zaktualizowano"], message: `niepoprawna data "${d.zaktualizowano}"` });
    }
  });

export type DrzewoMeta = z.infer<typeof SchematDrzewa>;
