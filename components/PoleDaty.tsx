"use client";

import { useId, useState } from "react";
import { bladPol, MIESIACE, polaZTekstu, tekstZPol, type PolaDaty } from "@/lib/pole-daty";

const POLE = "pole block w-full";

/**
 * Wygodne wpisywanie daty: dzień, miesiąc z listy i rok w osobnych polach, „około” i „data nieznana” jako przełączniki oraz
 * miejsce. Rodzic dostaje zwykły tekst daty (jak „4.03.1891, Kobylin”), który i tak sprawdza `parsujDate`, więc reszta formularzy
 * działa bez zmian. Wartość początkowa jest czytana raz (formularze są montowane od nowa dla każdej osoby).
 */
export function PoleDaty({ etykieta, rodzaj, poczatkowa, naZmiane, smierc = false }: { etykieta: string; rodzaj: "urodzenia" | "śmierci"; poczatkowa: string; naZmiane: (tekst: string) => void; smierc?: boolean }) {
  const id = useId();
  const [p, setP] = useState<PolaDaty>(() => polaZTekstu(poczatkowa));
  const zmien = (zmiana: Partial<PolaDaty>) => {
    const nowe = { ...p, ...zmiana };
    setP(nowe);
    naZmiane(tekstZPol(nowe));
  };
  const blad = bladPol(p);
  const nazwaRodzaju = smierc ? "Śmierć" : "Urodzenie";
  const podpis = "text-xs text-tekst-2";

  return (
    <fieldset className="space-y-2" aria-describedby={blad ? `${id}-blad` : undefined}>
      <legend className="text-sm text-tekst-2">{etykieta}</legend>
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_5.5rem] gap-2">
        <label className="block">
          <span className={podpis}>Dzień</span>
          <input className={`${POLE} text-center`} inputMode="numeric" maxLength={2} placeholder="DD" autoComplete="off" aria-label={`Dzień ${rodzaj}`} value={p.dzien} disabled={p.nieznana} onChange={(e) => zmien({ dzien: e.target.value.replace(/\D/g, "") })} />
        </label>
        <label className="block">
          <span className={podpis}>Miesiąc</span>
          <select className={POLE} aria-label={`Miesiąc ${rodzaj}`} value={p.miesiac} disabled={p.nieznana} onChange={(e) => zmien({ miesiac: e.target.value })}>
            <option value="">—</option>
            {MIESIACE.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={podpis}>Rok</span>
          <input className={`${POLE} text-center`} inputMode="numeric" maxLength={4} placeholder="RRRR" autoComplete="off" aria-label={`Rok ${rodzaj}`} value={p.rok} disabled={p.nieznana} onChange={(e) => zmien({ rok: e.target.value.replace(/\D/g, "") })} />
        </label>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <label className="flex min-h-8 items-center gap-2">
          <input type="checkbox" className="size-4" checked={p.okolo} disabled={p.nieznana} aria-label={`${nazwaRodzaju} przybliżona (około)`} onChange={(e) => zmien({ okolo: e.target.checked })} />
          około
        </label>
        {smierc && (
          <label className="flex min-h-8 items-center gap-2">
            <input type="checkbox" className="size-4" checked={p.nieznana} aria-label="Zmarł(a), data śmierci nieznana" onChange={(e) => zmien({ nieznana: e.target.checked })} />
            zmarł(a), data nieznana
          </label>
        )}
      </div>
      <label className="block">
        <span className={podpis}>Miejsce (opcjonalnie)</span>
        <input className={POLE} autoComplete="off" placeholder="np. Kobylin" aria-label={`Miejsce ${rodzaj}`} value={p.miejsce} onChange={(e) => zmien({ miejsce: e.target.value })} />
      </label>
      <p className={podpis}>
        {smierc ? "Zostaw puste, jeśli nie ma informacji o śmierci. Gdy znasz tylko rok, wpisz sam rok." : "Gdy znasz tylko rok, wpisz sam rok; dzień i miesiąc są opcjonalne."}
      </p>
      {blad && (
        <p id={`${id}-blad`} role="alert" className="text-sm font-medium text-blad">
          {blad}
        </p>
      )}
    </fieldset>
  );
}
