/**
 * Katalog publicznych drzew z bazy – z pamięcią podręczną, żeby jeden odwiedzający nie zużywał odczytów przy każdej stronie.
 *
 * Każde zwrócone drzewo to jeden odczyt z darmowego dziennego limitu (50 tys.), dlatego:
 *  - strona główna pobiera tylko kilkanaście najnowszych drzew („ostatnie”),
 *  - pełna lista (katalog, wyszukiwarka) ładuje się dopiero, gdy ktoś jej naprawdę użyje,
 *  - wynik jest wspólny dla wszystkich komponentów, trzymany w pamięci i w sessionStorage przez kilka minut,
 *  - zmiana drzewa przez użytkownika (utworzenie, ustawienia, usunięcie) unieważnia pamięć.
 */
import type { PodsumowanieDrzewa } from "../dane-czyste";
import { podsumowanieZBazy } from "./widok";

export type ZakresKatalogu = "ostatnie" | "wszystkie";
export const LIMIT_KATALOGU: Record<ZakresKatalogu, number> = { ostatnie: 12, wszystkie: 100 };
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

const najnowsze = (lista: PodsumowanieDrzewa[]) => [...lista].sort((a, b) => (b.utworzono ?? "").localeCompare(a.utworzono ?? ""));

/**
 * Najnowsze publiczne drzewa: zapytanie z sortowaniem po stronie bazy (kilkanaście odczytów). Wymaga indeksu złożonego
 * (firestore.indexes.json); gdy indeks jeszcze nie istnieje, pobieramy pełną listę (do 100) i sortujemy w przeglądarce.
 */
async function pobierzOstatnie() {
  const api = await import("./api");
  try {
    return await api.listaOstatnich(LIMIT_KATALOGU.ostatnie);
  } catch {
    const wszystkie = await api.listaPublicznych(LIMIT_KATALOGU.wszystkie);
    return wszystkie.sort((a, b) => b.meta.utworzono.localeCompare(a.meta.utworzono)).slice(0, LIMIT_KATALOGU.ostatnie);
  }
}

/** Publiczne drzewa niepuste. Jedno zapytanie na zakres w oknie ważności, niezależnie od liczby komponentów. */
export async function katalogPubliczny(zakres: ZakresKatalogu, teraz = Date.now()): Promise<PodsumowanieDrzewa[]> {
  const wszystkie = pamiec.get("wszystkie") ?? odczytajZSesji("wszystkie");
  // Pełna lista zawiera też „ostatnie” – nie ma sensu pytać drugi raz.
  if (zakres === "ostatnie" && swieze(wszystkie, teraz)) return najnowsze(wszystkie.dane).slice(0, LIMIT_KATALOGU.ostatnie);
  const znane = pamiec.get(zakres) ?? odczytajZSesji(zakres);
  if (swieze(znane, teraz)) {
    pamiec.set(zakres, znane);
    return znane.dane;
  }
  const trwa = wToku.get(zakres);
  if (trwa) return trwa;
  const obietnica = (async () => {
    const wpisy = zakres === "ostatnie" ? await pobierzOstatnie() : (await import("./api").then((a) => a.listaPublicznych(LIMIT_KATALOGU.wszystkie)));
    const lista = wpisy.filter((x) => x.meta.statystyki.osob > 0).map((x) => podsumowanieZBazy(x.id, x.meta));
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
    for (const z of ["ostatnie", "wszystkie"] as const) sessionStorage.removeItem(KLUCZ(z));
  } catch {
    /* brak sessionStorage */
  }
}
