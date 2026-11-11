/**
 * Import drzewa ze źródła tekstowego: data/drzewa/<slug>/zrodlo/<slug>.txt → data/drzewa/<slug>/rodzina.json.
 *
 *   npm run import -- lulkiewicz
 *
 * Zasady:
 *  - skrypt niczego nie zgaduje – każda niejednoznaczność trafia do data/drzewa/<slug>/import-raport.md
 *    z numerem wiersza i powodem;
 *  - ręczne poprawki z data/drzewa/<slug>/poprawki.json są nakładane po imporcie, więc ponowne
 *    uruchomienie ich nie kasuje;
 *  - wynik przechodzi tę samą walidację co build strony.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { normalizuj } from "../lib/format";
import type { DataZdarzenia, Galaz, Malzenstwo, Osoba, Rodzina } from "../lib/schemat";
import { katalogDrzewa } from "../lib/drzewa-pliki";
import { walidujRodzine } from "../lib/walidacja";
import { IMIONA_MESKIE, IMIONA_ZENSKIE } from "./imiona";

/** Ścieżki plików importu dla drzewa o danym slugu (wszystko leży w data/drzewa/<slug>/). */
export function sciezkiImportu(slug: string) {
  const katalog = katalogDrzewa(slug);
  return {
    katalog,
    zrodlo: path.join(katalog, "zrodlo", `${slug}.txt`),
    poprawki: path.join(katalog, "poprawki.json"),
    wynik: path.join(katalog, "rodzina.json"),
    raport: path.join(katalog, "import-raport.md"),
  };
}

/** Pokolenia 1–2 to wspólny pień; każde dziecko osoby z pokolenia 2 zaczyna własną gałąź. */
const POKOLENIE_GALEZI = 3;
const ROK_GRANICZNY_ZYJACYCH = 1925;

const PIEN: Galaz = {
  id: "pien",
  nazwa: "Wspólny pień",
  kolor: "#64748b",
  opis: "Sebastian i Wiktor Lulkiewiczowie z żonami – pokolenia 1–2, wspólne dla wszystkich linii.",
};

/** Siedem linii potomków Wiktora Lulkiewicza (ur. ok. 1780), w kolejności ze źródła. */
const LINIE: { imie: string; id: string; dopelniacz: string; kolor: string }[] = [
  { imie: "Antoni", id: "antoni", dopelniacz: "Antoniego", kolor: "#e11d48" }, // róża
  { imie: "Konstancja", id: "konstancja", dopelniacz: "Konstancji", kolor: "#8b5cf6" }, // fiolet
  { imie: "Julian", id: "julian", dopelniacz: "Juliana", kolor: "#059669" }, // szmaragd
  { imie: "Józefa", id: "jozefa", dopelniacz: "Józefy", kolor: "#ea580c" }, // pomarańcz
  { imie: "Wojciech", id: "wojciech", dopelniacz: "Wojciecha", kolor: "#3b82f6" }, // błękit
  { imie: "Filip", id: "filip", dopelniacz: "Filipa", kolor: "#58980b" }, // limonka
  { imie: "Józef", id: "jozef", dopelniacz: "Józefa", kolor: "#0891b2" }, // turkus
];

// ───────────────────────────── raport ─────────────────────────────

const SEKCJE = {
  bezNumeru: "Wiersze bez numeru pokolenia",
  wciecia: "Nieregularne wcięcia",
  duplikaty: "Prawdopodobne duplikaty",
  literowki: "Podejrzane literówki i utracone polskie znaki",
  rodzice: "Niejednoznaczni rodzice",
  sprzecznosci: "Sprzeczności i nietypowe dane",
  niepewne: "Wpisy oznaczone w źródle jako niepewne (\"??\", \"?\")",
  plec: "Płeć nieustalona lub ustalona z kontekstu",
  inne: "Pozostałe uwagi parsera",
} as const;
type Sekcja = keyof typeof SEKCJE;
type Uwaga = { sekcja: Sekcja; wiersz: number; tekst: string };

// ───────────────────────────── parsowanie fragmentów ─────────────────────────────

type OsobaRobocza = Osoba & { pokolenie: number };

type FragmentOsoby = {
  imie: string;
  nazwisko: string;
  urodzenie: DataZdarzenia;
  smierc?: DataZdarzenia;
  rodzice?: string;
  niepewne: Set<NonNullable<Osoba["niepewne"]>[number]>;
};

const ZNACZNIKI = /(ur\.|zm\.|ojciec:|matka:|Mother:)/;

function odleglosc(a: string, b: string): number {
  // Odległość Damerau-Levenshteina (z transpozycją sąsiednich liter).
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const koszt = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + koszt);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

function parsujDate(tresc: string, etykieta: string, nr: number, uwaga: (u: Uwaga) => void, niepewne: FragmentOsoby["niepewne"]): DataZdarzenia {
  const m = /^(ok\.\s*)?(\d{2}\.\d{2}\.\d{4}|\d{4})?\s*(.*)$/.exec(tresc.trim())!;
  const [, okolo, data, resztaSurowa] = m;
  const reszta = resztaSurowa.trim();
  const wynik: DataZdarzenia = { dokladnosc: "nieznana" };
  if (data) {
    if (data.length === 4) {
      wynik.wartosc = data;
      wynik.dokladnosc = okolo ? "okolo" : "rok";
    } else {
      const [d, mies, r] = data.split(".");
      wynik.wartosc = `${r}-${mies}-${d}`;
      wynik.dokladnosc = okolo ? "okolo" : "dokladna";
    }
  } else if (okolo) {
    uwaga({ sekcja: "inne", wiersz: nr, tekst: `„${etykieta} ok.” bez daty – zapisano jako datę nieznaną.` });
  }
  if (reszta) {
    if (/\d/.test(reszta)) {
      uwaga({ sekcja: "inne", wiersz: nr, tekst: `Nie rozpoznano formatu daty w „${etykieta} ${tresc.trim()}” – tekst zachowano jako miejsce.` });
    }
    if (reszta.endsWith("?")) {
      niepewne.add("miejsce");
      uwaga({ sekcja: "niepewne", wiersz: nr, tekst: `Niepewne miejsce: „${reszta}”.` });
    }
    if (/^\p{Ll}/u.test(reszta)) {
      uwaga({ sekcja: "literowki", wiersz: nr, tekst: `Miejsce pisane małą literą: „${reszta}” (zachowano bez zmian).` });
    }
    wynik.miejsce = reszta;
  }
  if (!data && !reszta) {
    uwaga({ sekcja: "inne", wiersz: nr, tekst: `Znacznik „${etykieta}” bez daty i miejsca.` });
  }
  return wynik;
}

function parsujOsobe(tekst: string, nr: number, uwaga: (u: Uwaga) => void): FragmentOsoby {
  const czesci = tekst.split(ZNACZNIKI);
  const niepewne: FragmentOsoby["niepewne"] = new Set();
  let nazwa = czesci[0].trim();

  if (nazwa.endsWith("?") && !nazwa.endsWith("??")) {
    nazwa = nazwa.slice(0, -1).trim();
    niepewne.add("wpis");
    uwaga({ sekcja: "niepewne", wiersz: nr, tekst: `Wpis niepewny („?” po nazwisku): „${czesci[0].trim()}”.` });
  }

  const slowa = nazwa.split(/\s+/).filter(Boolean);
  let imie = "";
  let nazwisko = "";
  if (slowa.length === 0) {
    uwaga({ sekcja: "inne", wiersz: nr, tekst: "Pusty wpis osoby." });
  } else if (slowa.length === 1) {
    nazwisko = slowa[0];
    uwaga({ sekcja: "inne", wiersz: nr, tekst: `Jedno słowo zamiast imienia i nazwiska: „${nazwa}” – potraktowano jako nazwisko.` });
  } else {
    const lacznik = slowa.indexOf("-");
    const odNazwiska = lacznik > 1 ? lacznik - 1 : slowa.length - 1;
    imie = slowa.slice(0, odNazwiska).join(" ");
    nazwisko = slowa.slice(odNazwiska).join(" ").replace(/\s+-\s+/g, "-");
    if (lacznik > 1) {
      uwaga({ sekcja: "inne", wiersz: nr, tekst: `Nazwisko dwuczłonowe „${slowa.slice(odNazwiska).join(" ")}” zapisano jako „${nazwisko}”.` });
    }
  }
  if (imie.includes("??")) {
    imie = "";
    niepewne.add("imie");
    uwaga({ sekcja: "niepewne", wiersz: nr, tekst: `Nieznane imię („??”): „${nazwa}”.` });
  }
  if (nazwisko.includes("??")) {
    nazwisko = "";
    niepewne.add("nazwisko");
    uwaga({ sekcja: "niepewne", wiersz: nr, tekst: `Nieznane nazwisko („??”): „${nazwa}”.` });
  }

  const wynik: FragmentOsoby = { imie, nazwisko, urodzenie: { dokladnosc: "nieznana" }, niepewne };
  const rodzice: string[] = [];
  for (let i = 1; i < czesci.length; i += 2) {
    const znacznik = czesci[i];
    const tresc = czesci[i + 1] ?? "";
    if (znacznik === "ur.") wynik.urodzenie = parsujDate(tresc, "ur.", nr, uwaga, niepewne);
    else if (znacznik === "zm.") wynik.smierc = parsujDate(tresc, "zm.", nr, uwaga, niepewne);
    else if (tresc.trim()) rodzice.push(`${znacznik === "ojciec:" ? "ojciec" : "matka"}: ${tresc.trim().replace(/\s+/g, " ")}`);
  }
  if (rodzice.length) {
    const t = rodzice.join("; ");
    wynik.rodzice = t[0].toUpperCase() + t.slice(1) + ".";
  }
  return wynik;
}

// ───────────────────────────── płeć ─────────────────────────────

const MESKIE = new Set(IMIONA_MESKIE);
const ZENSKIE = new Set(IMIONA_ZENSKIE);
const ZNANE_IMIONA = [...IMIONA_MESKIE, ...IMIONA_ZENSKIE];

function plecZImienia(f: { imie: string; nazwisko: string }, nr: number, uwaga: (u: Uwaga) => void): Osoba["plec"] {
  const pierwsze = f.imie.split(" ")[0];
  if (pierwsze) {
    if (MESKIE.has(pierwsze)) return "M";
    if (ZENSKIE.has(pierwsze)) return "K";
    const podpowiedz = ZNANE_IMIONA.map((z) => ({ z, d: odleglosc(normalizuj(pierwsze), normalizuj(z)) }))
      .filter((x) => x.d <= 2 && x.z.length > 3)
      .sort((a, b) => a.d - b.d)[0];
    const utraconeL = /^A[aeu]/.test(pierwsze) ? `Ł${pierwsze.slice(1)}` : null;
    const sugestia = utraconeL
      ? ` Prawdopodobnie utracony znak „Ł”: „${utraconeL}”?`
      : podpowiedz
        ? ` Może chodzi o „${podpowiedz.z}”?`
        : "";
    uwaga({ sekcja: "literowki", wiersz: nr, tekst: `Nierozpoznane imię „${pierwsze}” (${f.imie} ${f.nazwisko}).${sugestia}` });
    if (utraconeL && MESKIE.has(utraconeL)) return "M";
    if (utraconeL && ZENSKIE.has(utraconeL)) return "K";
    if (pierwsze.endsWith("a")) return "K";
    return "nieznana";
  }
  if (/(ska|cka|dzka)$/.test(f.nazwisko)) return "K";
  if (/(ski|cki|dzki)$/.test(f.nazwisko)) return "M";
  return "nieznana";
}

// ───────────────────────────── właściwy import ─────────────────────────────

export type WynikImportu = {
  rodzina: Rodzina;
  uwagi: Uwaga[];
  statystyki: {
    wierszyZrodla: number;
    wierszyPotomkow: number;
    wierszyBezNumeru: number;
    wzmianekMalzonkow: number;
    scalonych: number;
    osob: number;
    malzenstw: number;
    pokolen: number;
  };
};

type Poprawki = {
  osoby?: Record<string, Partial<Osoba>>;
  scal?: { zostaw: string; usun: string }[];
};

function slug(tekst: string): string {
  return normalizuj(tekst).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function importuj(zrodlo: string, poprawki: Poprawki = {}): WynikImportu {
  const uwagi: Uwaga[] = [];
  const uwaga = (u: Uwaga) => uwagi.push(u);
  const wiersze = zrodlo.replace(/\r\n?/g, "\n").split("\n"); // źródło może mieć zakończenia wierszy CRLF (Windows)

  const osoby: OsobaRobocza[] = [];
  const malzenstwa: Malzenstwo[] = [];
  const zajeteId = new Map<string, number>();
  const galezie: Galaz[] = [PIEN];

  const noweId = (f: FragmentOsoby): string => {
    // Rok urodzenia osób żyjących nie może trafić do adresu URL.
    const rokUr = f.urodzenie.wartosc?.slice(0, 4);
    const rok = rokUr && Number(rokUr) > ROK_GRANICZNY_ZYJACYCH && !f.smierc ? undefined : rokUr;
    const baza = [slug(f.imie) || "nn", slug(f.nazwisko) || "nn", rok].filter(Boolean).join("-");
    const n = (zajeteId.get(baza) ?? 0) + 1;
    zajeteId.set(baza, n);
    return n === 1 ? baza : `${baza}-${n}`;
  };

  const utworz = (f: FragmentOsoby, nr: number, pokolenie: number, galazId: string): OsobaRobocza => {
    const o: OsobaRobocza = {
      id: noweId(f),
      imie: f.imie,
      nazwisko: f.nazwisko,
      plec: plecZImienia(f, nr, uwaga),
      urodzenie: f.urodzenie,
      ...(f.smierc ? { smierc: f.smierc } : {}),
      ojciecId: null,
      matkaId: null,
      galazId,
      ...(f.niepewne.size ? { niepewne: [...f.niepewne] } : {}),
      wierszZrodla: nr,
      pokolenie,
    };
    for (const slowo of f.nazwisko.split(/[\s-]+/)) {
      if (/^A[aeu]/.test(slowo)) {
        uwaga({ sekcja: "literowki", wiersz: nr, tekst: `Nazwisko „${f.nazwisko}” (${f.imie}) – prawdopodobnie utracony znak „Ł”: „Ł${slowo.slice(1)}”?` });
      }
    }
    osoby.push(o);
    return o;
  };

  /** Osoby oznaczone w źródle odsyłaczem "[n]" – ta sama osoba może wystąpić przy kilku małżonkach. */
  const odsylacze = new Map<string, OsobaRobocza>();
  /** Małżonkowie potomka w kolejności związków: indeks = kolejność. */
  const malzonkowie = new Map<string, Map<number, OsobaRobocza>>();
  let scalonych = 0;
  let wzmianekMalzonkow = 0;

  const dodajMalzonkow = (glowna: OsobaRobocza, fragmenty: string[], nr: number, wymusKolejnosc?: number) => {
    const lista = malzonkowie.get(glowna.id) ?? new Map<number, OsobaRobocza>();
    malzonkowie.set(glowna.id, lista);
    for (const surowy of fragmenty) {
      wzmianekMalzonkow++;
      const m = /^(?:\((\d+)\)|\[(\d+)\])?\s*(.*)$/.exec(surowy.trim())!;
      const [, wNawiasie, wKwadratowym, reszta] = m;
      const f = parsujOsobe(reszta, nr, uwaga);
      let kolejnosc = wymusKolejnosc ?? (wNawiasie ? Number(wNawiasie) : lista.size + 1);
      if (lista.has(kolejnosc)) {
        uwaga({ sekcja: "inne", wiersz: nr, tekst: `Powtórzony numer związku (${kolejnosc}) u osoby ${glowna.imie} ${glowna.nazwisko} – nadano kolejny wolny.` });
        while (lista.has(kolejnosc)) kolejnosc++;
      }

      let malzonek: OsobaRobocza | undefined;
      if (wKwadratowym) {
        const klucz = `[${wKwadratowym}]|${f.imie}|${f.nazwisko}|${f.urodzenie.wartosc ?? ""}`;
        malzonek = odsylacze.get(klucz);
        if (malzonek) {
          scalonych++;
          uwaga({
            sekcja: "duplikaty",
            wiersz: nr,
            tekst: `${f.imie} ${f.nazwisko} z odsyłaczem „[${wKwadratowym}]” występuje też w wierszu ${malzonek.wierszZrodla} (to samo imię, nazwisko i data urodzenia). Potraktowano jako JEDNĄ osobę („${malzonek.id}”) z kolejnym małżeństwem. Kolejność związków przyjęto według kolejności wierszy – źródło jej nie podaje.`,
          });
        } else {
          malzonek = utworz(f, nr, glowna.pokolenie, glowna.galazId);
          odsylacze.set(klucz, malzonek);
          uwaga({ sekcja: "inne", wiersz: nr, tekst: `Odsyłacz „[${wKwadratowym}]” przy małżonku ${f.imie} ${f.nazwisko} – osoba może występować w kilku wierszach.` });
        }
      } else {
        malzonek = utworz(f, nr, glowna.pokolenie, glowna.galazId);
      }
      if (f.rodzice && !malzonek.notatka) malzonek.notatka = f.rodzice;

      if (malzonek.plec === "nieznana" && glowna.plec !== "nieznana") {
        malzonek.plec = glowna.plec === "M" ? "K" : "M";
        malzonek.niepewne = [...new Set([...(malzonek.niepewne ?? []), "plec" as const])];
        uwaga({ sekcja: "plec", wiersz: nr, tekst: `${malzonek.imie || "NN"} ${malzonek.nazwisko || "NN"} („${malzonek.id}”): płeć przyjęta jako przeciwna do płci małżonka (${glowna.imie} ${glowna.nazwisko}).` });
      }
      lista.set(kolejnosc, malzonek);
      // Kolejność liczona z perspektywy osoby, która ma więcej związków.
      const zwiazkowMalzonka = malzenstwa.filter((x) => x.osobaBId === malzonek!.id).length;
      malzenstwa.push({ osobaAId: glowna.id, osobaBId: malzonek.id, kolejnosc: Math.max(kolejnosc, zwiazkowMalzonka + 1) });
    }
  };

  /** Ostatnia osoba z danego pokolenia – rodzic kolejnych wierszy o numerze pokolenia +1. */
  const ostatni: (OsobaRobocza | undefined)[] = [];
  /** Kolumna znacznika ("|" lub "`") w wierszu osoby – do kontroli wcięć. */
  const pozycje = new Map<string, { kolumna: number; ostatnie: boolean }>();
  let wierszyPotomkow = 0;
  let wierszyBezNumeru = 0;
  /** Po wierszu bez numeru: pokolenie pierwszego kolejnego wiersza; do jego końca rodzice są niepewni. */
  let niepewnyBlok: { pokolenie: number | null; wierszBezNumeru: number } | null = null;

  wiersze.forEach((wiersz, i) => {
    const nr = i + 1;
    if (!wiersz.trim()) return;

    const numerowany = /^([ |`]*)=([a-z])?(\d+)\s+(.*)$/.exec(wiersz) ?? (nr === 1 ? /^()()(\d+)\s+(.*)$/.exec(wiersz) : null);
    if (!numerowany) {
      wierszyBezNumeru++;
      const drugie = /^\s*(\d)(?:st|nd|rd|th) Wife of (.+?)\s+\+\s*(.+)$/.exec(wiersz);
      if (!drugie) {
        uwaga({ sekcja: "bezNumeru", wiersz: nr, tekst: `Nie rozpoznano wiersza – POMINIĘTO: „${wiersz.trim()}”.` });
        return;
      }
      const [, ktora, kogo, zona] = drugie;
      const szukane = kogo.trim().replace(/\s+/g, " ");
      const kandydaci = osoby.filter((o) => `${o.imie} ${o.nazwisko}` === szukane && (o.ojciecId || o.matkaId || o.pokolenie <= 2));
      const maz = kandydaci[kandydaci.length - 1];
      if (!maz) {
        uwaga({ sekcja: "bezNumeru", wiersz: nr, tekst: `„${wiersz.trim()}” – nie znaleziono wcześniej osoby „${szukane}”. Wiersz POMINIĘTO.` });
        return;
      }
      dodajMalzonkow(maz, [zona], nr, Number(ktora));
      niepewnyBlok = { pokolenie: null, wierszBezNumeru: nr };
      const inni = kandydaci.slice(0, -1).map((o) => `wiersz ${o.wierszZrodla} (${o.id})`);
      uwaga({
        sekcja: "bezNumeru",
        wiersz: nr,
        tekst:
          `„${wiersz.trim()}” – wiersz bez numeru pokolenia. Małżeństwo nr ${ktora} przypisano najbliższej poprzedzającej osobie o tym imieniu i nazwisku: wiersz ${maz.wierszZrodla} („${maz.id}”).` +
          (inni.length ? ` Inni kandydaci o tym samym imieniu i nazwisku: ${inni.join(", ")}.` : ""),
      });
      return;
    }

    wierszyPotomkow++;
    const [, wciecie, wariant, numer, tresc] = numerowany;
    const pokolenie = Number(numer);

    if (niepewnyBlok) {
      if (niepewnyBlok.pokolenie === null) niepewnyBlok.pokolenie = pokolenie;
      else if (pokolenie < niepewnyBlok.pokolenie) niepewnyBlok = null;
    }

    const rodzic = pokolenie > 1 ? ostatni[pokolenie - 1] : undefined;
    ostatni.length = pokolenie;

    // Kontrola wcięcia: dziecko stoi 4 znaki za znacznikiem rodzica "|" albo 3 znaki za "`".
    const kolumna = Math.max(wciecie.length - 1, 0);
    const pozycjaRodzica = rodzic ? pozycje.get(rodzic.id) : undefined;
    if (pozycjaRodzica) {
      const oczekiwana = pozycjaRodzica.kolumna + (pozycjaRodzica.ostatnie ? 3 : 4);
      if (kolumna !== oczekiwana) {
        uwaga({
          sekcja: "wciecia",
          wiersz: nr,
          tekst: `Znacznik pokolenia w kolumnie ${kolumna + 1}, a pod rodzicem z wiersza ${rodzic!.wierszZrodla} oczekiwano kolumny ${oczekiwana + 1}. Rodzica ustalono według numeru pokolenia (=${numer}): ${rodzic!.imie} ${rodzic!.nazwisko}.`,
        });
      }
    }

    const [glownyTekst, ...malzonkowieTekst] = tresc.split(/\s+\+\s*/);
    const f = parsujOsobe(glownyTekst, nr, uwaga);
    if (f.rodzice) {
      uwaga({ sekcja: "inne", wiersz: nr, tekst: `„ojciec:/matka:” przy potomku (nie przy małżonku) – zapisano w notatce osoby.` });
    }

    let galazId = rodzic?.galazId ?? PIEN.id;
    if (pokolenie === POKOLENIE_GALEZI) {
      const linia = LINIE[galezie.length - 1];
      if (!linia || linia.imie !== f.imie) {
        throw new Error(`Wiersz ${nr}: oczekiwano założyciela linii „${linia?.imie ?? "(brak)"}”, a jest „${f.imie}”. Zaktualizuj listę LINIE w scripts/import.ts.`);
      }
      galazId = linia.id;
      galezie.push({ id: linia.id, nazwa: `Linia ${linia.dopelniacz}`, kolor: linia.kolor, opis: "" });
    }

    const osoba = utworz(f, nr, pokolenie, galazId);
    if (f.rodzice) osoba.notatka = f.rodzice;
    ostatni[pokolenie] = osoba;
    pozycje.set(osoba.id, pokolenie === 1 ? { kolumna: -3, ostatnie: true } : { kolumna, ostatnie: wciecie.endsWith("`") });

    if (pokolenie > 1 && !rodzic) {
      uwaga({ sekcja: "rodzice", wiersz: nr, tekst: `Brak wcześniejszego wiersza z pokoleniem ${pokolenie - 1} – osoba „${osoba.id}” została bez rodziców.` });
    }
    if (rodzic) {
      const zwiazki = malzonkowie.get(rodzic.id) ?? new Map<number, OsobaRobocza>();
      let drugi: OsobaRobocza | undefined;
      if (wariant) {
        const k = wariant.charCodeAt(0) - 96;
        drugi = zwiazki.get(k);
        if (!drugi) {
          uwaga({ sekcja: "rodzice", wiersz: nr, tekst: `Wariant „=${wariant}${numer}” wskazuje związek nr ${k} osoby ${rodzic.imie} ${rodzic.nazwisko}, ale takiego związku nie ma w jej wierszu. Drugi rodzic nieustalony.` });
        } else if (zwiazki.size === 1) {
          uwaga({ sekcja: "inne", wiersz: nr, tekst: `Wariant „=${wariant}${numer}”, choć ${rodzic.imie} ${rodzic.nazwisko} ma w źródle tylko jeden związek.` });
        }
      } else if (zwiazki.size === 1) {
        drugi = [...zwiazki.values()][0];
      } else if (zwiazki.size > 1) {
        uwaga({
          sekcja: "rodzice",
          wiersz: nr,
          tekst: `${osoba.imie} ${osoba.nazwisko} („${osoba.id}”): rodzic ${rodzic.imie} ${rodzic.nazwisko} ma ${zwiazki.size} związki, a wiersz nie ma wariantu a/b. Drugi rodzic pozostał pusty.`,
        });
      }

      const plecRodzica = rodzic.plec !== "nieznana" ? rodzic.plec : drugi?.plec === "M" ? "K" : drugi?.plec === "K" ? "M" : "nieznana";
      if (plecRodzica === "K") {
        osoba.matkaId = rodzic.id;
        osoba.ojciecId = drugi?.id ?? null;
      } else {
        if (plecRodzica === "nieznana") {
          uwaga({ sekcja: "plec", wiersz: nr, tekst: `Rodzic „${rodzic.id}” ma nieustaloną płeć – wpisano go w polu ojciecId osoby „${osoba.id}”.` });
        }
        osoba.ojciecId = rodzic.id;
        osoba.matkaId = drugi?.id ?? null;
      }

      if (niepewnyBlok && pokolenie === niepewnyBlok.pokolenie) {
        osoba.niepewne = [...new Set([...(osoba.niepewne ?? []), "rodzice" as const])];
        uwaga({
          sekcja: "bezNumeru",
          wiersz: nr,
          tekst: `${osoba.imie} ${osoba.nazwisko} („${osoba.id}”) stoi pod wierszem bez numeru (${niepewnyBlok.wierszBezNumeru}). Według numeru pokolenia (=${numer}) i wcięcia rodzicem jest ${rodzic.imie} ${rodzic.nazwisko} („${rodzic.id}”) i tak zapisano; rodziców oznaczono jako niepewnych.`,
        });
      }
    }

    dodajMalzonkow(osoba, malzonkowieTekst, nr);
  });

  // ── kontrole całościowe ──
  const poId = new Map(osoby.map((o) => [o.id, o]));

  for (const o of osoby) {
    if (o.plec === "nieznana") {
      uwaga({ sekcja: "plec", wiersz: o.wierszZrodla!, tekst: `${o.imie || "NN"} ${o.nazwisko || "NN"} („${o.id}”): płci nie da się ustalić z imienia ani nazwiska.` });
    }
  }

  // Duplikaty: to samo imię, nazwisko i data urodzenia.
  const wgKlucza = new Map<string, OsobaRobocza[]>();
  for (const o of osoby) {
    if (!o.urodzenie.wartosc || !o.imie || !o.nazwisko) continue;
    const k = `${o.imie}|${o.nazwisko}|${o.urodzenie.wartosc}`;
    wgKlucza.set(k, [...(wgKlucza.get(k) ?? []), o]);
  }
  for (const grupa of wgKlucza.values()) {
    if (grupa.length < 2) continue;
    const [pierwsza, ...reszta] = grupa;
    for (const o of reszta) {
      uwaga({
        sekcja: "duplikaty",
        wiersz: o.wierszZrodla!,
        tekst: `${o.imie} ${o.nazwisko}, ur. ${o.urodzenie.wartosc} („${o.id}”) – to samo imię, nazwisko i data urodzenia co w wierszu ${pierwsza.wierszZrodla} („${pierwsza.id}”). Zachowano oba wpisy.`,
      });
    }
  }
  // Ta sama para w dwóch miejscach drzewa (np. małżeństwo dwojga potomków).
  const pary = new Map<string, Malzenstwo>();
  for (const m of malzenstwa) {
    const a = poId.get(m.osobaAId)!;
    const b = poId.get(m.osobaBId)!;
    const k = [`${a.imie} ${a.nazwisko}`, `${b.imie} ${b.nazwisko}`].sort().join(" + ");
    const wczesniej = pary.get(k);
    if (wczesniej && a.imie && b.imie && a.nazwisko && b.nazwisko) {
      const a0 = poId.get(wczesniej.osobaAId)!;
      const b0 = poId.get(wczesniej.osobaBId)!;
      uwaga({
        sekcja: "duplikaty",
        wiersz: a.wierszZrodla!,
        tekst: `Para „${k}” występuje też w wierszu ${a0.wierszZrodla}. Być może to te same osoby (małżeństwo dwojga potomków): „${a.id}” ≟ „${b0.id}”, „${b.id}” ≟ „${a0.id}”. Nie scalono – w razie potrzeby użyj sekcji „scal” w poprawki.json.`,
      });
    } else {
      pary.set(k, m);
    }
  }

  const rdzen = (n: string) => normalizuj(n).replace(/(ska|ski|cka|cki|dzka|dzki|na|ny|a|i|y)$/, "");
  for (const o of osoby) {
    const ojciec = o.ojciecId ? poId.get(o.ojciecId) : undefined;
    const matka = o.matkaId ? poId.get(o.matkaId) : undefined;
    const rodzice = [ojciec, matka].filter((r): r is OsobaRobocza => !!r);
    if (!rodzice.length) continue;
    const nr = o.wierszZrodla!;

    // Nazwisko dziecka: zgodne z nazwiskiem któregoś rodzica, prawie zgodne (literówka?) albo zupełnie inne.
    if (o.nazwisko && rodzice.some((r) => r.nazwisko)) {
      const moje = rdzen(o.nazwisko);
      const odleglosci = rodzice.filter((r) => r.nazwisko).map((r) => ({ r, d: odleglosc(moje, rdzen(r.nazwisko)) }));
      if (!odleglosci.some((x) => x.d === 0)) {
        const bliski = odleglosci.find((x) => x.d <= 2);
        if (bliski) {
          uwaga({ sekcja: "literowki", wiersz: nr, tekst: `Nazwisko „${o.nazwisko}” (${o.imie}) różni się nieznacznie od nazwiska rodzica „${bliski.r.nazwisko}” – literówka?` });
        } else {
          uwaga({ sekcja: "sprzecznosci", wiersz: nr, tekst: `${o.imie} ${o.nazwisko} („${o.id}”) nosi inne nazwisko niż rodzice (${rodzice.map((r) => `${r.imie} ${r.nazwisko}`).join(" i ")}).` });
        }
      }
    }
    const rokDziecka = o.urodzenie.wartosc ? Number(o.urodzenie.wartosc.slice(0, 4)) : null;
    for (const r of rodzice) {
      const rokRodzica = r.urodzenie.wartosc ? Number(r.urodzenie.wartosc.slice(0, 4)) : null;
      if (rokDziecka !== null && rokRodzica !== null && rokDziecka - rokRodzica < 14) {
        uwaga({ sekcja: "sprzecznosci", wiersz: nr, tekst: `${o.imie} ${o.nazwisko} (ur. ${rokDziecka}) – rodzic ${r.imie} ${r.nazwisko} urodzony w ${rokRodzica} (różnica ${rokDziecka - rokRodzica} lat).` });
      }
    }
  }
  // Dziecko z późniejszego związku urodzone przed dzieckiem z wcześniejszego.
  for (const [rodzicId, zwiazki] of malzonkowie) {
    if (zwiazki.size < 2) continue;
    const lata = [...zwiazki.entries()].sort((a, b) => a[0] - b[0]).map(([k, m]) => {
      const dzieci = osoby.filter((o) => (o.ojciecId === rodzicId && o.matkaId === m.id) || (o.matkaId === rodzicId && o.ojciecId === m.id));
      const roczniki = dzieci.map((d) => d.urodzenie.wartosc).filter((w): w is string => !!w).sort();
      return { k, od: roczniki[0], do: roczniki[roczniki.length - 1], wiersz: dzieci[0]?.wierszZrodla };
    });
    for (let i = 1; i < lata.length; i++) {
      const wcz = lata[i - 1];
      const poz = lata[i];
      if (wcz.do && poz.od && poz.od.slice(0, 4) < wcz.do.slice(0, 4)) {
        uwaga({ sekcja: "sprzecznosci", wiersz: poz.wiersz!, tekst: `Dziecko ze związku nr ${poz.k} (ur. ${poz.od}) jest starsze niż dziecko ze związku nr ${wcz.k} (ur. ${wcz.do}) – rodzic „${rodzicId}”. Być może numery związków są zamienione.` });
      }
    }
  }
  for (const m of malzenstwa) {
    const a = poId.get(m.osobaAId)!;
    const b = poId.get(m.osobaBId)!;
    if (a.plec !== "nieznana" && a.plec === b.plec) {
      uwaga({ sekcja: "sprzecznosci", wiersz: a.wierszZrodla!, tekst: `Małżonkowie tej samej płci według imion: ${a.imie} ${a.nazwisko} + ${b.imie} ${b.nazwisko} – sprawdź pisownię imion.` });
    }
  }

  // Osoby żyjące: urodzone po roku granicznym, bez informacji o śmierci.
  for (const o of osoby) {
    const rok = o.urodzenie.wartosc ? Number(o.urodzenie.wartosc.slice(0, 4)) : null;
    if (rok !== null && rok > ROK_GRANICZNY_ZYJACYCH && !o.smierc) o.zyjaca = true;
  }

  // Opisy gałęzi.
  for (const g of galezie.slice(1)) {
    const zalozyciel = osoby.find((o) => o.galazId === g.id)!;
    const linia = LINIE.find((l) => l.id === g.id)!;
    const potomkow = osoby.filter((o) => o.galazId === g.id && (o.ojciecId || o.matkaId)).length - 1;
    const ur = zalozyciel.urodzenie;
    const kiedy = ur.wartosc ? ` (ur. ${ur.dokladnosc === "okolo" ? "ok. " : ""}${ur.wartosc.slice(0, 4)})` : "";
    g.opis = potomkow > 0
      ? `Potomkowie ${linia.dopelniacz} Lulkiewicz${zalozyciel.plec === "K" ? "" : "a"}${kiedy}.`
      : `${zalozyciel.imie} ${zalozyciel.nazwisko}${kiedy} – źródło nie podaje potomków.`;
  }

  // ── poprawki ręczne ──
  let wynikOsoby: Osoba[] = osoby.map((robocza) => {
    const o: Partial<OsobaRobocza> = { ...robocza };
    delete o.pokolenie;
    return o as Osoba;
  });
  let wynikMalzenstwa = malzenstwa;
  for (const { zostaw, usun } of poprawki.scal ?? []) {
    if (!poId.has(zostaw) || !poId.has(usun)) throw new Error(`poprawki.json → scal: nie ma osoby „${poId.has(zostaw) ? usun : zostaw}”.`);
    const zamien = (id: string | null) => (id === usun ? zostaw : id);
    const usuwana = wynikOsoby.find((o) => o.id === usun)!;
    wynikOsoby = wynikOsoby
      .filter((o) => o.id !== usun)
      .map((o) => {
        const scalona = o.id === zostaw
          ? { ...o, ojciecId: o.ojciecId ?? usuwana.ojciecId, matkaId: o.matkaId ?? usuwana.matkaId, notatka: o.notatka ?? usuwana.notatka,
              urodzenie: o.urodzenie.wartosc ? o.urodzenie : usuwana.urodzenie, ...(o.smierc ?? usuwana.smierc ? { smierc: o.smierc ?? usuwana.smierc } : {}),
              ...(o.zyjaca || usuwana.zyjaca ? { zyjaca: true } : {}) }
          : o;
        return { ...scalona, ojciecId: zamien(scalona.ojciecId), matkaId: zamien(scalona.matkaId) };
      });
    const widziane = new Set<string>();
    wynikMalzenstwa = wynikMalzenstwa
      .map((m) => ({ ...m, osobaAId: zamien(m.osobaAId)!, osobaBId: zamien(m.osobaBId)! }))
      .filter((m) => {
        const k = [m.osobaAId, m.osobaBId].sort().join("+");
        if (widziane.has(k)) return false;
        widziane.add(k);
        return true;
      });
    scalonych++;
  }
  for (const [id, pola] of Object.entries(poprawki.osoby ?? {})) {
    const idx = wynikOsoby.findIndex((o) => o.id === id);
    if (idx < 0) throw new Error(`poprawki.json: nie ma osoby o id „${id}” – popraw lub usuń ten wpis.`);
    if ("id" in pola) throw new Error(`poprawki.json: nie można zmieniać pola „id” (osoba „${id}”).`);
    const scalona: Record<string, unknown> = { ...wynikOsoby[idx], ...pola };
    for (const [k, v] of Object.entries(pola)) if (v === null && k !== "ojciecId" && k !== "matkaId") delete scalona[k];
    wynikOsoby[idx] = scalona as Osoba;
  }

  const surowa = {
    galezie,
    osoby: wynikOsoby,
    malzenstwa: wynikMalzenstwa,
  };
  const { rodzina, ostrzezenia } = walidujRodzine(surowa);
  for (const o of ostrzezenia) uwaga({ sekcja: "sprzecznosci", wiersz: 0, tekst: `Walidacja: ${o}` });

  return {
    rodzina,
    uwagi,
    statystyki: {
      wierszyZrodla: wiersze.filter((w) => w.trim()).length,
      wierszyPotomkow,
      wierszyBezNumeru,
      wzmianekMalzonkow,
      scalonych,
      osob: rodzina.osoby.length,
      malzenstw: rodzina.malzenstwa.length,
      pokolen: Math.max(...osoby.map((o) => o.pokolenie)),
    },
  };
}

export function zbudujRaport(w: WynikImportu, poprawki: Poprawki): string {
  const s = w.statystyki;
  const ukryte = w.rodzina.osoby.filter((o) => o.zyjaca).length;
  const linie: string[] = [
    "# Raport importu",
    "",
    "Plik generowany przez `npm run import` – nie edytuj go ręcznie.",
    "Zawiera wszystko, czego skrypt nie potrafił jednoznacznie odczytać z pliku źródłowego (`zrodlo/<slug>.txt`).",
    "Poprawki wpisuj do `poprawki.json` drzewa (opis w README), a następnie uruchom import ponownie.",
    "",
    "## Podsumowanie",
    "",
    `- Wiersze źródła: **${s.wierszyZrodla}** (z numerem pokolenia: ${s.wierszyPotomkow}, bez numeru: ${s.wierszyBezNumeru}).`,
    `- Wzmianki o małżonkach (znak „+”): **${s.wzmianekMalzonkow}**.`,
    `- Osoby scalone (odsyłacze „[n]” i sekcja „scal”): **${s.scalonych}**.`,
    `- Osoby w \`rodzina.json\`: **${s.osob}** = ${s.wierszyPotomkow} + ${s.wzmianekMalzonkow} − ${s.scalonych}.`,
    `- Małżeństwa: **${s.malzenstw}**, pokolenia: **${s.pokolen}**, gałęzie: **${w.rodzina.galezie.length}** (w tym wspólny pień).`,
    `- Osoby z flagą \`zyjaca\` (ur. po ${ROK_GRANICZNY_ZYJACYCH}, bez daty śmierci): **${ukryte}**.`,
    `- Zastosowane poprawki ręczne: **${Object.keys(poprawki.osoby ?? {}).length}** osób, **${(poprawki.scal ?? []).length}** scaleń.`,
    "",
  ];
  for (const [klucz, tytul] of Object.entries(SEKCJE) as [Sekcja, string][]) {
    const wpisy = w.uwagi.filter((u) => u.sekcja === klucz).sort((a, b) => a.wiersz - b.wiersz);
    linie.push(`## ${tytul}`, "");
    if (!wpisy.length) linie.push("_Brak uwag._");
    for (const u of wpisy) linie.push(`- ${u.wiersz ? `**Wiersz ${u.wiersz}:** ` : ""}${u.tekst}`);
    linie.push("");
  }
  const zastosowane = Object.entries(poprawki.osoby ?? {});
  linie.push("## Zastosowane poprawki z poprawki.json", "");
  if (!zastosowane.length && !(poprawki.scal ?? []).length) linie.push("_Brak._");
  for (const [id, pola] of zastosowane) linie.push(`- \`${id}\`: ${Object.entries(pola).map(([k, v]) => `${k} → ${JSON.stringify(v)}`).join(", ")}`);
  for (const sc of poprawki.scal ?? []) linie.push(`- scalono \`${sc.usun}\` → \`${sc.zostaw}\``);
  linie.push("");
  return linie.join("\n");
}

export function wczytajPoprawki(slug: string): Poprawki {
  const plik = sciezkiImportu(slug).poprawki;
  if (!fs.existsSync(plik)) return {};
  const { osoby, scal } = JSON.parse(fs.readFileSync(plik, "utf8"));
  return { osoby, scal };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Podaj slug drzewa, np.: npm run import -- lulkiewicz");
    process.exit(1);
  }
  const sc = sciezkiImportu(slug);
  if (!fs.existsSync(sc.zrodlo)) {
    console.error(`Drzewo „${slug}”: brak pliku ${path.relative(process.cwd(), sc.zrodlo)} – wklej do niego tekst drzewa ze strony źródłowej.`);
    process.exit(1);
  }
  try {
    const poprawki = wczytajPoprawki(slug);
    const wynik = importuj(fs.readFileSync(sc.zrodlo, "utf8"), poprawki);
    fs.writeFileSync(sc.wynik, JSON.stringify(wynik.rodzina, null, 2) + "\n");
    fs.writeFileSync(sc.raport, zbudujRaport(wynik, poprawki));
    const s = wynik.statystyki;
    console.log(`Drzewo „${slug}”: zaimportowano ${s.osob} osób, ${s.malzenstw} małżeństw, ${s.pokolen} pokoleń.`);
    console.log(`Uwagi do przejrzenia: ${wynik.uwagi.length} → ${path.relative(process.cwd(), sc.raport)}`);
  } catch (e) {
    console.error(`Drzewo „${slug}”: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}
