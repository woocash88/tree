import { SchematRodziny, type Rodzina } from "./schemat";

export class BladDanych extends Error {
  constructor(public readonly bledy: string[]) {
    super(`Błędy w danych drzewa (${bledy.length}):\n` + bledy.map((b) => `  • ${b}`).join("\n"));
    this.name = "BladDanych";
  }
}

export type WynikWalidacji = { rodzina: Rodzina; ostrzezenia: string[] };

function rok(wartosc?: string): number | null {
  return wartosc ? Number(wartosc.slice(0, 4)) : null;
}

/**
 * Sprawdza surowy obiekt z data/rodzina.json: najpierw kształt (zod), potem spójność
 * powiązań. Rzuca BladDanych z listą czytelnych komunikatów – build ma się wtedy zatrzymać.
 */
export function walidujRodzine(surowe: unknown): WynikWalidacji {
  const wynik = SchematRodziny.safeParse(surowe);
  if (!wynik.success) {
    const s = surowe as { osoby?: { id?: unknown }[]; galezie?: { id?: unknown }[] } | null;
    const bledy = wynik.error.issues.map((i) => {
      const [sekcja, indeks, ...reszta] = i.path;
      let gdzie = i.path.join(".");
      if ((sekcja === "osoby" || sekcja === "galezie") && typeof indeks === "number") {
        const id = s?.[sekcja]?.[indeks]?.id;
        gdzie = `${sekcja}[${indeks}]${typeof id === "string" ? ` (id "${id}")` : ""}${reszta.length ? ` → ${reszta.join(".")}` : ""}`;
      } else if (sekcja === "malzenstwa" && typeof indeks === "number") {
        gdzie = `malzenstwa[${indeks}]${reszta.length ? ` → ${reszta.join(".")}` : ""}`;
      }
      return `${gdzie || "plik"}: ${i.message}`;
    });
    throw new BladDanych(bledy);
  }

  const rodzina = wynik.data;
  const bledy: string[] = [];
  const ostrzezenia: string[] = [];

  const galezie = new Set<string>();
  for (const g of rodzina.galezie) {
    if (galezie.has(g.id)) bledy.push(`Zduplikowane id gałęzi: "${g.id}".`);
    galezie.add(g.id);
  }

  const osoby = new Map<string, Rodzina["osoby"][number]>();
  for (const o of rodzina.osoby) {
    if (osoby.has(o.id)) bledy.push(`Zduplikowane id osoby: "${o.id}" (${o.imie} ${o.nazwisko}).`);
    osoby.set(o.id, o);
  }

  for (const o of rodzina.osoby) {
    const kto = `Osoba "${o.id}" (${o.imie} ${o.nazwisko})`;
    for (const [pole, etykieta] of [["ojciecId", "ojciec"], ["matkaId", "matka"]] as const) {
      const rid = o[pole];
      if (rid === null) continue;
      if (rid === o.id) bledy.push(`${kto}: ${etykieta} wskazuje na tę samą osobę.`);
      else if (!osoby.has(rid)) bledy.push(`${kto}: brakujący rodzic – ${pole} = "${rid}" nie istnieje na liście osób.`);
    }
    if (o.ojciecId !== null && o.ojciecId === o.matkaId) bledy.push(`${kto}: ojciec i matka to ta sama osoba ("${o.ojciecId}").`);
    if (!galezie.has(o.galazId)) bledy.push(`${kto}: nieznana gałąź "${o.galazId}".`);

    const ur = o.urodzenie.wartosc;
    const zm = o.smierc?.wartosc;
    if (ur && zm) {
      const sprzeczne = ur.length === 10 && zm.length === 10 ? zm < ur : rok(zm)! < rok(ur)!;
      if (sprzeczne) bledy.push(`${kto}: data śmierci (${zm}) jest wcześniejsza niż data urodzenia (${ur}).`);
    }
    for (const pole of ["ojciecId", "matkaId"] as const) {
      const rodzic = o[pole] ? osoby.get(o[pole]!) : undefined;
      const rr = rok(rodzic?.urodzenie.wartosc);
      const rd = rok(ur);
      if (rodzic && rr !== null && rd !== null && rd <= rr) {
        ostrzezenia.push(`${kto}: urodzenie (${rd}) nie później niż urodzenie rodzica "${rodzic.id}" (${rr}).`);
      }
    }
  }

  const pary = new Set<string>();
  rodzina.malzenstwa.forEach((m, i) => {
    const gdzie = `Małżeństwo nr ${i + 1} (${m.osobaAId} + ${m.osobaBId})`;
    for (const id of [m.osobaAId, m.osobaBId]) {
      if (!osoby.has(id)) bledy.push(`${gdzie}: osoba "${id}" nie istnieje na liście osób.`);
    }
    if (m.osobaAId === m.osobaBId) bledy.push(`${gdzie}: osoba nie może być własnym małżonkiem.`);
    const klucz = [m.osobaAId, m.osobaBId].sort().join("+");
    if (pary.has(klucz)) bledy.push(`${gdzie}: to małżeństwo jest wpisane więcej niż raz.`);
    pary.add(klucz);
  });

  // Cykle w relacji rodzic → dziecko (ktoś byłby własnym przodkiem).
  const stan = new Map<string, 0 | 1 | 2>();
  const zgloszone = new Set<string>();
  for (const start of osoby.keys()) {
    if (stan.get(start)) continue;
    const stos: { id: string; rodzice: string[] }[] = [];
    const wejdz = (id: string) => {
      stan.set(id, 1);
      const o = osoby.get(id)!;
      stos.push({ id, rodzice: [o.ojciecId, o.matkaId].filter((r): r is string => !!r && osoby.has(r) && r !== id) });
    };
    wejdz(start);
    while (stos.length) {
      const szczyt = stos[stos.length - 1];
      const nastepny = szczyt.rodzice.pop();
      if (nastepny === undefined) {
        stan.set(szczyt.id, 2);
        stos.pop();
      } else if (stan.get(nastepny) === 1) {
        const od = stos.findIndex((s) => s.id === nastepny);
        const petla = stos.slice(od).map((s) => s.id);
        const klucz = [...petla].sort().join(",");
        if (!zgloszone.has(klucz)) {
          zgloszone.add(klucz);
          bledy.push(`Cykl w pokrewieństwie: ${[...petla, nastepny].join(" → ")} (każda kolejna osoba jest rodzicem poprzedniej).`);
        }
      } else if (!stan.get(nastepny)) {
        wejdz(nastepny);
      }
    }
  }

  if (bledy.length) throw new BladDanych(bledy);
  return { rodzina, ostrzezenia };
}
