import { describe, expect, it } from "vitest";
import { bladKontaktu, MAKS_TRESC_WIADOMOSCI } from "../lib/baza/kontakt";

const poprawne = { imie: "Jan Kowalski", email: "jan@example.org", temat: "pytanie" as const, tresc: "Dzień dobry, mam pytanie o serwis." };

describe("formularz kontaktowy: walidacja pól", () => {
  it("poprawne dane nie dają błędu", () => {
    expect(bladKontaktu(poprawne)).toBe("");
    expect(bladKontaktu({ ...poprawne, tresc: "x".repeat(MAKS_TRESC_WIADOMOSCI) })).toBe("");
  });
  it("odrzuca puste imię, zły adres, zbyt krótką i zbyt długą wiadomość", () => {
    expect(bladKontaktu({ ...poprawne, imie: "  " })).toMatch(/imię/i);
    for (const zly of ["", "bez-malpy", "a@b", "a b@c.pl"]) expect(bladKontaktu({ ...poprawne, email: zly })).toMatch(/e-mail/);
    expect(bladKontaktu({ ...poprawne, tresc: "krótko" })).toMatch(/zbyt krótka/);
    expect(bladKontaktu({ ...poprawne, tresc: "x".repeat(MAKS_TRESC_WIADOMOSCI + 1) })).toMatch(/najwyżej/);
  });
  it("odrzuca nieznany temat", () => {
    expect(bladKontaktu({ ...poprawne, temat: "spam" as never })).toMatch(/temat/i);
  });
});
