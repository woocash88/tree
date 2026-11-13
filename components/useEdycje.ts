"use client";

import { useContext, useMemo, useSyncExternalStore } from "react";
import { doPliku, liczbaZmian, PUSTE_EDYCJE, zastosujPatch, type Edycje, type NowaOsoba, type PatchOsoby } from "@/lib/edycje";
import type { Osoba } from "@/lib/schemat";
import type { NowaOsoba as NowaOsobaTyp } from "@/lib/edycje";
import { czyDb } from "@/lib/sciezki";
import { KontekstDb } from "./db/KontekstDb";
import { useCzyAdmin } from "./konta/AuthProvider";

/**
 * Magazyn lokalnych edycji (localStorage, klucz „edycje:<slug>”). Każdy odczyt i zapis jest w try/catch –
 * przy zablokowanym localStorage zmiany żyją w pamięci do odświeżenia strony.
 */
const klucz = (slug: string) => `edycje:${slug}`;
const pamiec = new Map<string, { surowe: string | null; wartosc: Edycje }>();
const sluchacze = new Set<() => void>();

function odczytaj(slug: string): Edycje {
  let surowe: string | null = null;
  try {
    surowe = localStorage.getItem(klucz(slug));
  } catch {
    return pamiec.get(slug)?.wartosc ?? PUSTE_EDYCJE;
  }
  const znane = pamiec.get(slug);
  if (znane && znane.surowe === surowe) return znane.wartosc;
  let wartosc = PUSTE_EDYCJE;
  if (surowe) {
    try {
      const j = JSON.parse(surowe);
      if (j && typeof j.osoby === "object" && Array.isArray(j.dodane)) wartosc = { osoby: j.osoby, dodane: j.dodane };
    } catch {
      /* uszkodzony zapis – ignorujemy */
    }
  }
  pamiec.set(slug, { surowe, wartosc });
  return wartosc;
}

function zapisz(slug: string, e: Edycje) {
  const surowe = liczbaZmian(e) ? JSON.stringify(e) : null;
  try {
    if (surowe) localStorage.setItem(klucz(slug), surowe);
    else localStorage.removeItem(klucz(slug));
    pamiec.set(slug, { surowe, wartosc: e });
  } catch {
    pamiec.set(slug, { surowe: null, wartosc: e });
  }
  sluchacze.forEach((f) => f());
}

function subskrybuj(zmiana: () => void) {
  sluchacze.add(zmiana);
  window.addEventListener("storage", zmiana);
  return () => {
    sluchacze.delete(zmiana);
    window.removeEventListener("storage", zmiana);
  };
}

export type ApiEdycji = {
  /** Czy zalogowany użytkownik może zmieniać dane tego drzewa (administrator lokalnie; właściciel/kolaborant w bazie). */
  mozeEdytowac: boolean;
  /** Tylko drzewa z bazy: operacje na strukturze drzewa i stan zapisu. */
  dodajMalzonka?: (osobaId: string, nowa: NowaOsobaTyp) => void;
  dodajRodzenstwo?: (osobaId: string, nowa: NowaOsobaTyp) => void;
  dodajRodzica?: (dzieckoId: string, rola: "ojciec" | "matka", nowa: NowaOsobaTyp) => void;
  usunOsobe?: (id: string) => void;
  zapisuje?: boolean;
  blad?: string | null;
  edycje: Edycje;
  liczbaZmian: number;
  zapiszOsobe: (id: string, patch: PatchOsoby) => void;
  cofnijOsobe: (id: string) => void;
  dodajOsobe: (nowa: NowaOsoba) => void;
  /** Usuwa dopisaną osobę wraz z jej dopisanymi potomkami. */
  usunDodana: (id: string) => void;
  wyczysc: () => void;
  pobierz: () => void;
};

/** Edycje osób: drzewa z bazy zapisują zmiany w Firestore (przez kontekst widoku), pozostałe – lokalnie dla administratora. */
export function useEdycje(slug: string): ApiEdycji {
  const lokalne = useEdycjeLokalne(slug);
  const db = useContext(KontekstDb);
  return czyDb(slug) && db ? db.api : lokalne;
}

function useEdycjeLokalne(slug: string): ApiEdycji {
  // W trybie bez pamięci przeglądarki (render na serwerze) nie ma żadnych edycji.
  const zapisane = useSyncExternalStore(subskrybuj, () => odczytaj(slug), () => PUSTE_EDYCJE);
  // Edycja jest narzędziem administratora: bez trybu administratora widok pokazuje wyłącznie dane z repozytorium,
  // nawet jeśli w tej przeglądarce zostały kiedyś zapisane lokalne zmiany.
  const admin = useCzyAdmin();
  const edycje = admin ? zapisane : PUSTE_EDYCJE;
  return useMemo<ApiEdycji>(
    () => ({
      mozeEdytowac: admin,
      edycje,
      liczbaZmian: liczbaZmian(edycje),
      // Osoba dopisana lokalnie: zmiana trafia prosto do jej wpisu (w pliku jest jedna, kompletna osoba).
      zapiszOsobe: (id, patch) =>
        edycje.dodane.some((n) => n.id === id)
          ? zapisz(slug, { ...edycje, dodane: edycje.dodane.map((n) => (n.id === id ? (zastosujPatch(n as Osoba, patch) as NowaOsoba) : n)) })
          : zapisz(slug, { ...edycje, osoby: { ...edycje.osoby, [id]: { ...edycje.osoby[id], ...patch } } }),
      cofnijOsobe: (id) => {
        const { [id]: _pomijana, ...reszta } = edycje.osoby;
        void _pomijana;
        zapisz(slug, { ...edycje, osoby: reszta });
      },
      dodajOsobe: (nowa) => zapisz(slug, { ...edycje, dodane: [...edycje.dodane, nowa] }),
      usunDodana: (id) => {
        const doUsuniecia = new Set([id]);
        for (let zmiana = true; zmiana; ) {
          zmiana = false;
          for (const n of edycje.dodane) {
            if (!doUsuniecia.has(n.id) && ((n.ojciecId && doUsuniecia.has(n.ojciecId)) || (n.matkaId && doUsuniecia.has(n.matkaId)))) {
              doUsuniecia.add(n.id);
              zmiana = true;
            }
          }
        }
        zapisz(slug, { ...edycje, dodane: edycje.dodane.filter((n) => !doUsuniecia.has(n.id)) });
      },
      wyczysc: () => zapisz(slug, PUSTE_EDYCJE),
      pobierz: () => {
        const adres = URL.createObjectURL(new Blob([doPliku(slug, edycje)], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = adres;
        a.download = `edycje-${slug}.json`;
        a.click();
        URL.revokeObjectURL(adres);
      },
    }),
    [slug, edycje, admin],
  );
}
