/**
 * Katalog publicznych drzew z bazy – z pamięcią podręczną, żeby jeden odwiedzający nie zużywał odczytów przy każdej stronie.
 *
 * Każde zwrócone drzewo to jeden odczyt z darmowego dziennego limitu (50 tys.), dlatego:
 *  - strona główna pobiera tylko kilkanaście drzew („polecane”),
 *  - pełna lista (katalog, wyszukiwarka) ładuje się dopiero, gdy ktoś jej naprawdę użyje,
 *  - wynik jest wspólny dla wszystkich komponentów, trzymany w pamięci i w sessionStorage przez kilka minut,
 *  - zmiana drzewa przez użytkownika (utworzenie, ustawienia, usunięcie) unieważnia pamięć.
 */
import type { PodsumowanieDrzewa } from "../dane-czyste";
import { podsumowanieZBazy } from "./widok";

export type ZakresKatalogu = "polecane" | "wszystkie";
export const LIMIT_KATALOGU: Record<ZakresKatalogu, number> = { polecane: 12, wszystkie: 100 };
/** Jak długo wynik jest uznawany za świeży. */
export const WAZNOSC_KATALOGU_MS = 10 * 60 * 1000;

type Wpis = { czas: number; dane: PodsumowanieDrzewa[] };
const pamiec = new Map<ZakresKatalogu, Wpis>();
const wToku = new Map<ZakresKatalogu, Promise<PodsumowanieDrzewa[]>>();
const KLUCZ = (z: ZakresKatalogu) => `katalog-drzew:${z}`;

function odczytajZSesji(zakres: ZakresKatalogu): Wpis | null {
  try {
    const surowe = sessionStorage.getItem(KLUCZ(zakres));
    return surowe ? (JSON.parse(surowe) as Wpis) : null;
  } catch {
    return null;
  }
}

function zapiszDoSesji(zakres: ZakresKatalogu, wpis: Wpis) {
  try {
    sessionStorage.setItem(KLUCZ(zakres), JSON.stringify(wpis));
  } catch {
    /* pamięć sesji niedostępna lub pełna – zostaje pamięć procesu */
  }
}

const swieze = (w: Wpis | null | undefined, teraz: number): w is Wpis => !!w && teraz - w.czas < WAZNOSC_KATALOGU_MS;

/** Publiczne drzewa niepuste. Jedno zapytanie na zakres w oknie ważności, niezależnie od liczby komponentów. */
export async function katalogPubliczny(zakres: ZakresKatalogu, teraz = Date.now()): Promise<PodsumowanieDrzewa[]> {
  const wszystkie = pamiec.get("wszystkie") ?? odczytajZSesji("wszystkie");
  // Pełna lista zawiera też „polecane” – nie ma sensu pytać drugi raz.
  if (zakres === "polecane" && swieze(wszystkie, teraz)) return wszystkie.dane.slice(0, LIMIT_KATALOGU.polecane);
  const znane = pamiec.get(zakres) ?? odczytajZSesji(zakres);
  if (swieze(znane, teraz)) {
    pamiec.set(zakres, znane);
    return znane.dane;
  }
  const trwa = wToku.get(zakres);
  if (trwa) return trwa;
  const obietnica = (async () => {
    const { listaPublicznych } = await import("./api");
    const lista = (await listaPublicznych(LIMIT_KATALOGU[zakres])).filter((x) => x.meta.statystyki.osob > 0).map((x) => podsumowanieZBazy(x.id, x.meta));
    const wpis = { czas: Date.now(), dane: lista };
    pamiec.set(zakres, wpis);
    zapiszDoSesji(zakres, wpis);
    return lista;
  })().finally(() => wToku.delete(zakres));
  wToku.set(zakres, obietnica);
  return obietnica;
}

/** Wywoływane po zmianie drzewa, żeby katalog przy następnym wejściu pokazał aktualny stan. */
export function uniewaznijKatalog(): void {
  pamiec.clear();
  try {
    for (const z of ["polecane", "wszystkie"] as const) sessionStorage.removeItem(KLUCZ(z));
  } catch {
    /* brak sessionStorage */
  }
}
