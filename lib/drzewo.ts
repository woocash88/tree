/**
 * Model „jednostek rodzinnych” dla płótna drzewa.
 *
 * Jednostka = osoba z rodu + jej małżonkowie, rysowani obok siebie jako jeden węzeł.
 * Dzieci (kolejne jednostki) wiszą pod parą, z której pochodzą. Dzięki temu relacja
 * jednostka → jednostki dzieci jest zawsze lasem i można ją oddać gotowemu algorytmowi
 * układu drzew (d3-flextree), a małżonkowie nigdy nie rozjeżdżają się na boki.
 */
import { flextree } from "d3-flextree";

export type OsobaDrzewa = {
  id: string;
  imie: string;
  nazwisko: string;
  /** Gotowy opis lat życia ("1891–1973") – pusty dla osób z ukrytymi datami. */
  lata: string;
  galazId: string;
  ojciecId: string | null;
  matkaId: string | null;
  zmarla: boolean;
  niepewna: boolean;
};

export type ParaDrzewa = { a: string; b: string; kolejnosc: number };

export type Partner = {
  id: string;
  kolejnosc: number;
  /** Partner ma własnych rodziców w drzewie – tu jest tylko odsyłaczem do swojej karty. */
  odsylacz: boolean;
};

export type Jednostka = {
  id: string;
  glowna: string;
  partnerzy: Partner[];
  rodzicId: string | null;
  /** Indeks partnera w jednostce rodziców, z którym główna osoba rodzica ma to dziecko; -1 = brak drugiego rodzica. */
  zPartnerem: number;
  dzieci: string[];
  glebokosc: number;
  /** Liczba wszystkich osób w poddrzewie (bez samej jednostki). */
  potomkow: number;
};

export type Las = {
  jednostki: Map<string, Jednostka>;
  korzenie: string[];
  /** id osoby → id jednostki, w której ma swoją „właściwą” kartę. */
  jednostkaOsoby: Map<string, string>;
  maxGlebokosc: number;
};

export function zbudujLas(osoby: OsobaDrzewa[], pary: ParaDrzewa[]): Las {
  const poId = new Map(osoby.map((o) => [o.id, o]));
  const maRodzicow = (id: string) => {
    const o = poId.get(id)!;
    return !!(o.ojciecId || o.matkaId);
  };
  const zwiazki = new Map<string, { id: string; kolejnosc: number }[]>();
  for (const p of pary) {
    if (!poId.has(p.a) || !poId.has(p.b)) continue;
    zwiazki.set(p.a, [...(zwiazki.get(p.a) ?? []), { id: p.b, kolejnosc: p.kolejnosc }]);
    zwiazki.set(p.b, [...(zwiazki.get(p.b) ?? []), { id: p.a, kolejnosc: p.kolejnosc }]);
  }

  // Kto dostaje własną jednostkę: każdy, kto ma rodziców, oraz osoby bez rodziców,
  // które nie są „dołączonym” małżonkiem kogoś innego.
  const wlasciciele = new Set<string>();
  for (const o of osoby) {
    if (maRodzicow(o.id)) {
      wlasciciele.add(o.id);
      continue;
    }
    const partnerzy = zwiazki.get(o.id) ?? [];
    const dolaczona = partnerzy.some((p) => maRodzicow(p.id) || wlasciciele.has(p.id));
    if (!dolaczona) wlasciciele.add(o.id);
  }

  const jednostki = new Map<string, Jednostka>();
  const jednostkaOsoby = new Map<string, string>();
  for (const o of osoby) {
    if (!wlasciciele.has(o.id)) continue;
    const partnerzy = (zwiazki.get(o.id) ?? [])
      .slice()
      .sort((a, b) => a.kolejnosc - b.kolejnosc)
      .map((p) => ({ ...p, odsylacz: wlasciciele.has(p.id) }));
    jednostki.set(o.id, { id: o.id, glowna: o.id, partnerzy, rodzicId: null, zPartnerem: -1, dzieci: [], glebokosc: 0, potomkow: 0 });
    jednostkaOsoby.set(o.id, o.id);
  }
  for (const j of jednostki.values()) {
    for (const p of j.partnerzy) if (!jednostkaOsoby.has(p.id)) jednostkaOsoby.set(p.id, j.id);
  }

  for (const o of osoby) {
    const j = jednostki.get(o.id);
    if (!j) continue;
    // Dziecko wisi pod jednostką ojca, a gdy go brak – matki.
    const rodzic = [o.ojciecId, o.matkaId].find((r) => r && jednostkaOsoby.has(r));
    if (!rodzic) continue;
    const jr = jednostki.get(jednostkaOsoby.get(rodzic)!)!;
    const drugi = o.ojciecId === rodzic ? o.matkaId : o.ojciecId;
    j.rodzicId = jr.id;
    if (jr.glowna === rodzic) j.zPartnerem = jr.partnerzy.findIndex((p) => p.id === drugi);
    else j.zPartnerem = jr.partnerzy.findIndex((p) => p.id === rodzic);
    jr.dzieci.push(j.id);
  }

  const korzenie = [...jednostki.values()].filter((j) => !j.rodzicId).map((j) => j.id);
  let maxGlebokosc = 0;
  const policz = (id: string, glebokosc: number): number => {
    const j = jednostki.get(id)!;
    j.glebokosc = glebokosc;
    maxGlebokosc = Math.max(maxGlebokosc, glebokosc);
    let suma = 0;
    for (const d of j.dzieci) {
      const dz = jednostki.get(d)!;
      suma += 1 + dz.partnerzy.filter((p) => !p.odsylacz).length + policz(d, glebokosc + 1);
    }
    j.potomkow = suma;
    return suma;
  };
  korzenie.forEach((k) => policz(k, 0));

  return { jednostki, korzenie, jednostkaOsoby, maxGlebokosc };
}

// ───────────────────────────── geometria ─────────────────────────────

export const KARTA_SZER = 172;
export const KARTA_WYS = 62;
export const ODSTEP_PARY = 22;
export const ODSTEP_POKOLEN = 74;
const ODSTEP_RODZENSTWA = 22;
const ODSTEP_KUZYNOW = 44;

export type KartaWJednostce = { osobaId: string; x: number; rola: "glowna" | "partner"; kolejnosc?: number; odsylacz?: boolean };

/** Rozmieszczenie kart wewnątrz jednostki: [żona 1] [osoba] [żona 2] … albo [osoba] [małżonek]. */
export function kartyJednostki(j: Jednostka): { karty: KartaWJednostce[]; szerokosc: number; uchwyty: number[]; uchwytGlownej: number } {
  const kolejne: KartaWJednostce[] = [];
  const partner = (p: Partner): KartaWJednostce => ({ osobaId: p.id, x: 0, rola: "partner", kolejnosc: p.kolejnosc, odsylacz: p.odsylacz });
  const glowna: KartaWJednostce = { osobaId: j.glowna, x: 0, rola: "glowna" };
  if (j.partnerzy.length >= 2) kolejne.push(partner(j.partnerzy[0]), glowna, ...j.partnerzy.slice(1).map(partner));
  else kolejne.push(glowna, ...j.partnerzy.map(partner));
  kolejne.forEach((k, i) => (k.x = i * (KARTA_SZER + ODSTEP_PARY)));
  const szerokosc = kolejne.length * KARTA_SZER + (kolejne.length - 1) * ODSTEP_PARY;
  const xGlownej = glowna.x;
  // Uchwyt pary = środek odstępu między główną osobą a danym partnerem (dla dalszych: środek karty partnera).
  const uchwyty = j.partnerzy.map((p) => {
    const k = kolejne.find((x) => x.rola === "partner" && x.osobaId === p.id)!;
    if (Math.abs(k.x - xGlownej) === KARTA_SZER + ODSTEP_PARY) return (Math.max(k.x, xGlownej) + Math.min(k.x, xGlownej) + KARTA_SZER) / 2;
    return k.x + KARTA_SZER / 2;
  });
  return { karty: kolejne, szerokosc, uchwyty, uchwytGlownej: xGlownej + KARTA_SZER / 2 };
}

export type Pozycja = { id: string; x: number; y: number; szerokosc: number };

type WezelUkladu = { id: string | null; szerokosc: number; dzieci: WezelUkladu[] };

/**
 * Układ widocznej części lasu. `rozwiniete` – jednostki, których dzieci są pokazane;
 * `korzenie` – od których jednostek zacząć (całe drzewo albo jedna gałąź).
 */
export function ulozLas(las: Las, korzenie: string[], rozwiniete: ReadonlySet<string>): Pozycja[] {
  const buduj = (id: string): WezelUkladu => {
    const j = las.jednostki.get(id)!;
    return {
      id,
      szerokosc: kartyJednostki(j).szerokosc,
      dzieci: rozwiniete.has(id) ? j.dzieci.map(buduj) : [],
    };
  };
  const korzen: WezelUkladu = { id: null, szerokosc: 0, dzieci: korzenie.map(buduj) };
  const uklad = flextree<WezelUkladu>({
    children: (d) => d.dzieci,
    nodeSize: (n) => (n.data.id === null ? [0, 0] : [n.data.szerokosc, KARTA_WYS + ODSTEP_POKOLEN]),
    spacing: (a, b) => (a.parent === b.parent ? ODSTEP_RODZENSTWA : ODSTEP_KUZYNOW),
  });
  const drzewo = uklad.hierarchy(korzen);
  uklad(drzewo);
  const wynik: Pozycja[] = [];
  drzewo.each((n) => {
    if (n.data.id !== null) wynik.push({ id: n.data.id, x: n.x - n.data.szerokosc / 2, y: n.y, szerokosc: n.data.szerokosc });
  });
  return wynik;
}

/** Jednostki, które trzeba rozwinąć, aby jednostka `id` była widoczna (jej przodkowie). */
export function przodkowieJednostki(las: Las, id: string): string[] {
  const wynik: string[] = [];
  let j = las.jednostki.get(id);
  while (j?.rodzicId) {
    wynik.push(j.rodzicId);
    j = las.jednostki.get(j.rodzicId);
  }
  return wynik;
}

/** Domyślny stan: rozwinięte tyle jednostek, by było widać `poziomy` pokoleń licząc od korzeni. */
export function rozwinDoPoziomu(las: Las, korzenie: string[], poziomy: number): Set<string> {
  const wynik = new Set<string>();
  const idz = (id: string, poziom: number) => {
    if (poziom >= poziomy) return;
    const j = las.jednostki.get(id)!;
    if (j.dzieci.length) wynik.add(id);
    j.dzieci.forEach((d) => idz(d, poziom + 1));
  };
  korzenie.forEach((k) => idz(k, 1));
  return wynik;
}

// ───────────────────────────── widok jednej gałęzi ─────────────────────────────

export type LasGalezi = { las: Las; korzenie: string[]; maxPoziomow: number };

/**
 * Las ograniczony do jednej gałęzi: pod jednostkami zostają tylko dzieci z tej samej gałęzi,
 * a korzenie to pierwsze jednostki gałęzi. Wspólne dla listy i diagramu.
 */
export function lasGalezi(osoby: OsobaDrzewa[], pary: ParaDrzewa[], galazId: string): LasGalezi {
  const poId = new Map(osoby.map((o) => [o.id, o]));
  const pelny = zbudujLas(osoby, pary);
  const jednostki = new Map([...pelny.jednostki].map(([id, j]) => [id, { ...j, dzieci: j.dzieci.filter((d) => poId.get(d)!.galazId === galazId) }]));
  const las: Las = { ...pelny, jednostki };
  const korzenie = [...jednostki.values()]
    .filter((j) => poId.get(j.glowna)!.galazId === galazId && (!j.rodzicId || poId.get(jednostki.get(j.rodzicId)!.glowna)!.galazId !== galazId))
    .map((j) => j.id);
  const glebokosc = (id: string): number => 1 + Math.max(0, ...jednostki.get(id)!.dzieci.map(glebokosc));
  return { las, korzenie, maxPoziomow: Math.max(1, ...korzenie.map(glebokosc)) };
}

/**
 * Czy jednostka należy do widoku gałęzi: jest korzeniem albo da się do niej dojść od korzenia
 * po dzieciach przefiltrowanych do tej gałęzi (potomek z innej gałęzi nie należy do widoku,
 * choć jego przodkowie tak).
 */
export function wWidoku(las: Las, korzenie: string[], jednostkaId: string): boolean {
  let j = las.jednostki.get(jednostkaId);
  while (j) {
    if (korzenie.includes(j.id)) return true;
    const rodzic = j.rodzicId ? las.jednostki.get(j.rodzicId) : undefined;
    if (!rodzic || !rodzic.dzieci.includes(j.id)) return false;
    j = rodzic;
  }
  return false;
}

/** Jednostki do rozwinięcia, aby jednostka `id` była widoczna w widoku gałęzi (rodzice aż do korzenia widoku). */
export function przodkowieWWidoku(las: Las, korzenie: string[], id: string): string[] {
  const wynik: string[] = [];
  let j = las.jednostki.get(id);
  while (j && !korzenie.includes(j.id) && j.rodzicId) {
    wynik.push(j.rodzicId);
    j = las.jednostki.get(j.rodzicId);
  }
  return wynik;
}
