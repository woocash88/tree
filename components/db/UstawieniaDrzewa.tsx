"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { dodajKolaboranta, listaProsbDrzewa, przekazWlasnosc, usunDrzewo, usunKolaboranta, usunProsbe, zapiszUstawienia, zatwierdzProsbe } from "@/lib/baza/api";
import { komunikatBledu } from "@/lib/baza/konta";
import type { DaneDb, Dostep, MetaDb, Prosba, Widocznosc } from "@/lib/baza/typy";
import { IdDrzewa } from "@/components/IdDrzewa";
import { WymianaDanych } from "./WymianaDanych";
import { MAKS_KOLABORANTOW } from "@/lib/baza/typy";
import { POLITYKI_DAT, type PolitykaDat } from "@/lib/schemat-drzewa";
import { ADRES_SERWISU, sciezkaDrzewa } from "@/lib/sciezki";

const OPISY_POLITYK: Record<PolitykaDat, { tytul: string; opis: string }> = {
  ukryj: { tytul: "Tylko imię i nazwisko", opis: "Daty, miejsca i notatki osób żyjących są ukryte przed odwiedzającymi." },
  "tylko-rok": { tytul: "Imię, nazwisko i rok urodzenia", opis: "Odwiedzający widzą rok urodzenia osób żyjących, bez miejsc i notatek." },
  pokaz: { tytul: "Wszystkie dane", opis: "Dane osób żyjących są widoczne tak samo jak pozostałych. Używaj ostrożnie." },
};

/** Ustawienia drzewa: dane podstawowe, widoczność, prywatność osób żyjących, kolaboranci, usunięcie. */
export function UstawieniaDrzewa({ drzewoId, meta, dane, dostep, naZmiane }: { drzewoId: string; meta: MetaDb; dane: DaneDb | null; dostep: Dostep; naZmiane: () => Promise<void> }) {
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
  const [prosby, setProsby] = useState<Prosba[]>([]);
  const [nowyWlasciciel, setNowyWlasciciel] = useState("");

  const zarzadzanie = dostep === "wlasciciel" || dostep === "admin";
  const wczytajProsby = useCallback(async () => {
    if (!zarzadzanie) return;
    try {
      setProsby(await listaProsbDrzewa(drzewoId));
    } catch {
      /* brak prośb lub chwilowy błąd – lista jest dodatkiem */
    }
  }, [zarzadzanie, drzewoId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- wczytanie próśb o dołączenie po wejściu w ustawienia
    void wczytajProsby();
  }, [wczytajProsby]);

  if (!zarzadzanie) {
    return (
      <div className="szklo space-y-3 p-6">
        {komunikat && (
          <p role={komunikat.typ === "blad" ? "alert" : "status"} className={`font-semibold ${komunikat.typ === "blad" ? "text-blad" : ""}`}>
            {komunikat.tekst}
          </p>
        )}
        <p className="text-tekst-2">Ustawienia drzewa może zmieniać tylko jego właściciel. Jako kolaborant możesz edytować osoby w drzewie.</p>
      </div>
    );
  }
  const kolaboranci = meta.kolaboranci.map((uid) => ({ uid, nazwa: meta.kolaboranciInfo[uid]?.nazwa ?? uid }));

  const wykonaj = async (dzialanie: () => Promise<void>, sukces: string) => {
    setTrwa(true);
    setKomunikat(null);
    try {
      await dzialanie();
      await naZmiane();
      await wczytajProsby();
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
          <IdDrzewa id={drzewoId} />
          <p className="mt-1 text-sm text-tekst-2">Aby zaprosić kogoś do współpracy, podaj mu ten identyfikator (albo link). Osoba wkleja go w swoim profilu w sekcji „Dołącz do istniejącego drzewa”, a Ty zatwierdzasz jej prośbę poniżej.</p>
        </div>
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
          {adres && (
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

      {prosby.length > 0 && (
        <section className="szklo space-y-3 p-6" aria-label="Prośby o dołączenie">
          <h2 className="text-2xl">Prośby o dołączenie ({prosby.length})</h2>
          <p className="text-sm text-tekst-2">Te osoby chcą być kolaborantami tego drzewa. Zatwierdź tylko te, które znasz – kolaborant widzi pełne dane i może edytować osoby.</p>
          <ul className="divide-y divide-kreska">
            {prosby.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate">
                  {p.nazwa} <span className="text-sm text-tekst-2">· {p.utworzono.slice(0, 10)}</span>
                </span>
                <button type="button" className="przycisk przycisk-glowny !min-h-8" disabled={trwa} onClick={() => void wykonaj(() => zatwierdzProsbe(p, meta.kolaboranci.length), `Dodano kolaboranta: ${p.nazwa}.`)}>
                  Zatwierdź
                </button>
                <button type="button" className="przycisk !min-h-8" disabled={trwa} onClick={() => void wykonaj(() => usunProsbe(p.id), "Odrzucono prośbę.")}>
                  Odrzuć
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dostep === "wlasciciel" && (
        <section className="szklo space-y-3 p-6" aria-label="Przekazanie własności">
          <h2 className="text-2xl">Przekaż własność drzewa</h2>
          <p className="text-sm text-tekst-2">Nowy właściciel przejmie pełną kontrolę nad drzewem: ustawienia, kolaborantów i usunięcie. Ty zostaniesz kolaborantem. Dzięki temu możesz usunąć swoje konto bez utraty drzewa. Drzewo można przekazać tylko jednemu ze swoich kolaborantów – najpierw dodaj go wyżej.</p>
          {kolaboranci.length > 0 ? (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-sm text-tekst-2" htmlFor={`${id}-pw`}>
                  Nowy właściciel
                </label>
                <select id={`${id}-pw`} className="pole mt-1 block w-64" value={nowyWlasciciel} onChange={(e) => setNowyWlasciciel(e.target.value)}>
                  <option value="">wybierz kolaboranta…</option>
                  {kolaboranci.map((k) => (
                    <option key={k.uid} value={k.uid}>
                      {k.nazwa}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="przycisk !min-h-10"
                disabled={trwa || !nowyWlasciciel}
                onClick={() => {
                  const wybrany = kolaboranci.find((k) => k.uid === nowyWlasciciel);
                  if (!wybrany || !window.confirm(`Przekazać drzewo „${meta.nazwa}” użytkownikowi ${wybrany.nazwa}?\n\nStracisz możliwość zmiany jego ustawień i usunięcia (zostaniesz kolaborantem).`)) return;
                  void wykonaj(() => przekazWlasnosc(drzewoId, meta, nowyWlasciciel), `Drzewo przekazano użytkownikowi ${wybrany.nazwa}. Jesteś teraz jego kolaborantem.`);
                }}
              >
                Przekaż własność
              </button>
            </div>
          ) : (
            <p className="text-sm italic text-tekst-2">Brak kolaborantów, którym można przekazać drzewo.</p>
          )}
        </section>
      )}

      <WymianaDanych drzewoId={drzewoId} meta={meta} dane={dane} naZmiane={naZmiane} />

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
