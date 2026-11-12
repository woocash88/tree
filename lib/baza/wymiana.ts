/**
 * Eksport i import drzewa. Dwa formaty:
 *
 *  - JSON „przodkowie-drzewo” (rozszerzenie .json) – pełna wierność: wszystkie pola osób, gałęzie, kolejność związków,
 *    flagi osób żyjących, niepewności z importu. Przeznaczony do kopii zapasowej i przenoszenia drzewa między kontami.
 *    Zawiera dokładnie schemat danych serwisu (lib/schemat.ts), więc import sprawdza go tym samym walidatorem co build.
 *  - GEDCOM 5.5.1 (.ged) – standard wymiany danych genealogicznych (Ancestry, MyHeritage, Gramps, Geneanet…).
 *    Zachowuje osoby, imiona i nazwiska (także rodowe), płeć, daty i miejsca urodzenia i śmierci, notatki, małżeństwa
 *    i dzieci; nie zawiera gałęzi, flag „żyjąca” ani niepewności (przy imporcie flaga wynika z reguły: urodzony po 1925 r.
 *    bez śmierci).
 *
 * Moduł jest czysty (bez Reacta i Firebase).
 */
import { noweId } from "../edycje";
import type { DataZdarzenia, Malzenstwo, Osoba } from "../schemat";
import { POLITYKI_DAT, type PolitykaDat } from "../schemat-drzewa";
import { domyslnieZyjaca } from "../zyjace";
import { DOMYSLNA_GALAZ, sprawdzDane } from "./logika";
import type { DaneDb, MetaDb, Widocznosc } from "./typy";

export const FORMAT = "przodkowie-drzewo";
export const WERSJA_FORMATU = 1;
/** Największy plik, który przyjmujemy do importu. */
export const MAKS_ROZMIAR_PLIKU = 5 * 1024 * 1024;

export type UstawieniaWPliku = { nazwa?: string; opis?: string; region?: string; widocznosc?: Widocznosc; politykaDatZyjacych?: PolitykaDat };
export type WynikImportu = { dane: DaneDb; ustawienia: UstawieniaWPliku; ostrzezenia: string[]; format: "json" | "gedcom" };

const dzienRRRRMMDD = (d: Date) => d.toISOString().slice(0, 10);

/** Nazwa pliku do pobrania, np. „przodkowie-rodzina-nowak-2026-11-12.json”. */
export function nazwaPliku(nazwaDrzewa: string, rozszerzenie: "json" | "ged", teraz = new Date()): string {
  const baza = nazwaDrzewa
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `przodkowie-${baza || "drzewo"}-${dzienRRRRMMDD(teraz)}.${rozszerzenie}`;
}

// ───────────────────────────── JSON ─────────────────────────────

export function eksportJson(meta: Pick<MetaDb, "nazwa" | "opis" | "region" | "widocznosc" | "politykaDatZyjacych">, dane: DaneDb, teraz = new Date()): string {
  return (
    JSON.stringify(
      {
        format: FORMAT,
        wersja: WERSJA_FORMATU,
        wyeksportowano: teraz.toISOString(),
        drzewo: { nazwa: meta.nazwa, opis: meta.opis, region: meta.region, widocznosc: meta.widocznosc, politykaDatZyjacych: meta.politykaDatZyjacych },
        galezie: dane.galezie,
        osoby: dane.osoby,
        malzenstwa: dane.malzenstwa,
      },
      null,
      1,
    ) + "\n"
  );
}

export function importujJson(tekst: string): WynikImportu {
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(tekst.replace(/^﻿/, ""));
  } catch {
    throw new Error("To nie jest poprawny plik JSON.");
  }
  if (!j || typeof j !== "object" || j.format !== FORMAT) throw new Error(`To nie jest plik drzewa z serwisu Przodkowie (brak pola „format”: „${FORMAT}”). Do importu z innych programów użyj formatu GEDCOM (.ged).`);
  if (typeof j.wersja !== "number" || j.wersja > WERSJA_FORMATU) throw new Error("Plik pochodzi z nowszej wersji serwisu i nie może zostać zaimportowany.");
  if (!Array.isArray(j.osoby) || !Array.isArray(j.malzenstwa) || !Array.isArray(j.galezie)) throw new Error("Plik nie zawiera list osób, małżeństw i gałęzi.");
  const dane: DaneDb = { galezie: j.galezie as DaneDb["galezie"], osoby: j.osoby as DaneDb["osoby"], malzenstwa: j.malzenstwa as DaneDb["malzenstwa"] };
  if (!dane.galezie.length) dane.galezie = [{ ...DOMYSLNA_GALAZ }];
  sprawdzDane(dane);
  const d = (j.drzewo ?? {}) as Record<string, unknown>;
  const tekstu = (v: unknown, maks: number) => (typeof v === "string" ? v.slice(0, maks) : undefined);
  const ustawienia: UstawieniaWPliku = {
    nazwa: tekstu(d.nazwa, 120),
    opis: tekstu(d.opis, 1000),
    region: tekstu(d.region, 120),
    widocznosc: d.widocznosc === "publiczne" || d.widocznosc === "prywatne" ? d.widocznosc : undefined,
    politykaDatZyjacych: POLITYKI_DAT.find((p) => p === d.politykaDatZyjacych),
  };
  return { dane, ustawienia, ostrzezenia: [], format: "json" };
}

// ───────────────────────────── GEDCOM: eksport ─────────────────────────────

const MIESIACE = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function dataGedcom(d: DataZdarzenia): string {
  if (!d.wartosc) return "";
  let t = d.wartosc.slice(0, 4);
  if (d.wartosc.length === 10) {
    const [r, m, dz] = d.wartosc.split("-");
    t = `${Number(dz)} ${MIESIACE[Number(m) - 1]} ${r}`;
  }
  return d.dokladnosc === "okolo" ? `ABT ${t}` : t;
}

/** Zapisuje wartość w jednej lub kilku liniach GEDCOM: nowe wiersze jako CONT, zbyt długie jako CONC. */
function linie(poziom: number, tag: string, wartosc: string, xref?: string): string[] {
  const wynik: string[] = [];
  const wiersze = wartosc.replace(/\r/g, "").split("\n");
  wiersze.forEach((w, i) => {
    const znaki = Array.from(w.replace(/@/g, "@@"));
    const kawalki: string[] = [];
    for (let k = 0; k < Math.max(znaki.length, 1); k += 200) kawalki.push(znaki.slice(k, k + 200).join(""));
    kawalki.forEach((kawalek, j) => {
      if (i === 0 && j === 0) wynik.push(`${poziom}${xref ? ` ${xref}` : ""} ${tag}${kawalek ? ` ${kawalek}` : ""}`);
      else wynik.push(`${poziom + 1} ${j === 0 ? "CONT" : "CONC"}${kawalek ? ` ${kawalek}` : ""}`);
    });
  });
  return wynik;
}

function zdarzenie(tag: string, d: DataZdarzenia | undefined, tylkoTak: boolean): string[] {
  if (!d) return [];
  const data = dataGedcom(d);
  if (!data && !d.miejsce) return tylkoTak ? [`1 ${tag} Y`] : [];
  return [`1 ${tag}`, ...(data ? [`2 DATE ${data}`] : []), ...(d.miejsce ? linie(2, "PLAC", d.miejsce) : [])];
}

export function eksportGedcom(meta: Pick<MetaDb, "nazwa">, dane: DaneDb, teraz = new Date()): string {
  const poId = new Map(dane.osoby.map((o) => [o.id, o]));
  const xrefOsoby = new Map(dane.osoby.map((o, i) => [o.id, `@I${i + 1}@`]));

  // Rodziny: każde małżeństwo oraz każda para rodziców (lub pojedynczy rodzic) z dziećmi.
  type Rodzina = { m?: string; z?: string; dzieci: string[]; kolejnosc: number };
  const rodziny = new Map<string, Rodzina>();
  const klucz = (a: string | null, b: string | null) => [a ?? "", b ?? ""].sort().join("|");
  const rolePo = (a: string, b: string | null): { m?: string; z?: string } => {
    const A = poId.get(a);
    const B = b ? poId.get(b) : undefined;
    if (!B) return A?.plec === "K" ? { z: a } : { m: a };
    if (A?.plec === "K" || B.plec === "M") return { m: b!, z: a };
    return { m: a, z: b! };
  };
  for (const m of dane.malzenstwa) {
    const r = rodziny.get(klucz(m.osobaAId, m.osobaBId));
    if (r) r.kolejnosc = Math.min(r.kolejnosc, m.kolejnosc);
    else rodziny.set(klucz(m.osobaAId, m.osobaBId), { ...rolePo(m.osobaAId, m.osobaBId), dzieci: [], kolejnosc: m.kolejnosc });
  }
  for (const o of dane.osoby) {
    if (!o.ojciecId && !o.matkaId) continue;
    const k = klucz(o.ojciecId, o.matkaId);
    let r = rodziny.get(k);
    if (!r) {
      r = { m: o.ojciecId ?? undefined, z: o.matkaId ?? undefined, dzieci: [], kolejnosc: 1 };
      rodziny.set(k, r);
    }
    r.dzieci.push(o.id);
  }
  const lista = [...rodziny.values()].sort((a, b) => a.kolejnosc - b.kolejnosc);
  const xrefRodziny = new Map(lista.map((r, i) => [r, `@F${i + 1}@`]));
  const jakoMaz = new Map<string, string[]>();
  const jakoDziecko = new Map<string, string>();
  for (const r of lista) {
    for (const s of [r.m, r.z]) if (s) jakoMaz.set(s, [...(jakoMaz.get(s) ?? []), xrefRodziny.get(r)!]);
    for (const d of r.dzieci) if (!jakoDziecko.has(d)) jakoDziecko.set(d, xrefRodziny.get(r)!);
  }

  const w: string[] = ["0 HEAD", "1 SOUR Przodkowie", "2 NAME Przodkowie", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8", "1 LANG Polish", ...linie(1, "FILE", `${meta.nazwa}`), `1 DATE ${teraz.getUTCDate()} ${MIESIACE[teraz.getUTCMonth()]} ${teraz.getUTCFullYear()}`];
  for (const o of dane.osoby) {
    w.push(`0 ${xrefOsoby.get(o.id)} INDI`);
    const imie = o.imie ?? "";
    if (o.nazwiskoRodowe) {
      w.push(`1 NAME ${imie} /${o.nazwiskoRodowe}/`, `2 SURN ${o.nazwiskoRodowe}`, "2 TYPE birth");
      w.push(`1 NAME ${imie} /${o.nazwisko}/`, `2 SURN ${o.nazwisko}`, "2 TYPE married");
    } else {
      w.push(`1 NAME ${imie} /${o.nazwisko}/`);
    }
    if (imie) w.push(`2 GIVN ${imie}`);
    w.push(`1 SEX ${o.plec === "M" ? "M" : o.plec === "K" ? "F" : "U"}`);
    w.push(...zdarzenie("BIRT", o.urodzenie.wartosc || o.urodzenie.miejsce ? o.urodzenie : undefined, false));
    w.push(...zdarzenie("DEAT", o.smierc, true));
    if (o.miejsce) w.push("1 RESI", ...linie(2, "PLAC", o.miejsce));
    if (o.notatka) w.push(...linie(1, "NOTE", o.notatka));
    for (const f of jakoMaz.get(o.id) ?? []) w.push(`1 FAMS ${f}`);
    const fc = jakoDziecko.get(o.id);
    if (fc) w.push(`1 FAMC ${fc}`);
  }
  for (const r of lista) {
    w.push(`0 ${xrefRodziny.get(r)} FAM`);
    if (r.m) w.push(`1 HUSB ${xrefOsoby.get(r.m)}`);
    if (r.z) w.push(`1 WIFE ${xrefOsoby.get(r.z)}`);
    for (const d of r.dzieci) w.push(`1 CHIL ${xrefOsoby.get(d)}`);
  }
  w.push("0 TRLR");
  return w.join("\r\n") + "\r\n";
}

// ───────────────────────────── GEDCOM: import ─────────────────────────────

type Wezel = { poziom: number; xref?: string; tag: string; wartosc: string; dzieci: Wezel[] };

function wezly(tekst: string): Wezel[] {
  const korzenie: Wezel[] = [];
  const stos: Wezel[] = [];
  for (const surowa of tekst.replace(/^﻿/, "").split(/\r\n|\n|\r/)) {
    const linia = surowa.trimStart();
    if (!linia) continue;
    const m = /^(\d+)\s+(?:(@[^@\s]+@)\s+)?(\S+)(?:\s(.*))?$/.exec(linia);
    if (!m) continue;
    const w: Wezel = { poziom: Number(m[1]), xref: m[2], tag: m[3].toUpperCase(), wartosc: m[4] ?? "", dzieci: [] };
    if (w.tag === "CONC" || w.tag === "CONT") {
      // Ciąg dalszy wartości najbliższego węzła nadrzędnego.
      const rodzic = stos[w.poziom - 1];
      if (rodzic) rodzic.wartosc += (w.tag === "CONT" ? "\n" : "") + w.wartosc;
      continue;
    }
    while (stos.length && stos[stos.length - 1].poziom >= w.poziom) stos.pop();
    if (stos.length) stos[stos.length - 1].dzieci.push(w);
    else korzenie.push(w);
    stos[w.poziom] = w;
    stos.length = w.poziom + 1;
  }
  return korzenie;
}

const dziecko = (w: Wezel, tag: string) => w.dzieci.find((d) => d.tag === tag);
const wszystkie = (w: Wezel, tag: string) => w.dzieci.filter((d) => d.tag === tag);
const odkoduj = (v: string) => v.replace(/@@/g, "@").trim();

function dataZGedcom(opis: string, uproszczenia: { n: number }): { wartosc: string; dokladnosc: DataZdarzenia["dokladnosc"] } | null {
  let t = opis.trim().toUpperCase().replace(/\s+/g, " ");
  if (!t) return null;
  let okolo = false;
  const kw = /^(ABT|ABOUT|CAL|EST|BEF|BEFORE|AFT|AFTER|FROM|TO|BET|BETWEEN|INT)\s+(.*)$/.exec(t);
  if (kw) {
    okolo = true;
    if (!/^(ABT|ABOUT|CAL|EST)$/.test(kw[1])) uproszczenia.n++;
    t = kw[2].split(/ (?:AND|TO) /)[0];
  }
  t = t.replace(/^\((.*)\)$/, "$1").replace(/\s*\/\d+$/, "");
  const pelna = /^(\d{1,2}) ([A-Z]{3}) (\d{3,4})$/.exec(t);
  if (pelna && MIESIACE.includes(pelna[2])) {
    const m = String(MIESIACE.indexOf(pelna[2]) + 1).padStart(2, "0");
    const d = pelna[1].padStart(2, "0");
    const rok = pelna[3].padStart(4, "0");
    const poprawna = new Date(Date.UTC(Number(rok), Number(m) - 1, Number(d)));
    if (poprawna.getUTCFullYear() === Number(rok) && poprawna.getUTCMonth() === Number(m) - 1 && poprawna.getUTCDate() === Number(d)) return { wartosc: `${rok}-${m}-${d}`, dokladnosc: okolo ? "okolo" : "dokladna" };
  }
  const miesiac = /^([A-Z]{3}) (\d{3,4})$/.exec(t);
  if (miesiac && MIESIACE.includes(miesiac[1])) {
    uproszczenia.n++;
    return { wartosc: miesiac[2].padStart(4, "0"), dokladnosc: okolo ? "okolo" : "rok" };
  }
  const rok = /^(\d{3,4})$/.exec(t);
  if (rok) return { wartosc: rok[1].padStart(4, "0"), dokladnosc: okolo ? "okolo" : "rok" };
  uproszczenia.n++;
  return null;
}

function zdarzenieZGedcom(w: Wezel | undefined, uproszczenia: { n: number }): DataZdarzenia | undefined {
  if (!w) return undefined;
  const d = dziecko(w, "DATE");
  const p = dziecko(w, "PLAC");
  const data = d ? dataZGedcom(odkoduj(d.wartosc), uproszczenia) : null;
  const miejsce = p ? odkoduj(p.wartosc).split(",").map((s) => s.trim()).filter(Boolean).join(", ") : "";
  const wynik: DataZdarzenia = data ? { wartosc: data.wartosc, dokladnosc: data.dokladnosc } : { dokladnosc: "nieznana" };
  if (miejsce) wynik.miejsce = miejsce;
  return wynik;
}

function rozbierzImie(wartosc: string): { imie: string; nazwisko: string } {
  const m = /^(.*?)\/(.*?)\/(.*)$/.exec(wartosc);
  if (!m) return { imie: odkoduj(wartosc), nazwisko: "" };
  return { imie: [m[1], m[3]].map((s) => s.trim()).filter(Boolean).join(" "), nazwisko: m[2].trim() };
}

export function importujGedcom(tekst: string): WynikImportu {
  if (tekst.includes("�")) throw new Error("Plik GEDCOM ma nieczytelne znaki. Zapisz go w kodowaniu UTF-8 (w ustawieniach eksportu programu wybierz „UTF-8” zamiast ANSEL/ANSI).");
  const korzenie = wezly(tekst);
  if (!korzenie.some((w) => w.tag === "INDI")) throw new Error("W pliku nie znaleziono żadnych osób (rekordów INDI). Czy to na pewno plik GEDCOM?");
  const ostrzezenia: string[] = [];
  const uproszczenia = { n: 0 };
  const notatki = new Map(korzenie.filter((w) => w.tag === "NOTE" && w.xref).map((w) => [w.xref!, w.wartosc]));

  const zajete = new Set<string>();
  const idPo = new Map<string, string>();
  const osoby: Osoba[] = [];
  let bezImienia = 0;
  for (const w of korzenie.filter((x) => x.tag === "INDI")) {
    const imiona = wszystkie(w, "NAME").map((n) => ({ ...rozbierzImie(odkoduj(n.wartosc)), typ: (dziecko(n, "TYPE")?.wartosc ?? "").toLowerCase(), wezel: n }));
    const dodatkowe = (n: (typeof imiona)[number], tag: string) => dziecko(n.wezel, tag)?.wartosc.trim();
    const zamezne = imiona.find((n) => n.typ === "married");
    const urodzeniowe = imiona.find((n) => n !== zamezne && (n.typ === "" || n.typ === "birth")) ?? imiona.find((n) => n !== zamezne);
    const glowne = urodzeniowe ?? zamezne;
    const imie = (glowne?.imie || (glowne ? dodatkowe(glowne, "GIVN") : "") || "").trim();
    let nazwisko = glowne?.nazwisko || (glowne ? dodatkowe(glowne, "SURN") : "") || "";
    let rodowe: string | undefined;
    if (zamezne && urodzeniowe && zamezne.nazwisko && zamezne.nazwisko !== urodzeniowe.nazwisko) {
      rodowe = urodzeniowe.nazwisko || undefined;
      nazwisko = zamezne.nazwisko;
    }
    if (!imie && !nazwisko) bezImienia++;
    const sex = dziecko(w, "SEX")?.wartosc.trim().toUpperCase();
    const plec: Osoba["plec"] = sex === "M" ? "M" : sex === "F" ? "K" : "nieznana";
    const urodzenie = zdarzenieZGedcom(dziecko(w, "BIRT") ?? dziecko(w, "CHR") ?? dziecko(w, "BAPM"), uproszczenia) ?? { dokladnosc: "nieznana" as const };
    const smiercWezel = dziecko(w, "DEAT") ?? dziecko(w, "BURI") ?? dziecko(w, "CREM");
    const smierc = smiercWezel ? (zdarzenieZGedcom(smiercWezel, uproszczenia) ?? { dokladnosc: "nieznana" as const }) : undefined;
    const miejsce = dziecko(dziecko(w, "RESI") ?? ({ dzieci: [] } as unknown as Wezel), "PLAC");
    const noty = wszystkie(w, "NOTE")
      .map((n) => (/^@[^@]+@$/.test(n.wartosc.trim()) ? (notatki.get(n.wartosc.trim()) ?? "") : n.wartosc))
      .map(odkoduj)
      .filter(Boolean)
      .join("\n\n");
    const zyjaca = domyslnieZyjaca(urodzenie, smierc);
    const rok = urodzenie.wartosc ? Number(urodzenie.wartosc.slice(0, 4)) : null;
    const id = noweId(imie, nazwisko, zyjaca ? null : rok, zajete);
    zajete.add(id);
    if (w.xref) idPo.set(w.xref, id);
    const o: Osoba = { id, imie, nazwisko, plec, urodzenie, ojciecId: null, matkaId: null, galazId: DOMYSLNA_GALAZ.id };
    if (rodowe) o.nazwiskoRodowe = rodowe;
    if (smierc) o.smierc = smierc;
    if (miejsce?.wartosc) o.miejsce = odkoduj(miejsce.wartosc);
    if (noty) o.notatka = noty;
    if (zyjaca) o.zyjaca = true;
    osoby.push(o);
  }
  const poId = new Map(osoby.map((o) => [o.id, o]));

  const malzenstwa: Malzenstwo[] = [];
  const zwiazki = new Map<string, number>();
  let wieleRodzicow = 0;
  let brakujace = 0;
  for (const f of korzenie.filter((x) => x.tag === "FAM")) {
    const maz = idPo.get(dziecko(f, "HUSB")?.wartosc.trim() ?? "");
    const zona = idPo.get(dziecko(f, "WIFE")?.wartosc.trim() ?? "");
    if (dziecko(f, "HUSB") && !maz) brakujace++;
    if (dziecko(f, "WIFE") && !zona) brakujace++;
    if (maz && zona && maz !== zona) {
      const k = Math.max(zwiazki.get(maz) ?? 0, zwiazki.get(zona) ?? 0) + 1;
      zwiazki.set(maz, k);
      zwiazki.set(zona, k);
      if (!malzenstwa.some((m) => (m.osobaAId === maz && m.osobaBId === zona) || (m.osobaAId === zona && m.osobaBId === maz))) malzenstwa.push({ osobaAId: maz, osobaBId: zona, kolejnosc: k });
    }
    for (const c of wszystkie(f, "CHIL")) {
      const dz = poId.get(idPo.get(c.wartosc.trim()) ?? "");
      if (!dz) {
        brakujace++;
        continue;
      }
      if (dz.ojciecId || dz.matkaId) {
        wieleRodzicow++;
        continue;
      }
      dz.ojciecId = maz && maz !== dz.id ? maz : null;
      dz.matkaId = zona && zona !== dz.id ? zona : null;
    }
  }
  if (bezImienia) ostrzezenia.push(`${bezImienia} osób nie miało imienia ani nazwiska – zaimportowano je jako „NN”.`);
  if (uproszczenia.n) ostrzezenia.push(`${uproszczenia.n} dat zapisanych w sposób, którego serwis nie obsługuje (np. przedziały, same miesiące), uproszczono do roku albo pominięto.`);
  if (wieleRodzicow) ostrzezenia.push(`${wieleRodzicow} osób należało do kilku rodzin (np. adopcja) – zachowano pierwszą z nich.`);
  if (brakujace) ostrzezenia.push(`${brakujace} odwołań do osób, których nie ma w pliku, pominięto.`);

  const dane: DaneDb = { galezie: [{ ...DOMYSLNA_GALAZ }], osoby, malzenstwa };
  sprawdzDane(dane);
  const naglowek = korzenie.find((w) => w.tag === "HEAD");
  const plik = naglowek && dziecko(naglowek, "FILE")?.wartosc;
  return { dane, ustawienia: plik ? { nazwa: odkoduj(plik).replace(/\.(ged|gedcom)$/i, "").slice(0, 120) } : {}, ostrzezenia, format: "gedcom" };
}

/** Wybiera format po zawartości (JSON zaczyna się od „{”, GEDCOM od „0 HEAD”). */
export function importujPlik(tekst: string): WynikImportu {
  const t = tekst.replace(/^﻿/, "").trimStart();
  if (t.startsWith("{")) return importujJson(t);
  if (/^0\s+HEAD/i.test(t)) return importujGedcom(t);
  throw new Error("Nie rozpoznano formatu pliku. Obsługiwane są pliki .json z serwisu Przodkowie oraz .ged (GEDCOM).");
}
