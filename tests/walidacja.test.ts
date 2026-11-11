import { describe, expect, it } from "vitest";
import przyklad from "./przyklad.json";
import { BladDanych, walidujRodzine } from "../lib/walidacja";

const kopia = () => structuredClone(przyklad) as typeof przyklad;

function bledy(dane: unknown): string[] {
  try {
    walidujRodzine(dane);
  } catch (e) {
    if (e instanceof BladDanych) return e.bledy;
    throw e;
  }
  return [];
}

describe("walidacja danych", () => {
  it("przepuszcza dane przykładowe", () => {
    expect(bledy(kopia())).toEqual([]);
  });

  it("zgłasza brakującego rodzica", () => {
    const d = kopia();
    d.osoby[3].ojciecId = "nie-ma-takiej-osoby";
    expect(bledy(d).join("\n")).toMatch(/piotr-kowalski-1891.*brakujący rodzic.*nie-ma-takiej-osoby/);
  });

  it("zgłasza zduplikowane id", () => {
    const d = kopia();
    d.osoby.push({ ...d.osoby[0] });
    expect(bledy(d).join("\n")).toMatch(/Zduplikowane id osoby: "jan-kowalski-1560"/);
  });

  it("zgłasza cykl w pokrewieństwie", () => {
    const d = kopia();
    d.osoby[0].ojciecId = "anna-kowalska-1953"; // Jan → synem własnej wnuczki
    expect(bledy(d).join("\n")).toMatch(/Cykl w pokrewieństwie/);
  });

  it("zgłasza nieznaną gałąź, złe małżeństwo i złą datę – z identyfikatorem osoby", () => {
    const d = kopia();
    d.osoby[1].galazId = "brak";
    d.malzenstwa.push({ osobaAId: "jan-kowalski-1560", osobaBId: "duch", kolejnosc: 3 });
    const t = bledy(d).join("\n");
    expect(t).toMatch(/anna-nowak.*nieznana gałąź "brak"/);
    expect(t).toMatch(/osoba "duch" nie istnieje/);

    const d2 = kopia();
    d2.osoby[0].urodzenie = { wartosc: "1560-13-40", dokladnosc: "dokladna" };
    expect(bledy(d2).join("\n")).toMatch(/jan-kowalski-1560.*niepoprawna data/);
  });

  it("zgłasza śmierć przed urodzeniem", () => {
    const d = kopia();
    d.osoby[0].smierc = { wartosc: "1500", dokladnosc: "rok" };
    expect(bledy(d).join("\n")).toMatch(/wcześniejsza niż data urodzenia/);
  });
});
