"use client";

import { useContext, useState } from "react";
import { FormularzEdycji, type KandydatRodzica } from "@/components/FormularzOsoby";
import { OknoModalne } from "@/components/OknoModalne";
import type { OsobaPanelu } from "@/lib/panel";
import { KontekstDb } from "./KontekstDb";

/**
 * Przycisk „Edytuj dane” na stronie osoby drzewa z bazy: okno z formularzem (dane osoby i jej rodzice).
 * Widoczny tylko dla właściciela, kolaborantów i administratora; dla pozostałych (i dla drzew z repozytorium) nic nie renderuje.
 */
export function EdytujOsobe({ osoba, kandydaci }: { osoba: OsobaPanelu; kandydaci: KandydatRodzica[] }) {
  const ctx = useContext(KontekstDb);
  const [otwarte, setOtwarte] = useState(false);
  if (!ctx || !ctx.api.mozeEdytowac) return null;
  return (
    <>
      <button type="button" className="przycisk" onClick={() => setOtwarte(true)}>
        ✏️ Edytuj dane
      </button>
      <OknoModalne otwarte={otwarte} naZamkniecie={() => setOtwarte(false)} etykieta="Edycja danych osoby">
        <FormularzEdycji osoba={osoba} api={ctx.api} osoby={kandydaci} naGotowe={() => setOtwarte(false)} />
      </OknoModalne>
    </>
  );
}
