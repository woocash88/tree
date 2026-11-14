import { describe, expect, it } from "vitest";
import { parsujDate } from "../lib/edycje";
import { bladPol, polaZTekstu, PUSTE_POLA, tekstZPol } from "../lib/pole-daty";

describe("pola daty w formularzu", () => {
  it("składa tekst daty dla parsera: pełna data, sam rok, około, nieznana, miejsce", () => {
    expect(tekstZPol({ ...PUSTE_POLA, dzien: "4", miesiac: "3", rok: "1891" })).toBe("4.3.1891");
    expect(tekstZPol({ ...PUSTE_POLA, rok: "1891" })).toBe("1891");
    expect(tekstZPol({ ...PUSTE_POLA, rok: "1891", okolo: true })).toBe("ok. 1891");
    expect(tekstZPol({ ...PUSTE_POLA, dzien: "4", miesiac: "3", rok: "1891", miejsce: " Kobylin, Polska " })).toBe("4.3.1891, Kobylin, Polska");
    expect(tekstZPol({ ...PUSTE_POLA, nieznana: true, rok: "1891" })).toBe("?");
    expect(tekstZPol({ ...PUSTE_POLA, miejsce: "Kobylin" })).toBe("?, Kobylin");
    expect(tekstZPol(PUSTE_POLA)).toBe("");
  });

  it("tekst z pól jest poprawnie odczytywany przez parsujDate", () => {
    const data = (p: Partial<typeof PUSTE_POLA>) => {
      const w = parsujDate(tekstZPol({ ...PUSTE_POLA, ...p }));
      return w.ok ? w.data : null;
    };
    expect(data({ dzien: "4", miesiac: "3", rok: "1891" })).toEqual({ wartosc: "1891-03-04", dokladnosc: "dokladna" });
    expect(data({ rok: "1891", okolo: true, miejsce: "Kobylin" })).toEqual({ wartosc: "1891", dokladnosc: "okolo", miejsce: "Kobylin" });
    expect(data({ nieznana: true })).toEqual({ dokladnosc: "nieznana" });
    expect(data({})).toBeNull();
  });

  it("odtwarza pola z tekstu (edycja istniejącej osoby)", () => {
    expect(polaZTekstu("22.08.1847, Kobylin, Polska")).toEqual({ dzien: "22", miesiac: "8", rok: "1847", okolo: false, nieznana: false, miejsce: "Kobylin, Polska" });
    expect(polaZTekstu("ok. 1807")).toEqual({ ...PUSTE_POLA, rok: "1807", okolo: true });
    expect(polaZTekstu("?")).toEqual({ ...PUSTE_POLA, nieznana: true });
    expect(polaZTekstu("")).toEqual(PUSTE_POLA);
    expect(polaZTekstu("bzdura")).toEqual(PUSTE_POLA);
  });

  it("zgłasza czytelne błędy: brak roku, dzień bez miesiąca, nieistniejąca data, zły rok", () => {
    expect(bladPol(PUSTE_POLA)).toBe("");
    expect(bladPol({ ...PUSTE_POLA, rok: "1891" })).toBe("");
    expect(bladPol({ ...PUSTE_POLA, dzien: "4", miesiac: "3" })).toBe("Podaj rok.");
    expect(bladPol({ ...PUSTE_POLA, dzien: "4", rok: "1891" })).toMatch(/dzień razem z miesiącem/);
    expect(bladPol({ ...PUSTE_POLA, miesiac: "3", rok: "1891" })).toMatch(/dzień razem z miesiącem/);
    expect(bladPol({ ...PUSTE_POLA, dzien: "31", miesiac: "2", rok: "1891" })).toMatch(/nie istnieje/);
    expect(bladPol({ ...PUSTE_POLA, rok: "189" })).toMatch(/czterema cyframi/);
    expect(bladPol({ ...PUSTE_POLA, nieznana: true, rok: "12" })).toBe("");
  });
});
