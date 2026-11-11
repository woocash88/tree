import { describe, expect, it } from "vitest";
import { przygotujDrzewo, daneWidoku } from "../lib/dane";
import { wczytajDrzewo } from "../lib/drzewa-pliki";
import { lasGalezi, przodkowieJednostki, rozwinDoPoziomu, wWidoku } from "../lib/drzewo";
import { dekodujRozwiniecie, kodujRozwiniecie, zbudujWiersze } from "../lib/lista";

const { meta, rodzina } = wczytajDrzewo("przyklad");
const drzewo = przygotujDrzewo(meta, rodzina);
const { osoby, pary } = daneWidoku(drzewo);
const { las, korzenie, maxPoziomow } = lasGalezi(osoby, pary, "przykladowscy");

describe("lista gałęzi (outline)", () => {
  it("zaczyna od jednego korzenia i ma tyle poziomów, ile pokoleń gałęzi", () => {
    expect(korzenie).toEqual(["jan-przykladowski-1822"]);
    expect(maxPoziomow).toBe(5);
  });

  it("domyślnie pokazuje 3 pokolenia, z wcięciem równym głębokości", () => {
    const wiersze = zbudujWiersze(las, korzenie, rozwinDoPoziomu(las, korzenie, 3));
    expect(Math.max(...wiersze.map((w) => w.poziom))).toBe(2);
    expect(wiersze[0]).toMatchObject({ id: "jan-przykladowski-1822", poziom: 0, rozwiniety: true, maDzieci: true });
    // dzieci Jana: Piotr, Józef, Anna – w kolejności z pliku
    expect(wiersze.filter((w) => w.poziom === 1).map((w) => w.id)).toEqual(["piotr-przykladowski-1848", "jozef-przykladowski-1855", "anna-przykladowska-1851"]);
  });

  it("zaznacza ostatnie dziecko każdego rodzica (do rysowania linii łączących)", () => {
    const wiersze = zbudujWiersze(las, korzenie, rozwinDoPoziomu(las, korzenie, 3));
    const poId = new Map(wiersze.map((w) => [w.id, w]));
    expect(poId.get("jan-przykladowski-1822")!.ostatni).toEqual([]);
    expect(poId.get("piotr-przykladowski-1848")!.ostatni).toEqual([false]);
    expect(poId.get("anna-przykladowska-1851")!.ostatni).toEqual([true]);
    expect(poId.get("wanda-przykladowska-1877")!.ostatni).toEqual([false, true]); // ostatnie dziecko Piotra
    expect(poId.get("stanislaw-przykladowski-1874")!.ostatni).toEqual([false, false]);
  });

  it("przy węzłach zwiniętych podaje licznik potomków (z małżonkami), a małżonków w jednym wierszu", () => {
    const wiersze = zbudujWiersze(las, korzenie, rozwinDoPoziomu(las, korzenie, 1));
    expect(wiersze).toHaveLength(1);
    expect(wiersze[0]).toMatchObject({ rozwiniety: false, maDzieci: true });
    expect(wiersze[0].malzonkowie).toEqual([{ id: "maria-przykladowska-1826", kolejnosc: 1, odsylacz: false }]);
    // gałąź ma 25 osób: korzeń z żoną + 23 potomków (z małżonkami)
    expect(wiersze[0].potomkow).toBe(23);
  });

  it("zwijanie jednostki ukrywa cały jej potomstwo", () => {
    const wszystko = rozwinDoPoziomu(las, korzenie, maxPoziomow);
    const pelna = zbudujWiersze(las, korzenie, wszystko);
    const bezPiotra = new Set(wszystko);
    bezPiotra.delete("piotr-przykladowski-1848");
    const zwinieta = zbudujWiersze(las, korzenie, bezPiotra);
    expect(pelna.length - zwinieta.length).toBe(jednostekPotomnych("piotr-przykladowski-1848"));
  });

  it("wiersze są kompletne po rozwinięciu wszystkiego: jedna jednostka na osobę z rodu", () => {
    const pelna = zbudujWiersze(las, korzenie, rozwinDoPoziomu(las, korzenie, maxPoziomow));
    const zRodu = osoby.filter((o) => o.galazId === "przykladowscy" && (o.ojciecId || o.matkaId || korzenie.includes(o.id)));
    expect(pelna.map((w) => w.id).sort()).toEqual(zRodu.map((o) => o.id).sort());
  });

  it("zna ścieżkę przodków i rozpoznaje, czy osoba jest w widoku gałęzi", () => {
    const j = las.jednostkaOsoby.get("marek-przykladowski-1935")!;
    expect(przodkowieJednostki(las, j)).toEqual(["tadeusz-przykladowski-1903", "stanislaw-przykladowski-1874", "piotr-przykladowski-1848", "jan-przykladowski-1822"]);
    expect(wWidoku(las, korzenie, j)).toBe(true);
    const inna = lasGalezi(osoby, pary, "wzorowscy");
    expect(wWidoku(inna.las, inna.korzenie, j)).toBe(false);
  });
});

/** Liczba jednostek (wierszy) w poddrzewie, bez samej jednostki. */
function jednostekPotomnych(id: string): number {
  return las.jednostki.get(id)!.dzieci.reduce((suma, d) => suma + 1 + jednostekPotomnych(d), 0);
}

describe("widok gałęzi w drzewie z wieloma liniami (Lulkiewiczowie)", () => {
  const lul = wczytajDrzewo("lulkiewicz");
  const dane = daneWidoku(przygotujDrzewo(lul.meta, lul.rodzina));
  const pien = lasGalezi(dane.osoby, dane.pary, "pien");
  const antoni = lasGalezi(dane.osoby, dane.pary, "antoni");

  it("potomek z innej gałęzi nie należy do widoku wspólnego pnia, mimo że jego przodkowie tak", () => {
    const j = pien.las.jednostkaOsoby.get("bartosz-gorynia")!;
    expect(wWidoku(pien.las, pien.korzenie, j)).toBe(false);
    expect(wWidoku(antoni.las, antoni.korzenie, j)).toBe(true);
  });

  it("widok gałęzi zawiera tylko jej własne osoby", () => {
    const wiersze = zbudujWiersze(antoni.las, antoni.korzenie, rozwinDoPoziomu(antoni.las, antoni.korzenie, antoni.maxPoziomow));
    const galezie = new Set(wiersze.map((w) => dane.osoby.find((o) => o.id === w.id)!.galazId));
    expect([...galezie]).toEqual(["antoni"]);
    expect(antoni.maxPoziomow).toBe(8);
  });
});

describe("stan rozwinięcia w adresie", () => {
  it("domyślny stan nie wymaga parametru", () => {
    expect(kodujRozwiniecie(las, korzenie, rozwinDoPoziomu(las, korzenie, 3), 3)).toBe("");
  });

  it("koduje poziom i ręczne odstępstwa, a dekodowanie odtwarza ten sam stan", () => {
    const stan = rozwinDoPoziomu(las, korzenie, 2);
    stan.add("stanislaw-przykladowski-1874");
    stan.delete("jan-przykladowski-1822");
    const kod = kodujRozwiniecie(las, korzenie, stan, 2);
    expect(kod).toBe("2,+stanislaw-przykladowski-1874,-jan-przykladowski-1822");
    const { rozwiniete, poziomy } = dekodujRozwiniecie(las, korzenie, kod, maxPoziomow);
    expect(poziomy).toBe(2);
    expect([...rozwiniete].sort()).toEqual([...stan].sort());
  });

  it("ignoruje śmieci w parametrze", () => {
    const { rozwiniete, poziomy } = dekodujRozwiniecie(las, korzenie, "99,+nie-ma,-,?,", maxPoziomow);
    expect(poziomy).toBe(maxPoziomow);
    expect(rozwiniete.has("nie-ma")).toBe(false);
  });
});
