import fs from "node:fs";
import { describe, expect, it } from "vitest";
import rodzinaZPliku from "../data/rodzina.json";
import { importuj, PLIK_ZRODLA, wczytajPoprawki } from "../scripts/import";

const zrodlo = fs.readFileSync(PLIK_ZRODLA, "utf8");
const poprawki = wczytajPoprawki();
const { rodzina, statystyki, uwagi } = importuj(zrodlo, poprawki);
const poId = new Map(rodzina.osoby.map((o) => [o.id, o]));

describe("import drzewa Lulkiewiczów", () => {
  it("liczba osób zgadza się z liczbą wierszy źródła i wzmianek o małżonkach", () => {
    // Liczenie niezależne od parsera: wiersze z numerem pokolenia + każdy znak „+” (małżonek).
    const wiersze = zrodlo.split("\n").filter((w) => w.trim());
    const zNumerem = wiersze.filter((w) => /^[ |`]*=[a-z]?\d+\s/.test(w) || /^\d+\s/.test(w)).length;
    const malzonkow = (zrodlo.match(/\+/g) ?? []).length;
    // Osoba z odsyłaczem „[n]” powtórzona w kilku wierszach liczy się raz.
    const odsylacze = [...zrodlo.matchAll(/\+\s*(\[\d+\][^+\n]*?)\s{2,}ur\. (\S+)/g)].map((m) => `${m[1]}|${m[2]}`);
    const powtorzone = odsylacze.length - new Set(odsylacze).size;
    const scalenRecznych = (poprawki.scal ?? []).length;

    expect(zNumerem).toBe(303);
    expect(wiersze.length - zNumerem).toBe(1); // tylko „2nd Wife of …”
    expect(rodzina.osoby.length).toBe(zNumerem + malzonkow - powtorzone - scalenRecznych);
    expect(statystyki.osob).toBe(rodzina.osoby.length);
  });

  it("każda osoba poza korzeniem i małżonkami ma rodzica", () => {
    const malzonkowie = new Set(rodzina.malzenstwa.map((m) => m.osobaBId));
    const bezRodzicow = rodzina.osoby.filter((o) => !o.ojciecId && !o.matkaId && !malzonkowie.has(o.id));
    expect(bezRodzicow.map((o) => o.id)).toEqual(["sebastian-lulkiewicz"]);
  });

  it("nie ma cykli – idąc po rodzicach zawsze dochodzimy do korzenia", () => {
    for (const start of rodzina.osoby) {
      const odwiedzone = new Set<string>();
      const kolejka = [start.id];
      while (kolejka.length) {
        const id = kolejka.pop()!;
        expect(odwiedzone.has(id) && id === start.id, `cykl przez ${start.id}`).toBe(false);
        if (odwiedzone.has(id)) continue;
        odwiedzone.add(id);
        const o = poId.get(id)!;
        for (const r of [o.ojciecId, o.matkaId]) {
          if (!r) continue;
          expect(r, `${start.id} jest własnym przodkiem`).not.toBe(start.id);
          kolejka.push(r);
        }
      }
    }
  });

  it("tworzy siedem linii i wspólny pień dla pokoleń 1–2", () => {
    expect(rodzina.galezie.map((g) => g.id)).toEqual(["pien", "antoni", "konstancja", "julian", "jozefa", "wojciech", "filip", "jozef"]);
    expect(rodzina.osoby.filter((o) => o.galazId === "pien").map((o) => o.id)).toEqual([
      "sebastian-lulkiewicz", "anna-lulkiewicz", "wiktor-lulkiewicz-1780", "kungeunda-pernaczynska-1785",
    ]);
    const wiktor = poId.get("wiktor-lulkiewicz-1780")!;
    const dzieci = rodzina.osoby.filter((o) => o.ojciecId === wiktor.id);
    expect(dzieci.map((o) => o.galazId)).toEqual(["antoni", "konstancja", "julian", "jozefa", "wojciech", "filip", "jozef"]);
    expect(new Set(rodzina.galezie.map((g) => g.kolor)).size).toBe(8);
  });

  it("parsuje daty, miejsca, rodziców małżonka i warianty a/b", () => {
    const antoni = poId.get("antoni-lulkiewicz-1807")!;
    expect(antoni.urodzenie).toEqual({ wartosc: "1807", dokladnosc: "okolo" });
    expect(antoni.smierc).toEqual({ wartosc: "1847-08-22", dokladnosc: "dokladna", miejsce: "Kobylin, Polska" });

    const helena = poId.get("helena-galusinska-1806")!;
    expect(helena.notatka).toBe("Ojciec: Leon Galusiński; matka: Barbara Osińska.");
    expect(helena.ojciecId).toBeNull();

    // „zm. Borek” – miejsce bez daty; „zm. ok. 07.03.1885” – przybliżona pełna data.
    expect(poId.get("agnieszka-rybacka-1903")!.smierc).toEqual({ dokladnosc: "nieznana", miejsce: "Borek" });
    expect(poId.get("jozef-buczkiewicz-1885")!.smierc).toEqual({ wartosc: "1885-03-07", dokladnosc: "okolo" });

    // Filip: dzieci „=a4” z Teresą Nowicką, „=b4” z Julianną Skowrońską.
    expect(poId.get("wincenty-lulkiewicz-1846")!.matkaId).toBe("teresa-nowicka-1819");
    expect(poId.get("mateusz-lulkiewicz-1868")!.matkaId).toBe("julianna-skowronska-1827");
    expect(poId.get("mateusz-lulkiewicz-1868")!.ojciecId).toBe("filip-lulkiewicz-1820");
    // Józefa (kobieta) jest matką; ojcowie według wariantu.
    expect(poId.get("tomasz-nypczowski-1842")).toMatchObject({ matkaId: "jozefa-lulkiewicz-1817", ojciecId: "tomasz-nypczowski" });
    expect(poId.get("stanislaw-pyszczorecki-1840")).toMatchObject({ matkaId: "jozefa-lulkiewicz-1817", ojciecId: "laurenty-pyszczorecki-1817" });
  });

  it("zachowuje niepewność wpisów i nie zgaduje drugiego rodzica", () => {
    expect(poId.get("nn-paterek")!.niepewne).toContain("imie");
    expect(poId.get("mikolaj-welzer")!.niepewne).toEqual(["wpis"]);
    expect(poId.get("stanislaw-bystrzynski-1850")!.niepewne).toEqual(["miejsce"]);
    // Krzysztof Zemboldt ma dwa związki, a dzieci nie mają wariantu a/b.
    expect(poId.get("anna-zemboldt-1988")).toMatchObject({ ojciecId: "krzysztof-zemboldt", matkaId: null });
  });

  it("obsługuje wiersz „2nd Wife of Wiktor Lulkiewicz” bez numeru", () => {
    const m = rodzina.malzenstwa.find((x) => x.osobaBId === "koleta-adamczewska-1855")!;
    expect(m).toEqual({ osobaAId: "wiktor-lulkiewicz-1844", osobaBId: "koleta-adamczewska-1855", kolejnosc: 2 });
    // Wiersze pod nim mają numer =4, więc zgodnie z numerem pokolenia są dziećmi Wojciecha (pokolenie 3).
    for (const id of ["agnieszka-lulkiewicz-1845", "antoni-lulkiewicz-1846", "wojciech-lulkiewicz-1848", "jozef-lulkiewicz-1850"]) {
      expect(poId.get(id)).toMatchObject({ ojciecId: "wojciech-lulkiewicz-1819", niepewne: ["rodzice"] });
    }
    expect(uwagi.filter((u) => u.sekcja === "bezNumeru").map((u) => u.wiersz)).toEqual([177, 178, 179, 180, 181]);
  });

  it("scala osobę z odsyłaczem [1] i zgłasza duplikaty oraz utracone polskie znaki", () => {
    const zwiazki = rodzina.malzenstwa.filter((m) => m.osobaBId === "maksymilian-wabinski-1863");
    expect(zwiazki.map((m) => [m.osobaAId, m.kolejnosc])).toEqual([["marianna-lulkiewicz-1866", 1], ["leonarda-lulkiewicz-1881", 2]]);
    const duplikaty = uwagi.filter((u) => u.sekcja === "duplikaty").map((u) => u.wiersz);
    expect(duplikaty).toEqual(expect.arrayContaining([119, 147, 241]));
    const literowki = uwagi.filter((u) => u.sekcja === "literowki");
    expect(literowki.filter((u) => /Łukasz/.test(u.tekst)).map((u) => u.wiersz)).toEqual([65, 269]);
    expect(literowki.map((u) => u.wiersz)).toEqual(expect.arrayContaining([2, 129, 260, 273, 285]));
  });

  it("ukrywa daty osób urodzonych po 1925 r. bez daty śmierci", () => {
    for (const o of rodzina.osoby) {
      const rok = o.urodzenie.wartosc ? Number(o.urodzenie.wartosc.slice(0, 4)) : null;
      expect(!!o.ukryjDaty, o.id).toBe(rok !== null && rok > 1925 && !o.smierc);
    }
    expect(poId.get("kazimiera-pospiech-1928")!.ukryjDaty).toBeUndefined(); // zm. 1995
    expect(poId.get("teresa-rybacka-1931")!.ukryjDaty).toBe(true);
  });

  it("nakłada poprawki ręczne i nie zmienia przy tym id", () => {
    expect(poId.get("aukasz-mocek")).toMatchObject({ imie: "Łukasz", plec: "M" });
    const bez = importuj(zrodlo, {});
    expect(bez.rodzina.osoby.find((o) => o.id === "aukasz-mocek")!.imie).toBe("Aukasz");
    expect(() => importuj(zrodlo, { osoby: { "nie-ma": { imie: "X" } } })).toThrow(/nie ma osoby o id „nie-ma”/);
  });

  it("data/rodzina.json jest aktualny względem źródła i poprawek", () => {
    expect(rodzinaZPliku).toEqual(JSON.parse(JSON.stringify(rodzina)));
  });
});
