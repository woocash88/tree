/**
 * Katalog publicznych drzew z bazy – z pamięcią podręczną, żeby jeden odwiedzający nie zużywał odczytów przy każdej stronie.
 *
 * Każde zwrócone drzewo to jeden odczyt z darmowego dziennego limitu (50 tys.), dlatego:
 *  - lista ładuje się dopiero, gdy ktoś jej naprawdę użyje (katalog drzew, wyszukiwarka na stronie głównej),
 *  - wynik jest wspólny dla wszystkich komponentów, trzymany w pamięci i w sessionStorage przez kilka minut,
 *  - zmiana drzewa przez użytkownika (utworzenie, ustawienia, usunięcie) unieważnia pamięć.
 */
import type { PodsumowanieDrzewa } from "../dane-czyste";
import { podsumowanieZBazy } from "./widok";

/** Najwięcej publicznych drzew pobieranych do katalogu i wyszukiwarki. */
export const LIMIT_KATALOGU = { wszystkie: 100 } as const;
/** Jak długo wynik jest uznawany za świeży. */
export const WAZNOSC_KATALOGU_MS = 10 * 60 * 1000;

type Wpis = { czas: number; dane: PodsumowanieDrzewa[] };
let pamiec: Wpis | null = null;
let wToku: Promise<PodsumowanieDrzewa[]> | null = null;
const KLUCZ = "katalog-drzew:wszystkie";

function odczytajZSesji(): Wpis | null {
  try {
    const surowe = sessionStorage.getItem(KLUCZ);
    return surowe ? (JSON.parse(surowe) as Wpis) : null;
  } catch {
    return null;
  }
}

function zapiszDoSesji(wpis: Wpis) {
  try {
    sessionStorage.setItem(KLUCZ, JSON.stringify(wpis));
  } catch {
    /* pamięć sesji niedostępna lub pełna – zostaje pamięć procesu */
  }
}

const swieze = (w: Wpis | null, teraz: number): w is Wpis => !!w && teraz - w.czas < WAZNOSC_KATALOGU_MS;

/** Publiczne drzewa niepuste. Jedno zapytanie w oknie ważności, niezależnie od liczby komponentów. */
export async function katalogPubliczny(teraz = Date.now()): Promise<PodsumowanieDrzewa[]> {
  const znane = pamiec ?? odczytajZSesji();
  if (swieze(znane, teraz)) {
    pamiec = znane;
    return znane.dane;
  }
  if (wToku) return wToku;
  const obietnica = (async () => {
    const { listaPublicznych } = await import("./api");
    const lista = (await listaPublicznych(LIMIT_KATALOGU.wszystkie)).filter((x) => x.meta.statystyki.osob > 0).map((x) => podsumowanieZBazy(x.id, x.meta));
    pamiec = { czas: Date.now(), dane: lista };
    zapiszDoSesji(pamiec);
    return lista;
  })().finally(() => {
    wToku = null;
  });
  wToku = obietnica;
  return obietnica;
}

/** Wywoływane po zmianie drzewa, żeby katalog przy następnym wejściu pokazał aktualny stan. */
export function uniewaznijKatalog(): void {
  pamiec = null;
  try {
    sessionStorage.removeItem(KLUCZ);
  } catch {
    /* brak sessionStorage */
  }
}
