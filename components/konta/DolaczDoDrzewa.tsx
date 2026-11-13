"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { drzewoIdZNumeru, listaMoichProsb, nazwaDrzewa, usunProsbe, wyslijProsbe } from "@/lib/baza/api";
import { komunikatBledu } from "@/lib/baza/konta";
import { idDrzewaZTekstu, numerDrzewaZTekstu, type Prosba } from "@/lib/baza/typy";
import { useKonto } from "./AuthProvider";

type WpisProsby = Prosba & { nazwaDrzewa: string | null };

/** Dołączanie do cudzego drzewa jako kolaborant: prośba po linku lub identyfikatorze, zatwierdza ją właściciel drzewa. */
export function DolaczDoDrzewa({ nazwaUzytkownika }: { nazwaUzytkownika: string }) {
  const id = useId();
  const konto = useKonto();
  const uid = konto.uid;
  const [tekst, setTekst] = useState("");
  const [prosby, setProsby] = useState<WpisProsby[]>([]);
  const [komunikat, setKomunikat] = useState<{ typ: "ok" | "blad"; tekst: string } | null>(null);
  const [trwa, setTrwa] = useState(false);

  const wczytaj = useCallback(async () => {
    if (!uid) return;
    try {
      const lista = await listaMoichProsb(uid);
      setProsby(await Promise.all(lista.map(async (p) => ({ ...p, nazwaDrzewa: await nazwaDrzewa(p.drzewoId) }))));
    } catch {
      /* lista jest dodatkiem – błąd nie blokuje wysyłania prośby */
    }
  }, [uid]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- wczytanie własnych próśb po wejściu na profil
    void wczytaj();
  }, [wczytaj]);

  return (
    <section className="szklo space-y-3 p-5" aria-label="Dołącz do drzewa">
      <h2 className="text-xl">Dołącz do istniejącego drzewa</h2>
      <p className="text-sm text-tekst-2">Jako kolaborant możesz dodawać i edytować osoby w drzewie innego użytkownika. Poproś właściciela o numer drzewa (widoczny obok jego nazwy) albo o link do drzewa, wpisz go poniżej i wyślij prośbę – właściciel musi ją zatwierdzić. Gdy to zrobi, drzewo pojawi się w sekcji „Współpracuję przy”.</p>
      <form
        className="flex flex-wrap items-end gap-2"
        aria-label="Prośba o dołączenie"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!uid) return;
          const numer = numerDrzewaZTekstu(tekst);
          if (!numer && !idDrzewaZTekstu(tekst)) return setKomunikat({ typ: "blad", tekst: "Wpisz numer drzewa (np. 48213) albo wklej link do drzewa od właściciela." });
          setTrwa(true);
          setKomunikat(null);
          try {
            const drzewoId = numer ? await drzewoIdZNumeru(numer) : idDrzewaZTekstu(tekst);
            if (!drzewoId) {
              setKomunikat({ typ: "blad", tekst: `Nie ma drzewa o numerze ${numer}. Sprawdź numer u właściciela drzewa.` });
              setTrwa(false);
              return;
            }
            await wyslijProsbe(drzewoId, uid, nazwaUzytkownika);
            setTekst("");
            setKomunikat({ typ: "ok", tekst: "Prośba została wysłana. Właściciel zobaczy ją w ustawieniach drzewa." });
            await wczytaj();
          } catch (err) {
            setKomunikat({ typ: "blad", tekst: komunikatBledu(err) });
          }
          setTrwa(false);
        }}
      >
        <div className="min-w-0 flex-1">
          <label className="block text-sm text-tekst-2" htmlFor={`${id}-l`}>
            Numer drzewa lub link do drzewa
          </label>
          <input id={`${id}-l`} className="pole mt-1 w-full" value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="np. 48213" disabled={!konto.zweryfikowany} />
        </div>
        <button type="submit" className="przycisk przycisk-glowny !min-h-10" disabled={trwa || !tekst.trim() || !konto.zweryfikowany}>
          Wyślij prośbę
        </button>
      </form>
      {!konto.zweryfikowany && <p className="text-sm text-tekst-2">Najpierw potwierdź adres e-mail.</p>}
      {komunikat && (
        <p role={komunikat.typ === "blad" ? "alert" : "status"} className={`text-sm font-semibold ${komunikat.typ === "blad" ? "text-blad" : ""}`}>
          {komunikat.tekst}
        </p>
      )}
      {prosby.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Wysłane prośby (czekają na zatwierdzenie)</h3>
          <ul className="mt-1 divide-y divide-kreska">
            {prosby.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{p.nazwaDrzewa ?? "Drzewo prywatne"} <span className="text-tekst-2">· {p.utworzono.slice(0, 10)}</span></span>
                <button
                  type="button"
                  className="przycisk !min-h-8"
                  onClick={async () => {
                    await usunProsbe(p.id).catch(() => {});
                    await wczytaj();
                  }}
                >
                  Wycofaj
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
