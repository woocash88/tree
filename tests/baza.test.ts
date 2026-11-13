import { describe, expect, it } from "vitest";
import * as L from "../lib/baza/logika";
import type { NowaOsoba } from "../lib/edycje";
import { MAKS_DZIECI, MAKS_MALZONKOW, MAKS_OSOB, MAKS_RODZENSTWA } from "../lib/baza/typy";

const osoba = (id: string, extra: Partial<NowaOsoba> = {}): NowaOsoba => ({
  id,
  imie: id,
  nazwisko: "Kowalski",
  plec: "M",
  urodzenie: { dokladnosc: "nieznana" },
  ojciecId: null,
  matkaId: null,
  galazId: "glowna",
  ...extra,
});

const zaczynajac = () => L.dodajOsobe(osoba("jan", { urodzenie: { wartosc: "1900", dokladnosc: "rok" }, smierc: { wartosc: "1970", dokladnosc: "rok" } }))(L.pusteDane());

describe("zmiany w drzewie użytkownika", () => {
  it("pierwsza osoba trafia do domyślnej gałęzi, a puste drzewo jest poprawne", () => {
    expect(() => L.sprawdzDane(L.pusteDane())).not.toThrow();
    const d = zaczynajac();
    expect(d.osoby).toHaveLength(1);
    expect(d.osoby[0].galazId).toBe("glowna");
    expect(() => L.sprawdzDane(d)).not.toThrow();
  });

  it("dodaje małżonka z numerem związku, dziecko i rodzica z automatycznym małżeństwem", () => {
    let d = zaczynajac();
    d = L.dodajMalzonka("jan", osoba("anna", { plec: "K" }))(d);
    d = L.dodajMalzonka("jan", osoba("ewa", { plec: "K" }))(d);
    expect(d.malzenstwa.map((m) => [m.osobaBId, m.kolejnosc])).toEqual([["anna", 1], ["ewa", 2]]);

    d = L.dodajOsobe(osoba("piotr", { ojciecId: "jan", matkaId: "anna" }))(d);
    L.sprawdzDane(d);
  });

  it("dodanie rodzica łączy go małżeństwem z drugim rodzicem i nie nadpisuje zajętego miejsca", () => {
    let d = L.dodajOsobe(osoba("dziecko", { matkaId: null }))(L.pusteDane());
    d = L.dodajRodzica("dziecko", "matka", osoba("mama", { plec: "K" }))(d);
    d = L.dodajRodzica("dziecko", "ojciec", osoba("tata"))(d);
    expect(d.osoby.find((o) => o.id === "dziecko")).toMatchObject({ ojciecId: "tata", matkaId: "mama" });
    expect(d.malzenstwa).toEqual([{ osobaAId: "mama", osobaBId: "tata", kolejnosc: 1 }]);
    expect(() => L.dodajRodzica("dziecko", "ojciec", osoba("inny"))(d)).toThrow(/ma już wpisanego/);
    L.sprawdzDane(d);
  });

  it("odrzuca duplikat id, nieistniejącą osobę i przekroczenie limitu", () => {
    const d = zaczynajac();
    expect(() => L.dodajOsobe(osoba("jan"))(d)).toThrow(/już istnieje/);
    expect(() => L.dodajMalzonka("nie-ma", osoba("x"))(d)).toThrow(/już nie istnieje/);
    expect(() => L.zapiszOsobe("nie-ma", { imie: "X" })(d)).toThrow(/już nie istnieje/);
    const duzo = { ...d, osoby: Array.from({ length: MAKS_OSOB }, (_, i) => osoba(`o${i}`)) as never };
    expect(() => L.dodajOsobe(osoba("jeszcze-jedna"))(duzo)).toThrow(/najwyżej/);
  });

  it("usunięcie osoby czyści małżeństwa i odwołania dzieci, zostawiając poprawne dane", () => {
    let d = zaczynajac();
    d = L.dodajMalzonka("jan", osoba("anna", { plec: "K" }))(d);
    d = L.dodajOsobe(osoba("piotr", { ojciecId: "jan", matkaId: "anna" }))(d);
    d = L.usunOsobe("jan")(d);
    expect(d.malzenstwa).toEqual([]);
    expect(d.osoby.find((o) => o.id === "piotr")).toMatchObject({ ojciecId: null, matkaId: "anna" });
    expect(L.osieroceni(L.dodajOsobe(osoba("x", { ojciecId: "anna" }))(d), "anna")).toEqual(["piotr", "x"]);
    L.sprawdzDane(d);
  });

  it("edycja osoby: płeć, flaga żyjąca i usuwanie pól opcjonalnych", () => {
    let d = L.dodajOsobe(osoba("jan", { notatka: "n", nazwiskoRodowe: "Z" }))(L.pusteDane());
    d = L.zapiszOsobe("jan", { plec: "K", zyjaca: true, notatka: null, nazwiskoRodowe: null })(d);
    expect(d.osoby[0]).toMatchObject({ plec: "K", zyjaca: true });
    expect("notatka" in d.osoby[0]).toBe(false);
    d = L.zapiszOsobe("jan", { zyjaca: null })(d);
    expect("zyjaca" in d.osoby[0]).toBe(false);
  });
});

describe("limity bliskich dodawanych z widoku osoby", () => {
  it("rodzeństwo dostaje rodziców wskazanej osoby, a bez rodzica nie da się go dodać", () => {
    let d = zaczynajac();
    expect(() => L.dodajRodzenstwo("jan", osoba("brat"))(d)).toThrow(/najpierw dodaj rodzica/);
    d = L.dodajRodzica("jan", "ojciec", osoba("ojciec"))(d);
    d = L.dodajRodzenstwo("jan", osoba("brat"))(d);
    const brat = d.osoby.find((o) => o.id === "brat")!;
    expect(brat).toMatchObject({ ojciecId: "ojciec", matkaId: null, galazId: "glowna" });
    expect(() => L.sprawdzDane(d)).not.toThrow();
  });

  it("rodzeństwo: najwyżej 15 osób (każdy, kto dzieli z nią rodzica)", () => {
    let d = L.dodajRodzica("jan", "ojciec", osoba("ojciec"))(zaczynajac());
    for (let i = 1; i <= MAKS_RODZENSTWA; i++) d = L.dodajRodzenstwo("jan", osoba(`r${i}`))(d);
    expect(() => L.dodajRodzenstwo("jan", osoba("r16"))(d)).toThrow(/rodzeństwa \(15\)/);
  });

  it("małżonkowie: najwyżej 4", () => {
    let d = zaczynajac();
    for (let i = 1; i <= MAKS_MALZONKOW; i++) d = L.dodajMalzonka("jan", osoba(`m${i}`, { plec: "K" }))(d);
    expect(d.malzenstwa.map((m) => m.kolejnosc)).toEqual([1, 2, 3, 4]);
    expect(() => L.dodajMalzonka("jan", osoba("m5", { plec: "K" }))(d)).toThrow(/małżonków \(4\)/);
  });

  it("dzieci: najwyżej 15 u każdego z rodziców", () => {
    let d = zaczynajac();
    for (let i = 1; i <= MAKS_DZIECI; i++) d = L.dodajOsobe(osoba(`d${i}`, { ojciecId: "jan" }))(d);
    expect(() => L.dodajOsobe(osoba("d16", { ojciecId: "jan" }))(d)).toThrow(/dzieci \(15\)/);
    // limit dotyczy też drugiego rodzica
    d = L.dodajMalzonka("jan", osoba("zona", { plec: "K" }))(d);
    expect(() => L.dodajOsobe(osoba("d17", { ojciecId: "jan", matkaId: "zona" }))(d)).toThrow(/dzieci \(15\)/);
    expect(() => L.dodajOsobe(osoba("d18", { matkaId: "zona" }))(d)).not.toThrow();
  });
});

describe("zmiana rodziców w edycji osoby", () => {
  const rodzina = () => {
    let d = zaczynajac(); // jan
    d = L.dodajOsobe(osoba("syn", { ojciecId: "jan" }))(d);
    d = L.dodajOsobe(osoba("wnuk", { ojciecId: "syn" }))(d);
    d = L.dodajOsobe(osoba("obcy"))(d);
    d = L.dodajOsobe(osoba("obca", { plec: "K" }))(d);
    return d;
  };

  it("ustawia i usuwa rodzica; dwoje rodziców dostaje wspólne małżeństwo", () => {
    let d = L.zapiszOsobe("wnuk", { ojciecId: "obcy", matkaId: "obca" })(rodzina());
    expect(d.osoby.find((o) => o.id === "wnuk")).toMatchObject({ ojciecId: "obcy", matkaId: "obca" });
    expect(d.malzenstwa).toEqual([{ osobaAId: "obcy", osobaBId: "obca", kolejnosc: 1 }]);
    d = L.zapiszOsobe("wnuk", { matkaId: null })(d);
    expect(d.osoby.find((o) => o.id === "wnuk")).toMatchObject({ ojciecId: "obcy", matkaId: null });
    expect(() => L.sprawdzDane(d)).not.toThrow();
  });

  it("nie tworzy drugiego małżeństwa, jeśli rodzice już są małżeństwem", () => {
    let d = L.zapiszOsobe("wnuk", { ojciecId: "obcy", matkaId: "obca" })(rodzina());
    d = L.zapiszOsobe("syn", { ojciecId: "obcy", matkaId: "obca" })(d);
    expect(d.malzenstwa).toHaveLength(1);
  });

  it("odrzuca rodzica będącego samą osobą, jej potomkiem albo nieistniejącego", () => {
    const d = rodzina();
    expect(() => L.zapiszOsobe("jan", { ojciecId: "jan" })(d)).toThrow(/własnym rodzicem|potomkiem/);
    expect(() => L.zapiszOsobe("jan", { ojciecId: "wnuk" })(d)).toThrow(/potomkiem/);
    expect(() => L.zapiszOsobe("syn", { matkaId: "wnuk" })(d)).toThrow(/potomkiem/);
    expect(() => L.zapiszOsobe("syn", { ojciecId: "nie-ma" })(d)).toThrow(/już nie istnieje/);
    expect(() => L.zapiszOsobe("wnuk", { ojciecId: "obcy", matkaId: "obcy" })(d)).toThrow(/różnymi osobami/);
  });

  it("zwykła edycja danych nie rusza rodziców ani małżeństw", () => {
    const d = rodzina();
    const po = L.zapiszOsobe("syn", { imie: "Nowe" })(d);
    expect(po.malzenstwa).toEqual(d.malzenstwa);
    expect(po.osoby.find((o) => o.id === "syn")).toMatchObject({ imie: "Nowe", ojciecId: "jan" });
  });

  it("potomkowie() zwraca całą linię w dół", () => {
    expect([...L.potomkowie(rodzina(), "jan")].sort()).toEqual(["syn", "wnuk"]);
  });
});

describe("prywatność osób żyjących", () => {
  const dane = () => {
    let d = L.dodajOsobe(osoba("dziadek", { urodzenie: { wartosc: "1930-05-01", dokladnosc: "dokladna" }, smierc: { wartosc: "2001", dokladnosc: "rok" }, notatka: "zmarły" }))(L.pusteDane());
    d = L.dodajOsobe(osoba("ja", { ojciecId: "dziadek", urodzenie: { wartosc: "1988-06-22", dokladnosc: "dokladna", miejsce: "Poznań" }, notatka: "prywatna notatka" }))(d);
    return d;
  };

  it("nowa osoba urodzona po 1925 bez daty śmierci jest domyślnie żyjąca", () => {
    const d = dane();
    expect(d.osoby.find((o) => o.id === "ja")?.zyjaca).toBe(true);
    expect(d.osoby.find((o) => o.id === "dziadek")?.zyjaca).toBeUndefined();
  });

  it("polityka „ukryj” usuwa daty, miejsca i notatki żyjących, zmarłym zostawia dane", () => {
    const publiczne = L.daneDlaGosci(dane(), "ukryj");
    const ja = publiczne.osoby.find((o) => o.id === "ja")!;
    expect(JSON.stringify(ja)).not.toMatch(/1988|Poznań|prywatna/);
    expect(ja).toMatchObject({ imie: "ja", nazwisko: "Kowalski", ojciecId: "dziadek" });
    expect(publiczne.osoby.find((o) => o.id === "dziadek")?.notatka).toBe("zmarły");
    expect(JSON.stringify(publiczne)).not.toContain("ukryjDaty");
  });

  it("polityka „tylko-rok” zostawia sam rok, „pokaz” – wszystko", () => {
    const rok = L.daneDlaGosci(dane(), "tylko-rok").osoby.find((o) => o.id === "ja")!;
    expect(rok.urodzenie).toEqual({ wartosc: "1988", dokladnosc: "rok" });
    expect(JSON.stringify(rok)).not.toMatch(/Poznań|prywatna/);
    expect(L.daneDlaGosci(dane(), "pokaz").osoby.find((o) => o.id === "ja")?.notatka).toBe("prywatna notatka");
  });

  it("statystyki i zakres lat dla gości nie ujawniają ukrytych dat", () => {
    const d = dane();
    expect(L.statystykiDanych(d)).toEqual({ osob: 2, pokolen: 2, galezi: 1 });
    expect(L.zakresLatDanych(L.daneDlaGosci(d, "ukryj"))).toEqual({ od: 1930, do: 2001 });
    expect(L.zakresLatDanych(L.daneDlaGosci(d, "tylko-rok"))).toEqual({ od: 1930, do: 2001 });
    expect(L.zakresLatDanych(L.daneDlaGosci(L.pusteDane(), "ukryj"))).toBeNull();
  });

  it("dane do Firestore nie zawierają wartości undefined", () => {
    expect(L.doFirestore({ a: 1, b: undefined, c: { d: undefined, e: 2 } })).toEqual({ a: 1, c: { e: 2 } });
  });
});
