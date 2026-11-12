"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { dodajKolaboranta, usunDrzewo, usunKolaboranta, zapiszUstawienia } from "@/lib/baza/api";
import { komunikatBledu } from "@/lib/baza/konta";
import type { Dostep, MetaDb, Widocznosc } from "@/lib/baza/typy";
import { MAKS_KOLABORANTOW } from "@/lib/baza/typy";
import { POLITYKI_DAT, type PolitykaDat } from "@/lib/schemat-drzewa";
import { ADRES_SERWISU, sciezkaDrzewa } from "@/lib/sciezki";

const OPISY_POLITYK: Record<PolitykaDat, { tytul: string; opis: string }> = {
  ukryj: { tytul: "Tylko imię i nazwisko", opis: "Daty, miejsca i notatki osób żyjących są ukryte przed odwiedzającymi." },
  "tylko-rok": { tytul: "Imię, nazwisko i rok urodzenia", opis: "Odwiedzający widzą rok urodzenia osób żyjących, bez miejsc i notatek." },
  pokaz: { tytul: "Wszystkie dane", opis: "Dane osób żyjących są widoczne tak samo jak pozostałych. Używaj ostrożnie." },
};

/** Ustawienia drzewa: dane podstawowe, widoczność, prywatność osób żyjących, kolaboranci, usunięcie. */
export function UstawieniaDrzewa({ drzewoId, meta, dostep, naZmiane }: { drzewoId: string; meta: MetaDb; dostep: Dostep; naZmiane: () => Promise<void> }) {
  const id = useId();
  const router = useRouter();
  const [nazwa, setNazwa] = useState(meta.nazwa);
  const [opis, setOpis] = useState(meta.opis);
  const [region, setRegion] = useState(meta.region);
  const [widocznosc, setWidocznosc] = useState<Widocznosc>(meta.widocznosc);
  const [polityka, setPolityka] = useState<PolitykaDat>(meta.politykaDatZyjacych);
  const [komunikat, setKomunikat] = useState<{ typ: "ok" | "blad"; tekst: string } | null>(null);
  const [trwa, setTrwa] = useState(false);
  const [email, setEmail] = useState("");
  const [potwierdzenie, setPotwierdzenie] = useState("");

  const zarzadzanie = dostep === "wlasciciel" || dostep === "admin";
  if (!zarzadzanie) {
    return <p className="szklo p-6 text-tekst-2">Ustawienia drzewa może zmieniać tylko jego właściciel. Jako kolaborant możesz edytować osoby w drzewie.</p>;
  }
  const kolaboranci = meta.kolaboranci.map((uid) => ({ uid, nazwa: meta.kolaboranciInfo[uid]?.nazwa ?? uid }));

  const wykonaj = async (dzialanie: () => Promise<void>, sukces: string) => {
    setTrwa(true);
    setKomunikat(null);
    try {
      await dzialanie();
      await naZmiane();
      setKomunikat({ typ: "ok", tekst: sukces });
    } catch (e) {
      setKomunikat({ typ: "blad", tekst: komunikatBledu(e) });
    }
    setTrwa(false);
  };

  const adres = typeof window === "undefined" ? "" : `${window.location.origin}${ADRES_SERWISU.replace(window.location.origin, "").replace(/\/$/, "")}${sciezkaDrzewa(`d~${drzewoId}`)}`;

  return (
    <div className="grid gap-6">
      <form
        className="szklo space-y-4 p-6"
        aria-label="Ustawienia podstawowe"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nazwa.trim()) return setKomunikat({ typ: "blad", tekst: "Podaj nazwę drzewa." });
          void wykonaj(() => zapiszUstawienia(drzewoId, { nazwa, opis, region, widocznosc, politykaDatZyjacych: polityka }), "Zapisano ustawienia.");
        }}
      >
        <h2 className="text-2xl">Ustawienia drzewa</h2>
        <div>
          <label className="block text-sm text-tekst-2" htmlFor={`${id}-n`}>
            Nazwa drzewa
          </label>
          <input id={`${id}-n`} className="pole mt-1 w-full" value={nazwa} maxLength={120} onChange={(e) => setNazwa(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-tekst-2" htmlFor={`${id}-o`}>
            Opis (opcjonalnie)
          </label>
          <textarea id={`${id}-o`} className="pole mt-1 w-full !py-2" rows={3} maxLength={1000} value={opis} onChange={(e) => setOpis(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-tekst-2" htmlFor={`${id}-r`}>
            Region (opcjonalnie)
          </label>
          <input id={`${id}-r`} className="pole mt-1 w-full" value={region} maxLength={120} onChange={(e) => setRegion(e.target.value)} />
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">Kto widzi drzewo</legend>
          {(
            [
              ["prywatne", "Prywatne", "Widzisz je tylko Ty i zaproszeni kolaboranci."],
              ["publiczne", "Publiczne", "Każdy z linkiem może je przeglądać, a drzewo pojawia się w katalogu drzew."],
            ] as const
          ).map(([wartosc, tytul, opisW]) => (
            <label key={wartosc} className="mt-2 flex items-start gap-2 text-sm">
              <input type="radio" name={`${id}-w`} className="mt-1 size-4" checked={widocznosc === wartosc} onChange={() => setWidocznosc(wartosc)} />
              <span>
                <strong>{tytul}</strong>
                <span className="block text-tekst-2">{opisW}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold">Osoby żyjące – co widzą odwiedzający</legend>
          <p className="mt-1 text-xs text-tekst-2">Dotyczy osób oznaczonych jako żyjące. Ty i kolaboranci zawsze widzicie pełne dane. W drzewie publicznym to ustawienie chroni prywatność Twoich bliskich.</p>
          {POLITYKI_DAT.map((p) => (
            <label key={p} className="mt-2 flex items-start gap-2 text-sm">
              <input type="radio" name={`${id}-p`} className="mt-1 size-4" checked={polityka === p} onChange={() => setPolityka(p)} />
              <span>
                <strong>{OPISY_POLITYK[p].tytul}</strong>
                <span className="block text-tekst-2">{OPISY_POLITYK[p].opis}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {komunikat && (
          <p role={komunikat.typ === "blad" ? "alert" : "status"} className={`text-sm font-semibold ${komunikat.typ === "blad" ? "text-blad" : ""}`}>
            {komunikat.tekst}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="przycisk przycisk-glowny !min-h-10" disabled={trwa}>
            Zapisz ustawienia
          </button>
          {meta.widocznosc === "publiczne" && adres && (
            <button type="button" className="przycisk !min-h-10" onClick={() => void navigator.clipboard?.writeText(adres).then(() => setKomunikat({ typ: "ok", tekst: "Skopiowano link do drzewa." }))}>
              Kopiuj link do drzewa
            </button>
          )}
        </div>
      </form>

      <section className="szklo space-y-3 p-6" aria-label="Kolaboranci">
        <h2 className="text-2xl">Kolaboranci</h2>
        <p className="text-sm text-tekst-2">Kolaborant może dodawać, edytować i usuwać osoby w tym drzewie. Nie zmienia ustawień drzewa, nie dodaje kolejnych kolaborantów i nie usuwa drzewa. Musi mieć konto w serwisie z potwierdzonym adresem e-mail.</p>
        {kolaboranci.length > 0 ? (
          <ul className="divide-y divide-kreska">
            {kolaboranci.map((k) => (
              <li key={k.uid} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate">{k.nazwa}</span>
                <button
                  type="button"
                  className="przycisk !min-h-8"
                  disabled={trwa}
                  onClick={() => {
                    if (window.confirm(`Odebrać ${k.nazwa} dostęp do tego drzewa?`)) void wykonaj(() => usunKolaboranta(drzewoId, k.uid), "Usunięto kolaboranta.");
                  }}
                >
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-tekst-2">Brak kolaborantów.</p>
        )}
        <form
          className="flex flex-wrap items-end gap-2"
          aria-label="Dodaj kolaboranta"
          onSubmit={(e) => {
            e.preventDefault();
            void wykonaj(async () => {
              await dodajKolaboranta(drzewoId, email, meta.wlascicielId, meta.kolaboranci.length);
              setEmail("");
            }, "Dodano kolaboranta.");
          }}
        >
          <div className="min-w-0 flex-1">
            <label className="block text-sm text-tekst-2" htmlFor={`${id}-k`}>
              Adres e-mail użytkownika (max {MAKS_KOLABORANTOW})
            </label>
            <input id={`${id}-k`} type="email" className="pole mt-1 w-full" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="przycisk przycisk-glowny !min-h-10" disabled={trwa || !email.trim()}>
            Dodaj kolaboranta
          </button>
        </form>
      </section>

      <section className="szklo space-y-3 border-blad p-6" aria-label="Usuwanie drzewa">
        <h2 className="text-2xl text-blad">Usuń drzewo</h2>
        <p className="text-sm">Usunięcie jest nieodwracalne: znikną wszystkie osoby i powiązania tego drzewa. Aby potwierdzić, wpisz jego nazwę: <strong>{meta.nazwa}</strong></p>
        <input className="pole w-full" value={potwierdzenie} onChange={(e) => setPotwierdzenie(e.target.value)} aria-label="Potwierdź nazwą drzewa" />
        <button
          type="button"
          className="przycisk !min-h-10"
          disabled={trwa || potwierdzenie.trim() !== meta.nazwa}
          onClick={async () => {
            setTrwa(true);
            try {
              await usunDrzewo(drzewoId);
              router.replace("/profil/");
            } catch (e) {
              setKomunikat({ typ: "blad", tekst: komunikatBledu(e) });
              setTrwa(false);
            }
          }}
        >
          Usuń drzewo na stałe
        </button>
      </section>
    </div>
  );
}
