import { describe, expect, it } from "vitest";
import { pobierzIndeksSzukania, podsumuj, przygotujDrzewo, type PodsumowanieDrzewa } from "../lib/dane";
import { wczytajDrzewo } from "../lib/drzewa-pliki";
import { przygotujIndeks, szukaj } from "../lib/szukaj";
import { filtrujDrzewa, sortujDrzewa } from "../lib/szukaj-drzew";

describe("wyszukiwarka osób w drzewie", () => {
  it("szuka po imieniu, nazwisku, nazwisku rodowym i roku, bez polskich znaków", async () => {
    const indeks = przygotujIndeks(await pobierzIndeksSzukania("przyklad"));
    const id = (zapytanie: string) => szukaj(indeks, zapytanie).trafienia.map((w) => w.id);
    expect(id("stanislaw")).toContain("stanislaw-przykladowski-1874");
    expect(id("Stanisław Przykładowski")[0]).toBe("stanislaw-przykladowski-1874");
    expect(id("z domu")).toEqual([]);
    expect(id("modelowa")).toContain("helena-przykladowska-1852"); // nazwisko rodowe
    expect(id("1874")).toContain("stanislaw-przykladowski-1874"); // rok urodzenia
    expect(id("1945")).toContain("stanislaw-przykladowski-1874"); // rok śmierci
  });

  it("każde drzewo ma własny indeks – osoby z innego drzewa się nie mieszają", async () => {
    const przyklad = new Set((await pobierzIndeksSzukania("przyklad")).map((w) => w.id));
    const lulkiewicz = new Set((await pobierzIndeksSzukania("lulkiewicz")).map((w) => w.id));
    expect(przyklad.size).toBeGreaterThan(30);
    expect(lulkiewicz.size).toBeGreaterThan(400);
    expect(przyklad.has("sebastian-lulkiewicz")).toBe(false);
    expect(lulkiewicz.has("jan-przykladowski-1822")).toBe(false);
  });

  it("indeks osób żyjących nie zawiera dat ukrytych przez politykę", async () => {
    const indeks = await pobierzIndeksSzukania("lulkiewicz");
    const zyjaca = indeks.find((w) => w.id === "teresa-rybacka")!;
    expect(zyjaca.l).toBe("");
    expect(zyjaca.y).toEqual([]);
  });
});

describe("wyszukiwarka drzew", () => {
  const drzewa: PodsumowanieDrzewa[] = ["lulkiewicz", "przyklad"].map((s) => {
    const { meta, rodzina } = wczytajDrzewo(s);
    return podsumuj(przygotujDrzewo(meta, rodzina));
  });

  it("szuka po nazwie, nazwisku i regionie, ignorując polskie znaki", () => {
    expect(filtrujDrzewa(drzewa, "lulkiewiczow").map((d) => d.meta.slug)).toEqual(["lulkiewicz"]);
    expect(filtrujDrzewa(drzewa, "Rybacka").map((d) => d.meta.slug)).toEqual(["lulkiewicz"]); // nazwisko z drzewa
    expect(filtrujDrzewa(drzewa, "wielkopolska").map((d) => d.meta.slug)).toEqual(["lulkiewicz"]);
    expect(filtrujDrzewa(drzewa, "przykladowski").map((d) => d.meta.slug)).toEqual(["przyklad"]);
    expect(filtrujDrzewa(drzewa, "")).toHaveLength(2);
    expect(filtrujDrzewa(drzewa, "nie ma takiego")).toEqual([]);
  });

  it("sortuje alfabetycznie, według wielkości i według ostatniej aktualizacji", () => {
    expect(sortujDrzewa(drzewa, "najwieksze")[0].meta.slug).toBe("lulkiewicz");
    expect(sortujDrzewa(drzewa, "alfabetycznie").map((d) => d.meta.nazwa)).toEqual(drzewa.map((d) => d.meta.nazwa).sort((a, b) => a.localeCompare(b, "pl")));
    const nowsze = [{ ...drzewa[0], meta: { ...drzewa[0].meta, zaktualizowano: "2020-01-01" } }, { ...drzewa[1], meta: { ...drzewa[1].meta, zaktualizowano: "2026-05-05" } }];
    expect(sortujDrzewa(nowsze, "aktualizacja").map((d) => d.meta.slug)).toEqual([drzewa[1].meta.slug, drzewa[0].meta.slug]);
  });
});

import { drzewaZNazwiskiem, pasujaceNazwiska } from "../lib/szukaj-drzew";

describe("szukanie drzew po nazwisku osób", () => {
  const drzewo = (slug: string, nazwiska: string[]) => ({ meta: { slug, nazwa: slug, region: "", zaktualizowano: "2026-01-01" }, osob: 1, pokolen: 1, galezi: 1, nazwiska }) as never;
  const lista = [drzewo("a", ["Stanisławski", "Lulkiewicz"]), drzewo("b", ["Kowalski"])];

  it("znajduje nazwisko po początku, bez polskich znaków i wielkości liter", () => {
    expect(pasujaceNazwiska(lista[0], "stanislaw")).toEqual(["Stanisławski"]);
    expect(pasujaceNazwiska(lista[0], "ŁULK")).toEqual(["Lulkiewicz"]);
    expect(pasujaceNazwiska(lista[0], "kowal")).toEqual([]);
    expect(pasujaceNazwiska(lista[0], "  ")).toEqual([]);
  });
  it("odpowiada, w ilu drzewach nazwisko występuje", () => {
    expect(drzewaZNazwiskiem(lista, "kowalski")).toHaveLength(1);
    expect(drzewaZNazwiskiem(lista, "nowak")).toHaveLength(0);
  });
});
