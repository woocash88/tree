import { describe, expect, it } from "vitest";
import { estymatorRoku, mozliwiRodzice, type OsobaRodowod } from "../lib/rodzice";

const o = (id: string, pokolenie: number, extra: Partial<OsobaRodowod> = {}): OsobaRodowod => ({ id, plec: "nieznana", pokolenie, rokUr: null, rokSm: null, ojciecId: null, matkaId: null, ...extra });
const ids = (l: OsobaRodowod[]) => l.map((x) => x.id).sort();

describe("kandydaci na rodzica w formularzu edycji", () => {
  // Rodzina jak z błędu zgłoszonego w drzewie: dziadkowie z 1834 r., a „matką” wskazano kobietę urodzoną w 1969 r.
  const rodzina = [
    o("wiktor", 3, { plec: "M", rokUr: 1834 }),
    o("wojciech", 4, { plec: "M", ojciecId: "wiktor" }),
    o("stanislawa", 5, { plec: "K", ojciecId: "wojciech" }),
    o("wioletta", 4, { plec: "K", rokUr: 1969 }), // żona z innej linii, to samo pokolenie liczbowo
    o("ewa", 4, { plec: "K", rokUr: 1865 }),
    o("anna", 5, { plec: "K", rokUr: 1890 }), // to samo pokolenie co Stanisława
    o("dziecko", 6, { ojciecId: "stanislawa" }),
  ];
  const stanislawa = rodzina[2];

  it("odrzuca matkę z tego samego pokolenia liczbowo, ale urodzoną wyraźnie później niż przodkowie edytowanej osoby", () => {
    const matki = ids(mozliwiRodzice(stanislawa, rodzina, "matka"));
    expect(matki).toContain("ewa");
    expect(matki).not.toContain("wioletta");
  });

  it("odrzuca osoby z tego samego i późniejszych pokoleń oraz potomków", () => {
    const matki = ids(mozliwiRodzice(stanislawa, rodzina, "matka"));
    expect(matki).not.toContain("anna");
    expect(matki).not.toContain("dziecko");
    expect(matki).not.toContain("stanislawa");
  });

  it("ojciec – bez kobiet, matka – bez mężczyzn", () => {
    expect(ids(mozliwiRodzice(stanislawa, rodzina, "ojciec"))).not.toContain("ewa");
    expect(ids(mozliwiRodzice(stanislawa, rodzina, "matka"))).not.toContain("wiktor");
  });

  it("przy znanych datach rodzic musi być starszy o co najmniej 12 lat", () => {
    const dziecko = o("d", 2, { rokUr: 1900 });
    const lista = [dziecko, o("p1", 1, { rokUr: 1870 }), o("p2", 1, { rokUr: 1888 }), o("p3", 1, { rokUr: 1895 }), o("p4", 1, { rokUr: 1905 })];
    expect(ids(mozliwiRodzice(dziecko, lista, "ojciec"))).toEqual(["p1", "p2"]);
  });

  it("rodzic nie mógł umrzeć przed narodzinami dziecka (ojciec – z zapasem roku)", () => {
    const dziecko = o("d", 2, { rokUr: 1900 });
    const lista = [dziecko, o("zmarl", 1, { rokUr: 1860, rokSm: 1890 }), o("tuz", 1, { rokUr: 1860, rokSm: 1899 }), o("matkaZmarla", 1, { rokUr: 1860, rokSm: 1899, plec: "K" })];
    expect(ids(mozliwiRodzice(dziecko, lista, "ojciec"))).toEqual(["tuz"]);
    expect(ids(mozliwiRodzice(dziecko, lista, "matka"))).toEqual([]);
  });

  it("bez żadnych dat obowiązuje tylko reguła pokolenia", () => {
    const lista = [o("d", 3), o("a", 2), o("b", 2), o("c", 3), o("e", 1)];
    expect(ids(mozliwiRodzice(lista[0], lista, "ojciec"))).toEqual(["a", "b"]);
  });

  it("aktualny rodzic zawsze zostaje na liście, a „bez ograniczeń” pokazuje wszystkich poza osobą i potomkami", () => {
    const lista = [o("d", 3, { ojciecId: "dziwny" }), o("dziwny", 7, { rokUr: 2010 }), o("inny", 7, { rokUr: 2000 }), o("wnuk", 4, { ojciecId: "d" })];
    expect(ids(mozliwiRodzice(lista[0], lista, "ojciec"))).toEqual(["dziwny"]);
    expect(ids(mozliwiRodzice(lista[0], lista, "ojciec", true))).toEqual(["dziwny", "inny"]);
  });

  it("estymator: znana data, szacunek z rodziców i z dzieci, brak danych", () => {
    const rok = estymatorRoku(rodzina);
    expect(rok("wiktor")).toEqual({ rok: 1834, dokladny: true });
    expect(rok("wojciech")).toEqual({ rok: 1862, dokladny: false });
    expect(rok("stanislawa")).toEqual({ rok: 1890, dokladny: false });
    expect(estymatorRoku([o("x", 1)])("x")).toBeNull();
    expect(estymatorRoku([o("dz", 2, { rokUr: 1950, ojciecId: "rodzic" }), o("rodzic", 1)])("rodzic")).toEqual({ rok: 1922, dokladny: false });
  });
});
