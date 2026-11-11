/**
 * Generuje fikcyjne drzewo (deterministyczne, stałe ziarno) do testów wydajności i jako drzewo przykładowe:
 *
 *   npm run generuj-testowe                       # 600 osób → data/testowe/testowe-600/
 *   npm run generuj-testowe -- 1500               # 1500 osób → data/testowe/testowe-1500/
 *   npm run generuj-testowe -- 40 przyklad --galezie=2 --wyjscie=data/drzewa
 *   DRZEWA_KATALOG=data/testowe npm run build     # build tylko z zestawem testowym (poza produkcyjnym)
 *
 * Argumenty: [liczba osób] [slug drzewa] [--galezie=N (1–3)] [--wyjscie=katalog].
 * Dane zawierają niepołączone gałęzie, kolejne małżeństwa, daty o różnej dokładności i osoby żyjące.
 */
import fs from "node:fs";
import path from "node:path";
import type { DataZdarzenia, Galaz, Malzenstwo, Osoba, Rodzina } from "../lib/schemat";
import { walidujRodzine } from "../lib/walidacja";

const argumenty = process.argv.slice(2);
const opcja = (nazwa: string) => argumenty.find((a) => a.startsWith(`--${nazwa}=`))?.split("=")[1];
const pozycyjne = argumenty.filter((a) => !a.startsWith("--"));
const ILE = Number(pozycyjne[0] ?? 600);
const SLUG = pozycyjne[1] ?? `testowe-${ILE}`;
const LICZBA_GALEZI = Math.max(1, Math.min(3, Number(opcja("galezie") ?? 3)));
const WYJSCIE = path.resolve(process.cwd(), opcja("wyjscie") ?? "data/testowe");
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
  { id: "kowalowie", nazwa: "Kowalowie", kolor: "#e11d48", opis: "Pierwsza gałąź testowa." },
  { id: "zielinscy", nazwa: "Zielińscy", kolor: "#059669", opis: "Druga gałąź testowa, niepołączona z pozostałymi." },
  { id: "zakowie", nazwa: "Żakowie", kolor: "#3b82f6", opis: "Trzecia gałąź testowa." },
].slice(0, LICZBA_GALEZI);
const RDZENIE = ["Kowal", "Zielińsk", "Żak"].slice(0, LICZBA_GALEZI);

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
  if (rokUr > 1925 && los() < 0.85) o.zyjaca = true;
  else if (los() < 0.8) o.smierc = data(rokUr + (los() < 0.15 ? 1 + Math.floor(los() * 5) : 30 + Math.floor(los() * 55)));
  osoby.push(o);
  return o;
}

type Kolejka = { osoba: Osoba; rdzen: string; rok: number; pokolenie: number };
const kolejka: Kolejka[] = [];
let maxPokolenie = 1;
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
      maxPokolenie = Math.max(maxPokolenie, pokolenie + 1);
    }
  }
}

const rodzina: Rodzina = { galezie, osoby, malzenstwa };
walidujRodzine(rodzina);
const pokolenia = maxPokolenie;
const lata = osoby.flatMap((o) => [o.urodzenie.wartosc, o.smierc?.wartosc]).filter((w): w is string => !!w).map((w) => Number(w.slice(0, 4)));
const meta = {
  slug: SLUG,
  nazwa: `Zestaw testowy (${osoby.length} osób)`,
  opis: "Fikcyjne dane wygenerowane skryptem do testów wydajności. Nie opisują prawdziwych osób.",
  zakresLat: { od: Math.min(...lata), do: Math.max(...lata) },
  region: "Fikcyjny",
  zrodlo: { nazwa: "Generator danych testowych", url: "https://github.com/woocash88/tree/blob/main/scripts/generuj-testowe.ts" },
  autor: { nazwa: "Generator danych testowych" },
  zaktualizowano: new Date().toISOString().slice(0, 10),
  widocznosc: "publiczne",
  politykaDatZyjacych: "ukryj",
  przykladowe: true,
};
const katalog = path.join(WYJSCIE, SLUG);
fs.mkdirSync(katalog, { recursive: true });
fs.writeFileSync(path.join(katalog, "rodzina.json"), JSON.stringify(rodzina, null, 1) + "\n");
fs.writeFileSync(path.join(katalog, "drzewo.json"), JSON.stringify(meta, null, 2) + "\n");
console.log(`Drzewo „${SLUG}”: ${osoby.length} osób, ${malzenstwa.length} małżeństw, ${galezie.length} gałęzi, do ${pokolenia}. pokolenia → ${path.relative(process.cwd(), katalog)}`);
