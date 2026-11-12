import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { eksportGedcom, eksportJson, importujGedcom, importujJson, importujPlik, nazwaPliku } from "../lib/baza/wymiana";
import type { DaneDb, MetaDb } from "../lib/baza/typy";

const rodzina = JSON.parse(fs.readFileSync("data/drzewa/lulkiewicz/rodzina.json", "utf8")) as DaneDb;
const meta = { nazwa: "Rodzina Lulkiewiczów", opis: "Opis z „cudzysłowem” i ąęłó", region: "Kobylin", widocznosc: "publiczne", politykaDatZyjacych: "ukryj" } as MetaDb;

describe("eksport i import JSON (pełna wierność)", () => {
  it("obieg tam i z powrotem zachowuje dane drzewa Lulkiewiczów co do pola", () => {
    const wynik = importujJson(eksportJson(meta, rodzina, new Date("2026-11-12T10:00:00Z")));
    expect(wynik.dane).toEqual(rodzina);
    expect(wynik.ustawienia).toEqual({ nazwa: meta.nazwa, opis: meta.opis, region: meta.region, widocznosc: "publiczne", politykaDatZyjacych: "ukryj" });
    expect(wynik.ostrzezenia).toEqual([]);
    expect(wynik.dane.osoby.length).toBe(427);
  });

  it("puste drzewo też da się wyeksportować i zaimportować", () => {
    const puste: DaneDb = { galezie: [{ id: "glowna", nazwa: "Główna gałąź", kolor: "#3540d1", opis: "" }], osoby: [], malzenstwa: [] };
    expect(importujJson(eksportJson(meta, puste)).dane).toEqual(puste);
  });

  it("odrzuca: zły JSON, obcy format, nowszą wersję, brak list i niespójne dane", () => {
    expect(() => importujJson("to nie json")).toThrow(/poprawny plik JSON/);
    expect(() => importujJson('{"format":"cos-innego"}')).toThrow(/nie jest plik drzewa/);
    expect(() => importujJson(JSON.stringify({ format: "przodkowie-drzewo", wersja: 99, galezie: [], osoby: [], malzenstwa: [] }))).toThrow(/nowszej wersji/);
    expect(() => importujJson(JSON.stringify({ format: "przodkowie-drzewo", wersja: 1 }))).toThrow(/list osób/);
    const zepsute = JSON.parse(eksportJson(meta, rodzina));
    zepsute.osoby[3].ojciecId = "nie-ma-takiej-osoby";
    expect(() => importujJson(JSON.stringify(zepsute))).toThrow(/brakujący rodzic/);
    const cykl = JSON.parse(eksportJson(meta, rodzina));
    cykl.osoby[0].ojciecId = cykl.osoby[cykl.osoby.length - 1].id;
    expect(() => importujJson(JSON.stringify(cykl))).toThrow(/Cykl/);
  });

  it("ignoruje nieprawidłowe ustawienia z pliku zamiast je przepisywać", () => {
    const j = JSON.parse(eksportJson(meta, rodzina));
    j.drzewo = { nazwa: "x".repeat(500), widocznosc: "wszyscy", politykaDatZyjacych: "pokaz-wszystko", opis: 5 };
    const w = importujJson(JSON.stringify(j));
    expect(w.ustawienia.nazwa?.length).toBe(120);
    expect(w.ustawienia.widocznosc).toBeUndefined();
    expect(w.ustawienia.politykaDatZyjacych).toBeUndefined();
    expect(w.ustawienia.opis).toBeUndefined();
  });
});

describe("eksport i import GEDCOM", () => {
  const ged = eksportGedcom(meta, rodzina, new Date("2026-11-12T10:00:00Z"));
  const wynik = importujGedcom(ged);

  it("plik ma poprawną strukturę GEDCOM 5.5.1 w UTF-8", () => {
    expect(ged.startsWith("0 HEAD\r\n")).toBe(true);
    expect(ged.trimEnd().endsWith("0 TRLR")).toBe(true);
    expect(ged).toContain("1 CHAR UTF-8");
    expect(ged).toContain("2 VERS 5.5.1");
    expect((ged.match(/ INDI\r\n/g) ?? []).length).toBe(427);
    expect(Math.max(...ged.split("\r\n").map((l) => Array.from(l).length))).toBeLessThanOrEqual(215);
  });

  it("obieg zachowuje osoby, imiona, nazwiska (także rodowe), płeć, daty, miejsca i notatki", () => {
    expect(wynik.dane.osoby.length).toBe(rodzina.osoby.length);
    expect(wynik.ostrzezenia).toEqual([]);
    rodzina.osoby.forEach((o, i) => {
      const n = wynik.dane.osoby[i];
      expect([n.imie, n.nazwisko, n.nazwiskoRodowe, n.plec], o.id).toEqual([o.imie, o.nazwisko, o.nazwiskoRodowe, o.plec]);
      expect(n.urodzenie, o.id).toEqual(o.urodzenie);
      expect(n.smierc, o.id).toEqual(o.smierc);
      expect(n.notatka, o.id).toEqual(o.notatka);
      expect(n.miejsce, o.id).toEqual(o.miejsce);
      expect(!!n.zyjaca, o.id).toBe(!!o.zyjaca);
    });
  });

  it("obieg zachowuje rodziców, małżeństwa i kolejność związków", () => {
    const nowyId = new Map(rodzina.osoby.map((o, i) => [o.id, wynik.dane.osoby[i].id]));
    rodzina.osoby.forEach((o, i) => {
      const n = wynik.dane.osoby[i];
      expect(n.ojciecId, o.id).toBe(o.ojciecId ? nowyId.get(o.ojciecId) : null);
      expect(n.matkaId, o.id).toBe(o.matkaId ? nowyId.get(o.matkaId) : null);
    });
    const klucz = (m: { osobaAId: string; osobaBId: string; kolejnosc: number }, mapa?: Map<string, string>) =>
      `${[mapa?.get(m.osobaAId) ?? m.osobaAId, mapa?.get(m.osobaBId) ?? m.osobaBId].sort().join("+")}#${m.kolejnosc}`;
    expect(wynik.dane.malzenstwa.map((m) => klucz(m)).sort()).toEqual(rodzina.malzenstwa.map((m) => klucz(m, nowyId)).sort());
  });

  it("identyfikatory z importu nie zawierają roku urodzenia osób żyjących", () => {
    for (const o of wynik.dane.osoby) if (o.zyjaca && o.urodzenie.wartosc) expect(o.id).not.toContain(o.urodzenie.wartosc.slice(0, 4));
  });

  it("zapisuje długie notatki z wieloma wierszami (CONT/CONC) i znaki specjalne", () => {
    const dane: DaneDb = { galezie: rodzina.galezie.slice(0, 1), malzenstwa: [], osoby: [{ id: "jan", imie: "Jan", nazwisko: "Żółć", plec: "M", urodzenie: { dokladnosc: "nieznana" }, ojciecId: null, matkaId: null, galazId: rodzina.galezie[0].id, notatka: `Pierwszy wiersz z @ małpą\nDrugi wiersz\n\n${"Długi tekst ąę ".repeat(60)}`.trimEnd() }] };
    const g = eksportGedcom(meta, dane);
    expect(g).toContain("CONT");
    expect(g).toContain("CONC");
    expect(g).toContain("@@");
    expect(importujGedcom(g).dane.osoby[0].notatka).toBe(dane.osoby[0].notatka);
  });
});

describe("import GEDCOM z innych programów", () => {
  const plik = [
    "0 HEAD", "1 SOUR Gramps", "1 GEDC", "2 VERS 5.5.1", "1 CHAR UTF-8", "1 FILE Rodzina Wiśniewskich.ged",
    "0 @I1@ INDI", "1 NAME Józef /Wiśniewski/", "1 SEX M", "1 BIRT", "2 DATE 4 MAR 1891", "2 PLAC Kobylin, Wielkopolska, Polska", "1 DEAT", "2 DATE BEF 1960", "1 FAMS @F1@", "1 FAMS @F2@",
    "0 @I2@ INDI", "1 NAME Maria /Nowak/", "2 TYPE birth", "1 NAME Maria /Wiśniewska/", "2 TYPE married", "1 SEX F", "1 BIRT", "2 DATE ABT 1895", "1 DEAT Y", "1 NOTE @N1@", "1 FAMS @F1@",
    "0 @I3@ INDI", "1 NAME Helena /Kowalska/", "1 SEX F", "1 BIRT", "2 DATE MAR 1900", "1 FAMS @F2@",
    "0 @I4@ INDI", "1 NAME Piotr /Wiśniewski/", "1 SEX M", "1 BIRT", "2 DATE 1920", "1 NOTE Pierwszy wiersz", "2 CONT drugi wiersz", "2 CONC  ciąg dalszy", "1 FAMC @F1@",
    "0 @I5@ INDI", "1 NAME /Wiśniewski/", "1 SEX U", "1 BIRT", "2 DATE BET 1925 AND 1930", "1 FAMC @F2@", "1 FAMC @F1@",
    "0 @I6@ INDI", "1 SEX M", "1 FAMC @F9@",
    "0 @I7@ INDI", "1 NAME Adam /Wiśniewski/", "1 SEX M", "1 FAMC @F1@", "1 FAMC @F2@",
    "0 @F1@ FAM", "1 HUSB @I1@", "1 WIFE @I2@", "1 MARR", "1 CHIL @I4@", "1 CHIL @I7@",
    "0 @F2@ FAM", "1 HUSB @I1@", "1 WIFE @I3@", "1 CHIL @I5@", "1 CHIL @I7@", "1 CHIL @I99@",
    "0 @N1@ NOTE Notatka ze wskaźnika", "0 TRLR",
  ].join("\n");

  it("czyta osoby, nazwiska rodowe i zamężne, daty przybliżone, miejsca, notatki i rodziny", () => {
    const w = importujPlik(plik);
    expect(w.format).toBe("gedcom");
    const [jozef, maria, helena, piotr, bezImienia] = w.dane.osoby;
    expect(jozef).toMatchObject({ imie: "Józef", nazwisko: "Wiśniewski", plec: "M", urodzenie: { wartosc: "1891-03-04", dokladnosc: "dokladna", miejsce: "Kobylin, Wielkopolska, Polska" } });
    expect(jozef.smierc).toEqual({ wartosc: "1960", dokladnosc: "okolo" });
    expect(maria).toMatchObject({ imie: "Maria", nazwisko: "Wiśniewska", nazwiskoRodowe: "Nowak", plec: "K", urodzenie: { wartosc: "1895", dokladnosc: "okolo" }, smierc: { dokladnosc: "nieznana" }, notatka: "Notatka ze wskaźnika" });
    expect(helena.urodzenie).toEqual({ wartosc: "1900", dokladnosc: "rok" });
    expect(piotr).toMatchObject({ ojciecId: jozef.id, matkaId: maria.id, notatka: "Pierwszy wiersz\ndrugi wiersz ciąg dalszy", urodzenie: { wartosc: "1920", dokladnosc: "rok" } });
    expect(bezImienia).toMatchObject({ imie: "", nazwisko: "Wiśniewski", ojciecId: jozef.id, matkaId: helena.id, plec: "nieznana" });
    expect(w.dane.malzenstwa).toEqual([
      { osobaAId: jozef.id, osobaBId: maria.id, kolejnosc: 1 },
      { osobaAId: jozef.id, osobaBId: helena.id, kolejnosc: 2 },
    ]);
    expect(w.ustawienia.nazwa).toBe("Rodzina Wiśniewskich");
  });

  it("ostrzega o uproszczonych datach, osobach w kilku rodzinach i brakujących odwołaniach", () => {
    const o = importujPlik(plik).ostrzezenia.join(" | ");
    expect(o).toMatch(/dat zapisanych w sposób/);
    expect(o).toMatch(/kilku rodzin/);
    expect(o).toMatch(/odwołań do osób, których nie ma w pliku/);
    expect(o).toMatch(/nie miało imienia ani nazwiska/);
  });

  it("odrzuca pliki bez osób, z nieczytelnym kodowaniem i w nieznanym formacie", () => {
    expect(() => importujGedcom("0 HEAD\n0 TRLR")).toThrow(/nie znaleziono żadnych osób/);
    expect(() => importujGedcom("0 HEAD\n0 @I1@ INDI\n1 NAME J�zef /Kowal/")).toThrow(/UTF-8/);
    expect(() => importujPlik("jakis tekst")).toThrow(/Nie rozpoznano formatu/);
  });

  it("wykrywa cykl w rodzinach z pliku zamiast zapisać zepsute drzewo", () => {
    const cykl = ["0 HEAD", "0 @I1@ INDI", "1 NAME A /X/", "0 @I2@ INDI", "1 NAME B /X/", "0 @F1@ FAM", "1 HUSB @I1@", "1 CHIL @I2@", "0 @F2@ FAM", "1 HUSB @I2@", "1 CHIL @I1@", "0 TRLR"].join("\n");
    expect(() => importujGedcom(cykl)).toThrow(/Cykl/);
  });
});

describe("nazwa pliku", () => {
  it("jest bezpieczna i zawiera datę", () => {
    expect(nazwaPliku("Rodzina Żółć-Nowak / „test”", "json", new Date("2026-11-12T10:00:00Z"))).toBe("przodkowie-rodzina-zolc-nowak-test-2026-11-12.json");
    expect(nazwaPliku("???", "ged", new Date("2026-01-02T00:00:00Z"))).toBe("przodkowie-drzewo-2026-01-02.ged");
  });
});
