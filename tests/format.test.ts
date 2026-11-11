import { describe, expect, it } from "vitest";
import { lataZycia, normalizuj, stulecie, wiek } from "../lib/format";

describe("formatowanie", () => {
  it("opisuje lata życia tak jak w specyfikacji", () => {
    expect(lataZycia({ urodzenie: { wartosc: "1560", dokladnosc: "okolo" }, smierc: { wartosc: "1610", dokladnosc: "rok" } })).toBe("ok. 1560–1610");
    expect(lataZycia({ urodzenie: { wartosc: "1891-05-01", dokladnosc: "dokladna" }, smierc: { wartosc: "1973-02-03", dokladnosc: "dokladna" } })).toBe("1891–1973");
    expect(lataZycia({ urodzenie: { wartosc: "1953-03-04", dokladnosc: "dokladna" } })).toBe("ur. 4.03.1953");
    expect(lataZycia({ urodzenie: { dokladnosc: "nieznana" }, smierc: { wartosc: "1855", dokladnosc: "okolo" } })).toBe("† ok. 1855");
    expect(lataZycia({ urodzenie: { wartosc: "1953-03-04", dokladnosc: "dokladna" }, ukryjDaty: true })).toBe("");
  });

  it("liczy wiek", () => {
    expect(wiek({ urodzenie: { wartosc: "1831-09-01", dokladnosc: "dokladna" }, smierc: { wartosc: "1831-09-06", dokladnosc: "dokladna" } })).toBe("5 dni");
    expect(wiek({ urodzenie: { wartosc: "1862-07-21", dokladnosc: "dokladna" }, smierc: { wartosc: "1952-06-13", dokladnosc: "dokladna" } })).toBe("89 lat");
    expect(wiek({ urodzenie: { wartosc: "1807", dokladnosc: "okolo" }, smierc: { wartosc: "1847-08-22", dokladnosc: "dokladna" } })).toBe("ok. 40 lat");
    expect(wiek({ urodzenie: { wartosc: "1900", dokladnosc: "rok" } })).toBeNull();
  });

  it("ignoruje polskie znaki i wielkość liter", () => {
    expect(normalizuj("Łukasz ŻÓŁĆ-Śliwa")).toBe("lukasz zolc-sliwa");
  });

  it("wyznacza stulecie", () => {
    expect(stulecie(1780).etykieta).toBe("XVIII w.");
    expect(stulecie(1900).etykieta).toBe("XIX w.");
    expect(stulecie(2008).etykieta).toBe("XXI w.");
  });
});
