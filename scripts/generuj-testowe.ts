/**
 * Generuje duży, fikcyjny zestaw danych do testów wydajności:
 *
 *   npm run generuj-testowe            # 600 osób → data/testowe-600.json
 *   npm run generuj-testowe -- 1500    # inna liczba osób
 *   RODZINA_PLIK=data/testowe-600.json npm run build
 *
 * Dane są deterministyczne (stałe ziarno), zawierają trzy niepołączone gałęzie,
 * kolejne małżeństwa, daty o różnej dokładności i osoby żyjące.
 */
import fs from "node:fs";
import path from "node:path";
import type { DataZdarzenia, Galaz, Malzenstwo, Osoba, Rodzina } from "../lib/schemat";
import { walidujRodzine } from "../lib/walidacja";

const ILE = Number(process.argv[2] ?? 600);
let ziarno = 20251111;
const los = () => {
  ziarno = (ziarno * 1664525 + 1013904223) % 4294967296;
  return ziarno / 4294967296;
};
const wybierz = <T,>(lista: T[]) => lista[Math.floor(los() * lista.length)];

const MESKIE = ["Jan", "Piotr", "Łukasz", "Stanisław", "Józef", "Wojciech", "Antoni", "Michał", "Tomasz", "Kazimierz", "Franciszek", "Żelisław"];
const ZENSKIE = ["Anna", "Maria", "Zofia", "Katarzyna", "Jadwiga", "Helena", "Agnieszka", "Elżbieta", "Łucja", "Stanisława", "Żaneta", "Bronisława"];
const NAZWISKA = ["Kowal", "Wiśniewsk", "Zielińsk", "Dąbrowsk", "Wójcik", "Lewandowsk", "Szymańsk", "Kamińsk", "Żak", "Śliwa", "Łęck", "Ćwikła"];
const nazwisko = (rdzen: string, plec: "M" | "K") => (/sk$|ck$/.test(rdzen) ? rdzen + (plec === "M" ? "i" : "a") : rdzen);

const galezie: Galaz[] = [
  { id: "kowalowie", nazwa: "Kowalowie", kolor: "#7a2331", opis: "Pierwsza gałąź testowa." },
  { id: "zielinscy", nazwa: "Zielińscy", kolor: "#1f4d3a", opis: "Druga gałąź testowa, niepołączona z pozostałymi." },
  { id: "zakowie", nazwa: "Żakowie", kolor: "#806210", opis: "Trzecia gałąź testowa." },
];
const RDZENIE = ["Kowal", "Zielińsk", "Żak"];

const osoby: Osoba[] = [];
const malzenstwa: Malzenstwo[] = [];
const id = (imie: string, nazw: string) => `${imie}-${nazw}-${osoby.length + 1}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-");

function data(rok: number): DataZdarzenia {
  const r = los();
  if (r < 0.15) return { wartosc: String(rok), dokladnosc: "okolo" };
  if (r < 0.4) return { wartosc: String(rok), dokladnosc: "rok" };
  const m = String(1 + Math.floor(los() * 12)).padStart(2, "0");
  const d = String(1 + Math.floor(los() * 28)).padStart(2, "0");
  return { wartosc: `${rok}-${m}-${d}`, dokladnosc: "dokladna", ...(los() < 0.5 ? { miejsce: wybierz(["Kobylin", "Poznań", "Rawicz", "Łódź"]) } : {}) };
}

function nowaOsoba(plec: "M" | "K", rdzen: string, rokUr: number, galazId: string, ojciecId: string | null, matkaId: string | null): Osoba {
  const imie = wybierz(plec === "M" ? MESKIE : ZENSKIE);
  const nazw = nazwisko(rdzen, plec);
  const o: Osoba = { id: id(imie, nazw), imie, nazwisko: nazw, plec, urodzenie: data(rokUr), ojciecId, matkaId, galazId };
  if (rokUr > 1925 && los() < 0.85) o.ukryjDaty = true;
  else if (los() < 0.8) o.smierc = data(rokUr + (los() < 0.15 ? 1 + Math.floor(los() * 5) : 30 + Math.floor(los() * 55)));
  osoby.push(o);
  return o;
}

type Kolejka = { osoba: Osoba; rdzen: string; rok: number; pokolenie: number };
const kolejka: Kolejka[] = [];
RDZENIE.forEach((rdzen, i) => {
  const protoplasta = nowaOsoba("M", rdzen, 1700 + i * 15, galezie[i].id, null, null);
  kolejka.push({ osoba: protoplasta, rdzen, rok: 1700 + i * 15, pokolenie: 1 });
});

while (kolejka.length && osoby.length < ILE) {
  const { osoba, rdzen, rok, pokolenie } = kolejka.shift()!;
  if (pokolenie > 1 && los() < 0.3) continue; // bezdzietni
  const zwiazkow = los() < 0.1 ? 2 : 1;
  for (let z = 1; z <= zwiazkow && osoby.length < ILE; z++) {
    const plecMalzonka = osoba.plec === "M" ? "K" : "M";
    const malzonek = nowaOsoba(plecMalzonka, wybierz(NAZWISKA), rok + Math.floor(los() * 6) - 2, osoba.galazId, null, null);
    if (plecMalzonka === "K" && los() < 0.5) {
      malzonek.nazwiskoRodowe = malzonek.nazwisko;
      malzonek.nazwisko = nazwisko(rdzen, "K");
    }
    malzenstwa.push({ osobaAId: osoba.id, osobaBId: malzonek.id, kolejnosc: z });
    const dzieci = 1 + Math.floor(los() * (pokolenie < 3 ? 5 : 4));
    for (let d = 0; d < dzieci && osoby.length < ILE; d++) {
      const plec = los() < 0.5 ? "M" : "K";
      const rokDziecka = rok + 22 + (z - 1) * 8 + d * 2 + Math.floor(los() * 3);
      const [ojciec, matka] = osoba.plec === "M" ? [osoba, malzonek] : [malzonek, osoba];
      const dziecko = nowaOsoba(plec, plec === "M" || osoba.plec === "M" ? rdzen : ojciec.nazwisko.replace(/[ia]$/, ""), rokDziecka, osoba.galazId, ojciec.id, matka.id);
      kolejka.push({ osoba: dziecko, rdzen, rok: rokDziecka, pokolenie: pokolenie + 1 });
    }
  }
}

const rodzina: Rodzina = { tytul: `Zestaw testowy (${osoby.length} osób)`, opis: "Fikcyjne dane do testów wydajności.", galezie, osoby, malzenstwa };
walidujRodzine(rodzina);
const plik = path.resolve(__dirname, `../data/testowe-${ILE}.json`);
fs.writeFileSync(plik, JSON.stringify(rodzina, null, 1) + "\n");
console.log(`Zapisano ${osoby.length} osób i ${malzenstwa.length} małżeństw → ${path.relative(process.cwd(), plik)}`);
