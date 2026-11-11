import { describe, expect, it } from "vitest";
import { okroj, przygotujDrzewo } from "../lib/dane";
import { BladDrzewa, listaSlugow, walidujMeta, wczytajDrzewo } from "../lib/drzewa-pliki";
import { lataZycia } from "../lib/format";
import type { Osoba, Rodzina } from "../lib/schemat";
import { SchematDrzewa } from "../lib/schemat-drzewa";

const meta = (nad: Record<string, unknown> = {}) => ({
  slug: "test",
  nazwa: "Rodzina testowa",
  opis: "Opis.",
  zakresLat: { od: 1800, do: 2000 },
  region: "Gdzieś",
  zrodlo: { nazwa: "Źródło", url: "https://example.org/zrodlo" },
  autor: { nazwa: "Ktoś" },
  zaktualizowano: "2026-01-31",
  widocznosc: "publiczne",
  ...nad,
});

describe("metadane drzewa (drzewo.json)", () => {
  it("przyjmuje poprawne metadane i domyślnie ukrywa dane osób żyjących", () => {
    const m = walidujMeta(meta(), "test");
    expect(m.politykaDatZyjacych).toBe("ukryj");
  });

  it("odrzuca zły slug, nieistniejącą datę, odwrócony zakres lat i nieznane pola", () => {
    const blad = (nad: Record<string, unknown>) => {
      try {
        walidujMeta(meta(nad), "test");
      } catch (e) {
        if (e instanceof BladDrzewa) return e.bledy.join("\n");
        throw e;
      }
      return "";
    };
    expect(blad({ slug: "Zły Slug" })).toMatch(/slug/);
    expect(blad({ zaktualizowano: "2026-02-31" })).toMatch(/niepoprawna data/);
    expect(blad({ zakresLat: { od: 2000, do: 1900 } })).toMatch(/zakresLat/);
    expect(blad({ politykaDatZyjacych: "pokaz-wszystko" })).toMatch(/politykaDatZyjacych/);
    expect(blad({ widocznosc: "prywatne" })).toMatch(/widocznosc/);
    expect(blad({ cos: 1 })).toMatch(/cos/);
  });

  it("slug w pliku musi zgadzać się z nazwą katalogu, a błąd wskazuje drzewo", () => {
    expect(() => walidujMeta(meta(), "inny-katalog")).toThrow(/Drzewo „inny-katalog”/);
    expect(() => walidujMeta(meta(), "inny-katalog")).toThrow(/nie zgadza się z nazwą katalogu/);
  });
});

describe("drzewa w repozytorium", () => {
  const slugi = listaSlugow();

  it("są co najmniej dwa drzewa, w tym przykładowe", () => {
    expect(slugi).toEqual(expect.arrayContaining(["lulkiewicz", "przyklad"]));
  });

  it("slugi są unikalne i zgodne ze schematem", () => {
    const zMeta = slugi.map((s) => wczytajDrzewo(s).meta.slug);
    expect(new Set(zMeta).size).toBe(zMeta.length);
    expect(zMeta).toEqual(slugi);
    for (const s of slugi) expect(SchematDrzewa.shape.slug.safeParse(s).success, s).toBe(true);
  });

  it("każde drzewo przechodzi walidację danych, a identyfikatory osób są unikalne w jego obrębie", () => {
    for (const s of slugi) {
      const { rodzina } = wczytajDrzewo(s);
      const ids = rodzina.osoby.map((o) => o.id);
      expect(new Set(ids).size, s).toBe(ids.length);
    }
  });

  it("drzewo przykładowe ma ok. 40 osób, 5 pokoleń i 2 gałęzie oraz jest oznaczone jako fikcyjne", () => {
    const { meta: m, rodzina } = wczytajDrzewo("przyklad");
    const d = przygotujDrzewo(m, rodzina);
    expect(m.przykladowe).toBe(true);
    expect(d.statystyki.osob).toBeGreaterThanOrEqual(38);
    expect(d.statystyki.osob).toBeLessThanOrEqual(45);
    expect(d.statystyki.pokolen).toBe(5);
    expect(d.galezieLista).toHaveLength(2);
  });

  it("zakres lat w drzewo.json obejmuje wszystkie lata z danych", () => {
    for (const s of slugi) {
      const { meta: m, rodzina } = wczytajDrzewo(s);
      const lata = rodzina.osoby.flatMap((o) => [o.urodzenie.wartosc, o.smierc?.wartosc]).filter((w): w is string => !!w).map((w) => Number(w.slice(0, 4)));
      expect(Math.min(...lata), s).toBeGreaterThanOrEqual(m.zakresLat.od);
      expect(Math.max(...lata), s).toBeLessThanOrEqual(m.zakresLat.do);
    }
  });
});

describe("polityka dat osób żyjących", () => {
  const zyjaca: Osoba = {
    id: "ewa-nowak",
    imie: "Ewa",
    nazwisko: "Nowak",
    plec: "K",
    urodzenie: { wartosc: "1953-03-04", dokladnosc: "dokladna", miejsce: "Poznań" },
    ojciecId: null,
    matkaId: null,
    galazId: "g",
    miejsce: "Gdańsk",
    notatka: "Prywatna notatka.",
    zyjaca: true,
  };
  const zmarla: Osoba = { ...zyjaca, id: "anna-nowak-1900", imie: "Anna", zyjaca: undefined, urodzenie: { wartosc: "1900-01-02", dokladnosc: "dokladna" }, smierc: { wartosc: "1980", dokladnosc: "rok" } };

  it("„ukryj” zostawia tylko imię i nazwisko", () => {
    const o = okroj(zyjaca, "ukryj");
    expect(o.ukryjDaty).toBe(true);
    expect(o.urodzenie).toEqual({ dokladnosc: "nieznana" });
    expect(o.miejsce).toBeUndefined();
    expect(o.notatka).toBeUndefined();
    expect(lataZycia(o)).toBe("");
  });

  it("„tylko-rok” pokazuje sam rok urodzenia, bez miejsc i notatek", () => {
    const o = okroj(zyjaca, "tylko-rok");
    expect(o.ukryjDaty).toBeUndefined();
    expect(o.urodzenie).toEqual({ wartosc: "1953", dokladnosc: "rok" });
    expect(o.miejsce).toBeUndefined();
    expect(o.notatka).toBeUndefined();
    expect(lataZycia(o)).toBe("ur. 1953");
  });

  it("„pokaz” nie zmienia danych", () => {
    expect(okroj(zyjaca, "pokaz")).toEqual(zyjaca);
  });

  it("osoby zmarłe nigdy nie są okrajane", () => {
    for (const p of ["ukryj", "tylko-rok", "pokaz"] as const) expect(okroj(zmarla, p)).toEqual(zmarla);
  });

  it("polityka drzewa wpływa na wszystkie osoby żyjące, a identyfikatory nie zdradzają roku", () => {
    const rodzina: Rodzina = { galezie: [{ id: "g", nazwa: "G", kolor: "#3b82f6", opis: "" }], osoby: [zmarla, zyjaca], malzenstwa: [] };
    const d = przygotujDrzewo(meta({ politykaDatZyjacych: "ukryj" }) as never, rodzina);
    expect(d.osoby.get("ewa-nowak")!.ukryjDaty).toBe(true);
    expect(d.osoby.get("anna-nowak-1900")!.ukryjDaty).toBeUndefined();
    expect(d.osoby.get("ewa-nowak")!.id).not.toContain("1953");
  });
});
