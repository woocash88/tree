/**
 * Testy reguł bezpieczeństwa Firestore na emulatorze:
 *   npm run test:reguly
 * (uruchamia emulator, potem vitest; wymaga Javy). Nie wchodzą w skład `npm test`.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, deleteField } from "firebase/firestore";
import fs from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;
const TOKEN = (email: string, zweryfikowany = true) => ({ email, email_verified: zweryfikowany });
const as = (uid: string, email = `${uid}@example.org`, zweryfikowany = true) => env.authenticatedContext(uid, TOKEN(email, zweryfikowany)).firestore();
const gosc = () => env.unauthenticatedContext().firestore();

const meta = (o: Partial<Record<string, unknown>> = {}) => ({
  nazwa: "Rodzina",
  opis: "",
  region: "",
  widocznosc: "publiczne",
  politykaDatZyjacych: "ukryj",
  wlascicielId: "ala",
  wlascicielNazwa: "Ala Nowak",
  kolaboranci: [] as string[],
  kolaboranciInfo: {},
  zakresLat: null,
  statystyki: { osob: 1, pokolen: 1, galezi: 1 },
  utworzono: "2026-11-12T10:00:00Z",
  zaktualizowano: "2026-11-12",
  ...o,
});
const dane = (n = 1) => ({ galezie: [{ id: "glowna" }], osoby: Array.from({ length: n }, (_, i) => ({ id: `o${i}` })), malzenstwa: [] });

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: "przodkowie-test", firestore: { rules: fs.readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
});
afterAll(async () => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "admini/szef"), { od: "2026" });
    await setDoc(doc(db, "drzewa/pub"), meta());
    await setDoc(doc(db, "drzewa/pub/dane/pelne"), dane(2));
    await setDoc(doc(db, "drzewa/pub/dane/publiczne"), dane(2));
    await setDoc(doc(db, "drzewa/prv"), meta({ widocznosc: "prywatne", kolaboranci: ["kuba"], kolaboranciInfo: { kuba: { nazwa: "Kuba K" } } }));
    await setDoc(doc(db, "drzewa/prv/dane/pelne"), dane());
    await setDoc(doc(db, "drzewa/prv/dane/publiczne"), dane());
  });
});

describe("drzewa: odczyt", () => {
  it("publiczne drzewo i jego okrojone dane czyta każdy, ale pełnych danych nie", async () => {
    await assertSucceeds(getDoc(doc(gosc(), "drzewa/pub")));
    await assertSucceeds(getDoc(doc(gosc(), "drzewa/pub/dane/publiczne")));
    await assertFails(getDoc(doc(gosc(), "drzewa/pub/dane/pelne")));
    await assertFails(getDoc(doc(as("obcy"), "drzewa/pub/dane/pelne")));
  });
  it("prywatnego drzewa nie widzi gość ani obcy; widzą właściciel, kolaborant i administrator", async () => {
    for (const w of ["drzewa/prv", "drzewa/prv/dane/publiczne", "drzewa/prv/dane/pelne"]) {
      await assertFails(getDoc(doc(gosc(), w)));
      await assertFails(getDoc(doc(as("obcy"), w)));
      await assertSucceeds(getDoc(doc(as("ala"), w)));
      await assertSucceeds(getDoc(doc(as("kuba"), w)));
      await assertSucceeds(getDoc(doc(as("szef", "szef@example.org"), w)));
    }
  });
  it("listowanie: publiczne dla każdego, własne i współdzielone dla zalogowanego, wszystkie dla administratora", async () => {
    await assertSucceeds(getDocs(query(collection(gosc(), "drzewa"), where("widocznosc", "==", "publiczne"))));
    await assertFails(getDocs(collection(gosc(), "drzewa")));
    await assertFails(getDocs(collection(as("obcy"), "drzewa")));
    await assertSucceeds(getDocs(query(collection(as("ala"), "drzewa"), where("wlascicielId", "==", "ala"))));
    await assertSucceeds(getDocs(query(collection(as("kuba"), "drzewa"), where("kolaboranci", "array-contains", "kuba"))));
    await assertSucceeds(getDocs(collection(as("szef"), "drzewa")));
  });
  it("dane nie są listowalne", async () => {
    await assertFails(getDocs(collection(as("ala"), "drzewa/pub/dane")));
  });
});

describe("drzewa: tworzenie, zmiany, usuwanie", () => {
  it("zalogowany ze zweryfikowanym adresem tworzy własne drzewo, a potem jego dane", async () => {
    const db = as("ola");
    await assertSucceeds(setDoc(doc(db, "drzewa/nowe"), meta({ wlascicielId: "ola" })));
    await assertSucceeds(setDoc(doc(db, "drzewa/nowe/dane/pelne"), dane()));
    await assertSucceeds(setDoc(doc(db, "drzewa/nowe/dane/publiczne"), dane()));
  });
  it("odrzuca: gościa, niezweryfikowany adres, cudzego właściciela, kolaborantów na starcie, złe pola i politykę", async () => {
    await assertFails(setDoc(doc(gosc(), "drzewa/x1"), meta({ wlascicielId: "ola" })));
    await assertFails(setDoc(doc(as("ola", "ola@example.org", false), "drzewa/x2"), meta({ wlascicielId: "ola" })));
    await assertFails(setDoc(doc(as("ola"), "drzewa/x3"), meta({ wlascicielId: "ala" })));
    await assertFails(setDoc(doc(as("ola"), "drzewa/x4"), meta({ wlascicielId: "ola", kolaboranci: ["ala"] })));
    await assertFails(setDoc(doc(as("ola"), "drzewa/x5"), { ...meta({ wlascicielId: "ola" }), nadmiarowe: 1 }));
    await assertFails(setDoc(doc(as("ola"), "drzewa/x6"), meta({ wlascicielId: "ola", politykaDatZyjacych: "wszystko" })));
    await assertFails(setDoc(doc(as("ola"), "drzewa/x7"), meta({ wlascicielId: "ola", widocznosc: "tajne" })));
    await assertFails(setDoc(doc(as("ola"), "drzewa/x8"), meta({ wlascicielId: "ola", nazwa: "" })));
  });
  it("zablokowany użytkownik nie tworzy drzew", async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "blokady/ola"), { email: "ola@example.org" }));
    await assertFails(setDoc(doc(as("ola"), "drzewa/x9"), meta({ wlascicielId: "ola" })));
  });
  it("właściciel zmienia ustawienia i kolaborantów, ale nie przekazuje drzewa", async () => {
    const d = doc(as("ala"), "drzewa/pub");
    await assertSucceeds(updateDoc(d, { widocznosc: "prywatne", politykaDatZyjacych: "pokaz", kolaboranci: arrayUnion("kuba"), "kolaboranciInfo.kuba": { nazwa: "Kuba" } }));
    await assertFails(updateDoc(d, { wlascicielId: "obcy" }));
    await assertFails(updateDoc(d, { widocznosc: "wszyscy" }));
  });
  it("kolaborant zmienia tylko statystyki, nie ustawienia i nie listę kolaborantów", async () => {
    const d = doc(as("kuba"), "drzewa/prv");
    await assertSucceeds(updateDoc(d, { statystyki: { osob: 5, pokolen: 2, galezi: 1 }, zaktualizowano: "2026-11-13" }));
    await assertFails(updateDoc(d, { widocznosc: "publiczne" }));
    await assertFails(updateDoc(d, { politykaDatZyjacych: "pokaz" }));
    await assertFails(updateDoc(d, { kolaboranci: arrayUnion("obcy") }));
    await assertFails(updateDoc(d, { nazwa: "Przejęte" }));
  });
  it("kolaborant może opuścić drzewo, ale nie usunąć innych kolaborantów", async () => {
    await env.withSecurityRulesDisabled((c) => updateDoc(doc(c.firestore(), "drzewa/prv"), { kolaboranci: ["kuba", "ewa"], "kolaboranciInfo.ewa": { nazwa: "Ewa" } }));
    await assertFails(updateDoc(doc(as("kuba"), "drzewa/prv"), { kolaboranci: arrayRemove("ewa") }));
    await assertSucceeds(updateDoc(doc(as("kuba"), "drzewa/prv"), { kolaboranci: arrayRemove("kuba"), "kolaboranciInfo.kuba": deleteField() }));
    await assertFails(getDoc(doc(as("kuba"), "drzewa/prv")));
  });
  it("obcy i gość nie zmieniają ani nie usuwają cudzego drzewa", async () => {
    await assertFails(updateDoc(doc(as("obcy"), "drzewa/pub"), { nazwa: "X" }));
    await assertFails(updateDoc(doc(gosc(), "drzewa/pub"), { nazwa: "X" }));
    await assertFails(deleteDoc(doc(as("obcy"), "drzewa/pub")));
    await assertFails(deleteDoc(doc(as("kuba"), "drzewa/prv")));
  });
  it("właściciel i administrator usuwają drzewo wraz z danymi", async () => {
    await assertSucceeds(deleteDoc(doc(as("ala"), "drzewa/pub/dane/pelne")));
    await assertSucceeds(deleteDoc(doc(as("ala"), "drzewa/pub/dane/publiczne")));
    await assertSucceeds(deleteDoc(doc(as("ala"), "drzewa/pub")));
    await assertSucceeds(deleteDoc(doc(as("szef"), "drzewa/prv/dane/pelne")));
    await assertSucceeds(deleteDoc(doc(as("szef"), "drzewa/prv")));
  });
  it("administrator edytuje cudze drzewo, ale nie zmienia właściciela", async () => {
    await assertSucceeds(updateDoc(doc(as("szef"), "drzewa/pub"), { nazwa: "Poprawiona", widocznosc: "prywatne" }));
    await assertFails(updateDoc(doc(as("szef"), "drzewa/pub"), { wlascicielId: "szef" }));
  });
});

describe("dane drzewa: zapis", () => {
  it("właściciel, kolaborant i administrator zapisują dane; obcy i gość nie", async () => {
    for (const w of ["pelne", "publiczne"]) {
      await assertSucceeds(setDoc(doc(as("ala"), `drzewa/pub/dane/${w}`), dane(3)));
      await assertSucceeds(setDoc(doc(as("kuba"), `drzewa/prv/dane/${w}`), dane(3)));
      await assertSucceeds(setDoc(doc(as("szef"), `drzewa/pub/dane/${w}`), dane(3)));
      await assertFails(setDoc(doc(as("obcy"), `drzewa/pub/dane/${w}`), dane(3)));
      await assertFails(setDoc(doc(gosc(), `drzewa/pub/dane/${w}`), dane(3)));
      await assertFails(setDoc(doc(as("kuba"), `drzewa/pub/dane/${w}`), dane(3))); // kolaborant innego drzewa
    }
  });
  it("odrzuca nieznane dokumenty, nadmiarowe pola, zły kształt i więcej niż 2000 osób", async () => {
    const db = as("ala");
    await assertFails(setDoc(doc(db, "drzewa/pub/dane/inne"), dane()));
    await assertFails(setDoc(doc(db, "drzewa/pub/dane/pelne"), { ...dane(), sekret: 1 }));
    await assertFails(setDoc(doc(db, "drzewa/pub/dane/pelne"), { galezie: "x", osoby: [], malzenstwa: [] }));
    await assertFails(setDoc(doc(db, "drzewa/pub/dane/pelne"), dane(2001)));
    await assertSucceeds(setDoc(doc(db, "drzewa/pub/dane/pelne"), dane(2000)));
  });
  it("niezweryfikowany adres nie zapisuje danych", async () => {
    await assertFails(setDoc(doc(as("ala", "ala@example.org", false), "drzewa/pub/dane/pelne"), dane()));
  });
});

describe("profile, adresy, administratorzy", () => {
  const profil = (email: string) => ({ imie: "Ala", nazwisko: "Nowak", email, utworzono: "2026-11-12T10:00:00Z" });
  it("użytkownik zakłada i czyta tylko własny profil; nie podszywa się pod cudzy e-mail", async () => {
    await assertSucceeds(setDoc(doc(as("ola"), "uzytkownicy/ola"), profil("ola@example.org")));
    await assertSucceeds(getDoc(doc(as("ola"), "uzytkownicy/ola")));
    await assertFails(getDoc(doc(as("obcy"), "uzytkownicy/ola")));
    await assertFails(getDoc(doc(gosc(), "uzytkownicy/ola")));
    await assertFails(setDoc(doc(as("ola"), "uzytkownicy/ola2"), profil("ola@example.org")));
    await assertFails(setDoc(doc(as("ola"), "uzytkownicy/ola"), profil("cudzy@example.org")));
    await assertFails(setDoc(doc(as("ola"), "uzytkownicy/ola"), { ...profil("ola@example.org"), rola: "admin" }));
    await assertFails(getDocs(collection(as("ola"), "uzytkownicy")));
  });
  it("użytkownik zmienia tylko imię i nazwisko; administrator czyta listę", async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "uzytkownicy/ola"), profil("ola@example.org")));
    await assertSucceeds(updateDoc(doc(as("ola"), "uzytkownicy/ola"), { imie: "Aleksandra" }));
    await assertFails(updateDoc(doc(as("ola"), "uzytkownicy/ola"), { email: "inny@example.org" }));
    await assertSucceeds(getDocs(collection(as("szef"), "uzytkownicy")));
  });
  it("adres kolaboranta: tworzy go zweryfikowany właściciel adresu, czyta zweryfikowany użytkownik, bez listowania", async () => {
    await assertSucceeds(setDoc(doc(as("ola"), "adresy/ola@example.org"), { uid: "ola", nazwa: "Ola Nowak" }));
    await assertFails(setDoc(doc(as("ola"), "adresy/inny@example.org"), { uid: "ola", nazwa: "Ola" }));
    await assertFails(setDoc(doc(as("ola", "ola@example.org", false), "adresy/ola@example.org"), { uid: "ola", nazwa: "Ola" }));
    await assertSucceeds(getDoc(doc(as("ala"), "adresy/ola@example.org")));
    await assertFails(getDoc(doc(gosc(), "adresy/ola@example.org")));
    await assertFails(getDocs(collection(as("ala"), "adresy")));
  });
  it("nikt nie nada sobie roli administratora ani nie zdejmuje blokady", async () => {
    await assertFails(setDoc(doc(as("ola"), "admini/ola"), { od: "2026" }));
    await assertSucceeds(getDoc(doc(as("szef"), "admini/szef")));
    await assertFails(getDoc(doc(as("ola"), "admini/szef")));
    await assertSucceeds(setDoc(doc(as("szef"), "blokady/ola"), { email: "ola@example.org" }));
    await assertFails(deleteDoc(doc(as("ola"), "blokady/ola")));
    await assertSucceeds(getDoc(doc(as("ola"), "blokady/ola")));
  });
});
