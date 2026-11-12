"use client";

import { useId, useState } from "react";
import { zapiszDane } from "@/lib/baza/api";
import { komunikatBledu } from "@/lib/baza/konta";
import { pobierzPlik, wczytajPlikDrzewa } from "@/lib/baza/plik";
import type { DaneDb, MetaDb } from "@/lib/baza/typy";
import { eksportGedcom, eksportJson, nazwaPliku, type WynikImportu } from "@/lib/baza/wymiana";

/** Eksport drzewa do pliku (kopia zapasowa JSON, GEDCOM do innych programów) i import z pliku z zastąpieniem zawartości. */
export function WymianaDanych({ drzewoId, meta, dane, naZmiane }: { drzewoId: string; meta: MetaDb; dane: DaneDb | null; naZmiane: () => Promise<void> }) {
  const id = useId();
  const [komunikat, setKomunikat] = useState<{ typ: "ok" | "blad"; tekst: string } | null>(null);
  const [podglad, setPodglad] = useState<{ plik: string; wynik: WynikImportu } | null>(null);
  const [trwa, setTrwa] = useState(false);
  const osob = dane?.osoby.length ?? 0;

  const eksportuj = (format: "json" | "ged") => {
    if (!dane) return;
    if (format === "json") pobierzPlik(nazwaPliku(meta.nazwa, "json"), eksportJson(meta, dane), "application/json");
    else pobierzPlik(nazwaPliku(meta.nazwa, "ged"), eksportGedcom(meta, dane), "text/plain");
    setKomunikat({ typ: "ok", tekst: `Pobrano plik z ${osob} osobami. Zawiera pełne dane, także osób żyjących – przechowuj go ostrożnie.` });
  };

  return (
    <section className="szklo space-y-4 p-6" aria-label="Eksport i import drzewa">
      <h2 className="text-2xl">Eksport i import</h2>
      <p className="text-sm text-tekst-2">
        Zrób kopię zapasową drzewa albo przenieś je do innego konta lub programu. Plik zawiera <strong>pełne dane, także osób żyjących</strong>, niezależnie od ustawień prywatności.
      </p>

      <div>
        <h3 className="text-sm font-semibold">Eksport</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="przycisk przycisk-glowny !min-h-10" disabled={!dane} onClick={() => eksportuj("json")}>
            Pobierz kopię zapasową (JSON)
          </button>
          <button type="button" className="przycisk !min-h-10" disabled={!dane} onClick={() => eksportuj("ged")}>
            Pobierz GEDCOM (.ged)
          </button>
        </div>
        <p className="mt-2 text-xs text-tekst-2">
          <strong>JSON</strong> zachowuje wszystko (gałęzie, oznaczenia osób żyjących, notatki) i służy do kopii zapasowej oraz przenoszenia między kontami w tym serwisie. <strong>GEDCOM</strong> to standard wymiany z innymi programami (Ancestry, MyHeritage, Gramps…); nie przenosi gałęzi ani oznaczeń osób żyjących.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Import z pliku (zastępuje zawartość tego drzewa)</h3>
        <label className="mt-2 block text-sm text-tekst-2" htmlFor={`${id}-plik`}>
          Plik .json z tego serwisu albo .ged (GEDCOM)
        </label>
        <input
          id={`${id}-plik`}
          type="file"
          accept=".json,.ged,.gedcom,application/json"
          className="mt-1 block text-sm"
          onChange={async (e) => {
            const plik = e.target.files?.[0];
            setPodglad(null);
            setKomunikat(null);
            if (!plik) return;
            try {
              setPodglad({ plik: plik.name, wynik: await wczytajPlikDrzewa(plik) });
            } catch (err) {
              setKomunikat({ typ: "blad", tekst: komunikatBledu(err) });
            }
            e.target.value = "";
          }}
        />
        {podglad && (
          <div className="mt-3 space-y-2 rounded-xl border border-kreska bg-najazd p-3 text-sm" role="status">
            <p>
              <strong>{podglad.plik}</strong>: {podglad.wynik.dane.osoby.length} osób, {podglad.wynik.dane.malzenstwa.length} małżeństw (format {podglad.wynik.format === "json" ? "JSON" : "GEDCOM"}).
            </p>
            {podglad.wynik.ostrzezenia.length > 0 && (
              <ul className="list-disc pl-5 text-tekst-2">
                {podglad.wynik.ostrzezenia.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            )}
            <p className="font-semibold text-blad">Import zastąpi całą obecną zawartość drzewa ({osob} osób). Przed zastąpieniem pobierzemy kopię zapasową obecnego drzewa.</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="przycisk przycisk-glowny !min-h-9"
                disabled={trwa || !dane}
                onClick={async () => {
                  if (!dane || !window.confirm(`Zastąpić zawartość drzewa „${meta.nazwa}” (${osob} osób) danymi z pliku (${podglad.wynik.dane.osoby.length} osób)?\n\nKopia obecnego drzewa zostanie pobrana automatycznie.`)) return;
                  setTrwa(true);
                  try {
                    pobierzPlik(nazwaPliku(`${meta.nazwa} kopia przed importem`, "json"), eksportJson(meta, dane), "application/json");
                    const nowe = podglad.wynik.dane;
                    await zapiszDane(drzewoId, () => nowe);
                    await naZmiane();
                    setPodglad(null);
                    setKomunikat({ typ: "ok", tekst: `Zaimportowano ${nowe.osoby.length} osób i ${nowe.malzenstwa.length} małżeństw.` });
                  } catch (err) {
                    setKomunikat({ typ: "blad", tekst: komunikatBledu(err) });
                  }
                  setTrwa(false);
                }}
              >
                Zastąp zawartość drzewa
              </button>
              <button type="button" className="przycisk !min-h-9" onClick={() => setPodglad(null)}>
                Anuluj
              </button>
            </div>
          </div>
        )}
      </div>

      {komunikat && (
        <p role={komunikat.typ === "blad" ? "alert" : "status"} className={`text-sm font-semibold ${komunikat.typ === "blad" ? "text-blad" : ""}`}>
          {komunikat.tekst}
        </p>
      )}
    </section>
  );
}
