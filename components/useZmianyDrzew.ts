"use client";

import { useMemo, useSyncExternalStore } from "react";
import { liczbaZmianDrzew, PUSTE_ZMIANY, zmianyDoPliku, type ZmianaDrzewa, type ZmianyDrzew } from "@/lib/zmiany-drzew";

/** Magazyn zmian w drzewach (localStorage, klucz „zmiany-drzew”) – ten sam wzorzec co useEdycje. */
const KLUCZ = "zmiany-drzew";
let pamiec: { surowe: string | null; wartosc: ZmianyDrzew } = { surowe: null, wartosc: PUSTE_ZMIANY };
const sluchacze = new Set<() => void>();

function odczytaj(): ZmianyDrzew {
  let surowe: string | null = null;
  try {
    surowe = localStorage.getItem(KLUCZ);
  } catch {
    return pamiec.wartosc;
  }
  if (pamiec.surowe === surowe) return pamiec.wartosc;
  let wartosc = PUSTE_ZMIANY;
  if (surowe) {
    try {
      const j = JSON.parse(surowe);
      if (j && typeof j.zmienione === "object" && Array.isArray(j.usuniete)) wartosc = { zmienione: j.zmienione, usuniete: j.usuniete };
    } catch {
      /* uszkodzony zapis – ignorujemy */
    }
  }
  pamiec = { surowe, wartosc };
  return wartosc;
}

function zapisz(z: ZmianyDrzew) {
  const surowe = liczbaZmianDrzew(z) ? JSON.stringify(z) : null;
  try {
    if (surowe) localStorage.setItem(KLUCZ, surowe);
    else localStorage.removeItem(KLUCZ);
    pamiec = { surowe, wartosc: z };
  } catch {
    pamiec = { surowe: null, wartosc: z };
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

export function useZmianyDrzew() {
  const zmiany = useSyncExternalStore(subskrybuj, odczytaj, () => PUSTE_ZMIANY);
  return useMemo(
    () => ({
      zmiany,
      liczba: liczbaZmianDrzew(zmiany),
      zmien: (slug: string, zmiana: ZmianaDrzewa) => zapisz({ ...zmiany, zmienione: { ...zmiany.zmienione, [slug]: zmiana } }),
      cofnijZmiane: (slug: string) => {
        const zmienione = { ...zmiany.zmienione };
        delete zmienione[slug];
        zapisz({ ...zmiany, zmienione });
      },
      usun: (slug: string) => zapisz({ ...zmiany, usuniete: [...new Set([...zmiany.usuniete, slug])] }),
      przywroc: (slug: string) => zapisz({ ...zmiany, usuniete: zmiany.usuniete.filter((s) => s !== slug) }),
      wyczysc: () => zapisz(PUSTE_ZMIANY),
      pobierz: () => {
        const adres = URL.createObjectURL(new Blob([zmianyDoPliku(zmiany)], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = adres;
        a.download = "zmiany-drzew.json";
        a.click();
        URL.revokeObjectURL(adres);
      },
    }),
    [zmiany],
  );
}
