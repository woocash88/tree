import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { daneWidoku, przygotujDrzewo } from "../lib/dane";
import { wczytajDrzewo } from "../lib/drzewa-pliki";
import { lasGalezi } from "../lib/drzewo";
import { naPanelu, noweId, parsujDate, PUSTE_EDYCJE, tekstDaty, zastosujPatch } from "../lib/edycje";
import { CALE_DRZEWO, galezieWidoku, idWidoku } from "../lib/galezie";
import { importuj, sciezkiImportu, wczytajPoprawki } from "../scripts/import";
import { zastosujEdycje } from "../scripts/zastosuj-edycje";

const przyklad = wczytajDrzewo("przyklad");
const dane = daneWidoku(przygotujDrzewo(przyklad.meta, przyklad.rodzina));

describe("daty z formularza", () => {
  it("rozumie rok, pełną datę w dwóch zapisach, „ok.”, „?” i miejsce", () => {
    expect(parsujDate("1891")).toEqual({ ok: true, data: { wartosc: "1891", dokladnosc: "rok" } });
    expect(parsujDate("4.03.1891")).toEqual({ ok: true, data: { wartosc: "1891-03-04", dokladnosc: "dokladna" } });
    expect(parsujDate("1891-03-04, Kobylin")).toEqual({ ok: true, data: { wartosc: "1891-03-04", dokladnosc: "dokladna", miejsce: "Kobylin" } });
    expect(parsujDate("ok. 1560")).toEqual({ ok: true, data: { wartosc: "1560", dokladnosc: "okolo" } });
    expect(parsujDate("?")).toEqual({ ok: true, data: { dokladnosc: "nieznana" } });
    expect(parsujDate("  ")).toEqual({ ok: true, data: null });
  });

  it("odrzuca nieistniejące daty i śmieci", () => {
    expect(parsujDate("31.02.1891").ok).toBe(false);
    expect(parsujDate("wczoraj").ok).toBe(false);
    expect(parsujDate("12").ok).toBe(false);
  });

  it("tekst z pola można wczytać z powrotem (zapis → odczyt)", () => {
    for (const t of ["1891", "4.03.1891, Kobylin", "ok. 1560", "?"]) {
      const w = parsujDate(t);
      expect(w.ok && tekstDaty(w.data)).toBe(t);
    }
  });
});

describe("nakładanie edycji na osoby", () => {
  const stanislaw = dane.osoby.find((o) => o.id === "stanislaw-przykladowski-1874")!;

  it("zmiana nazwiska i dat przelicza lata życia i wiek, nie ruszając innych osób", () => {
    const wynik = naPanelu(dane.osoby, {
      osoby: { [stanislaw.id]: { nazwisko: "Nowy", urodzenie: { wartosc: "1870", dokladnosc: "rok" }, smierc: { wartosc: "1940", dokladnosc: "rok" } } },
      dodane: [],
    });
    const o = wynik.find((x) => x.id === stanislaw.id)!;
    expect(o.nazwisko).toBe("Nowy");
    expect(o.lata).toBe("1870–1940");
    expect(o.wiek).toBe("ok. 70 lat");
    expect(wynik.find((x) => x.id === "piotr-przykladowski-1848")).toBe(dane.osoby.find((x) => x.id === "piotr-przykladowski-1848"));
  });

  it("bez edycji zwraca te same dane", () => {
    expect(naPanelu(dane.osoby, PUSTE_EDYCJE)).toBe(dane.osoby);
  });

  it("dodane dziecko trafia pod rodziców i dostaje kolejne pokolenie", () => {
    const id = noweId("Nowy", "Przykładowski", 2024, new Set(dane.osoby.map((o) => o.id)));
    expect(id).toBe("nowy-przykladowski-2024");
    const edycje = { osoby: {}, dodane: [{ id, imie: "Nowy", nazwisko: "Przykładowski", plec: "M" as const, urodzenie: { wartosc: "2024", dokladnosc: "rok" as const }, ojciecId: "marek-przykladowski-1935", matkaId: "barbara-przykladowska-1938", galazId: "przykladowscy" }] };
    const osoby = naPanelu(dane.osoby, edycje);
    expect(osoby.find((o) => o.id === id)!.pokolenie).toBe(6);
    const { las } = lasGalezi(osoby, dane.pary, "przykladowscy");
    expect(las.jednostki.get("marek-przykladowski-1935")!.dzieci).toContain(id);
  });

  it("ręcznie wpisane imię usuwa znacznik niepewności „?”", () => {
    const o = { ...przyklad.rodzina.osoby[0], niepewne: ["imie" as const, "miejsce" as const] };
    expect(zastosujPatch(o, { imie: "Jan" }).niepewne).toEqual(["miejsce"]);
    expect(zastosujPatch({ ...o, niepewne: ["imie" as const] }, { imie: "Jan" }).niepewne).toBeUndefined();
    const panel = dane.osoby.map((x) => ({ ...x, niepewna: true }));
    expect(naPanelu(panel, { osoby: { [stanislaw.id]: { imie: "Stach" } }, dodane: [] }).find((x) => x.id === stanislaw.id)!.niepewna).toBe(false);
  });

  it("id nowej osoby jest unikalne", () => {
    expect(noweId("Jan", "Kowalski", 1900, new Set(["jan-kowalski-1900"]))).toBe("jan-kowalski-1900-2");
  });

  it("zastosujPatch usuwa pola ustawione na null", () => {
    const o = przyklad.rodzina.osoby.find((x) => x.id === "stanislaw-przykladowski-1874")!;
    expect(o.notatka).toBeDefined();
    expect(zastosujPatch(o, { notatka: null, imie: "Stach" })).toMatchObject({ imie: "Stach", id: o.id });
    expect("notatka" in zastosujPatch(o, { notatka: null })).toBe(false);
  });
});

describe("wspólny pień i „Całe drzewo”", () => {
  const lul = wczytajDrzewo("lulkiewicz");
  const d = przygotujDrzewo(lul.meta, lul.rodzina);

  it("pień wspólny prowadzi do widoku całego drzewa i nie jest osobną gałęzią w wyborze", () => {
    const pien = d.galezieLista.find((g) => g.wspolna)!;
    expect(idWidoku(pien)).toBe("cale");
    const wybor = galezieWidoku(d.galezieLista);
    expect(wybor[0]).toBe(CALE_DRZEWO);
    expect(wybor.some((g) => g.wspolna)).toBe(false);
    expect(wybor).toHaveLength(d.galezieLista.length); // pień zastąpiony przez „Całe drzewo”
  });

  it("widok „Całe drzewo” zaczyna od jednego korzenia i obejmuje osoby ze wszystkich gałęzi", () => {
    const w = daneWidoku(d);
    const { las, korzenie, maxPoziomow } = lasGalezi(w.osoby, w.pary, "cale");
    expect(korzenie).toEqual(["sebastian-lulkiewicz"]);
    expect(maxPoziomow).toBe(10);
    expect(las.jednostkaOsoby.has("bartosz-gorynia")).toBe(true);
  });
});

describe("stosowanie edycji do danych", () => {
  const zrodlo = fs.readFileSync(sciezkiImportu("lulkiewicz").zrodlo, "utf8");

  it("import dopisuje osoby z pola „dodane” i zgłasza zduplikowane id", () => {
    const dziecko = { id: "ewa-nowa-2020", imie: "Ewa", nazwisko: "Nowa", plec: "K" as const, urodzenie: { wartosc: "2020", dokladnosc: "rok" as const }, ojciecId: "bartosz-gorynia", matkaId: null, galazId: "antoni" };
    const wynik = importuj(zrodlo, { ...wczytajPoprawki("lulkiewicz"), dodane: [dziecko] });
    expect(wynik.rodzina.osoby.find((o) => o.id === dziecko.id)).toMatchObject({ ojciecId: "bartosz-gorynia" });
    expect(() => importuj(zrodlo, { dodane: [dziecko, dziecko] })).toThrow(/już istnieje/);
  });

  const sprzatanie: string[] = [];
  afterEach(() => {
    delete process.env.DRZEWA_KATALOG;
    while (sprzatanie.length) fs.rmSync(sprzatanie.pop()!, { recursive: true, force: true });
  });

  it("skrypt zapisuje zmiany w rodzina.json drzewa bez importu i poszerza zakres lat", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "drzewa-"));
    sprzatanie.push(tmp);
    fs.mkdirSync(path.join(tmp, "przyklad"));
    for (const plik of ["drzewo.json", "rodzina.json"]) fs.copyFileSync(path.resolve("data/drzewa/przyklad", plik), path.join(tmp, "przyklad", plik));
    process.env.DRZEWA_KATALOG = tmp;
    const wynik = zastosujEdycje("przyklad", {
      slug: "przyklad",
      osoby: { "jan-przykladowski-1822": { imie: "Jan Maria", smierc: null } },
      dodane: [{ id: "maly-2030", imie: "Mały", nazwisko: "Przykładowski", plec: "M", urodzenie: { wartosc: "2030", dokladnosc: "rok" }, ojciecId: "andrzej-przykladowski", matkaId: null, galazId: "przykladowscy" }],
    });
    expect(wynik.osob).toBe(przyklad.rodzina.osoby.length + 1);
    const po = wczytajDrzewo("przyklad");
    expect(po.rodzina.osoby.find((o) => o.id === "jan-przykladowski-1822")).toMatchObject({ imie: "Jan Maria" });
    expect(po.rodzina.osoby.find((o) => o.id === "jan-przykladowski-1822")!.smierc).toBeUndefined();
    expect(po.meta.zakresLat.do).toBe(2030);
    expect(() => zastosujEdycje("przyklad", { slug: "inny", osoby: {}, dodane: [] })).toThrow(/dotyczy drzewa/);
  });
});
