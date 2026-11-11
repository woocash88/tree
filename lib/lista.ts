/**
 * Lista gałęzi w układzie „outline”: jeden wiersz na jednostkę rodzinną (osoba z rodu + małżonkowie),
 * wcięcie według pokolenia, zwijanie z licznikiem potomków. Czysta logika – bez Reacta.
 */
import { rozwinDoPoziomu, type Las } from "./drzewo";

export const DOMYSLNE_POKOLENIA = 3;

export type WierszListy = {
  /** id jednostki = id osoby z rodu. */
  id: string;
  poziom: number;
  maDzieci: boolean;
  rozwiniety: boolean;
  /** Liczba wszystkich osób w poddrzewie (dzieci, wnuki… wraz z ich małżonkami). */
  potomkow: number;
  malzonkowie: { id: string; kolejnosc: number; odsylacz: boolean }[];
  rodzicId: string | null;
};

/** Widoczne wiersze w kolejności wyświetlania (przejście w głąb). */
export function zbudujWiersze(las: Las, korzenie: string[], rozwiniete: ReadonlySet<string>): WierszListy[] {
  const wynik: WierszListy[] = [];
  const idz = (id: string, poziom: number, rodzicId: string | null) => {
    const j = las.jednostki.get(id)!;
    const otwarty = rozwiniete.has(id) && j.dzieci.length > 0;
    wynik.push({
      id,
      poziom,
      maDzieci: j.dzieci.length > 0,
      rozwiniety: otwarty,
      potomkow: j.potomkow,
      malzonkowie: j.partnerzy.map((p) => ({ id: p.id, kolejnosc: p.kolejnosc, odsylacz: p.odsylacz })),
      rodzicId,
    });
    if (otwarty) for (const d of j.dzieci) idz(d, poziom + 1, id);
  };
  for (const k of korzenie) idz(k, 0, null);
  return wynik;
}

// ───────────────────────────── stan w adresie ─────────────────────────────
//
// ?rozw=4,+jan-kowalski,-anna-nowak
//   pierwsza liczba – ile pokoleń rozwinąć od korzeni (domyślnie 3),
//   +id / -id       – ręcznie rozwinięta / zwinięta jednostka względem tego poziomu.

const LIMIT_ROZNIC = 150;

export function kodujRozwiniecie(las: Las, korzenie: string[], rozwiniete: ReadonlySet<string>, poziomy: number): string {
  const baza = rozwinDoPoziomu(las, korzenie, poziomy);
  const otwarte = [...rozwiniete].filter((id) => !baza.has(id));
  const zamkniete = [...baza].filter((id) => !rozwiniete.has(id));
  const roznice = otwarte.length + zamkniete.length <= LIMIT_ROZNIC ? [...otwarte.map((id) => `+${id}`), ...zamkniete.map((id) => `-${id}`)] : [];
  if (poziomy === DOMYSLNE_POKOLENIA && !roznice.length) return "";
  return [String(poziomy), ...roznice].join(",");
}

export function dekodujRozwiniecie(las: Las, korzenie: string[], param: string | null, maxPoziomow: number): { rozwiniete: Set<string>; poziomy: number } {
  const tokeny = (param ?? "").split(",").filter(Boolean);
  let poziomy = Math.min(DOMYSLNE_POKOLENIA, maxPoziomow);
  if (tokeny[0] && /^\d+$/.test(tokeny[0])) poziomy = Math.max(1, Math.min(maxPoziomow, Number(tokeny.shift())));
  const rozwiniete = rozwinDoPoziomu(las, korzenie, poziomy);
  for (const t of tokeny) {
    const id = t.slice(1);
    const j = las.jednostki.get(id);
    if (!j || !j.dzieci.length) continue;
    if (t[0] === "+") rozwiniete.add(id);
    else if (t[0] === "-") rozwiniete.delete(id);
  }
  return { rozwiniete, poziomy };
}

/** Rozwija najgłębszą potrzebną ścieżkę: wszystkie jednostki-przodkowie podanej jednostki. */
export function rozwinDo(rozwiniete: ReadonlySet<string>, przodkowie: string[]): Set<string> {
  const nowe = new Set(rozwiniete);
  przodkowie.forEach((id) => nowe.add(id));
  return nowe;
}
