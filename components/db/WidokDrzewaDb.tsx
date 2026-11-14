"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormularzNowejOsoby } from "@/components/FormularzOsoby";
import { ListaGalezi } from "@/components/ListaGalezi";
import { Naglowek } from "@/components/Naglowek";
import { PlotnoDrzewa } from "@/components/PlotnoDrzewa";
import { IdDrzewa } from "@/components/IdDrzewa";
import { PowlokaMiekka } from "@/components/glowna/PowlokaMiekka";
import { Stopka } from "@/components/Stopka";
import { useKonto } from "@/components/konta/AuthProvider";
import { WidokIndeksuOsob } from "@/components/widoki/WidokIndeksuOsob";
import { WidokOsoby } from "@/components/widoki/WidokOsoby";
import { WidokStronyDrzewa } from "@/components/widoki/WidokStronyDrzewa";
import { type ApiEdycji } from "@/components/useEdycje";
import { daneWidoku, indeksSzukaniaDrzewa, przygotujDrzewo, statystykaWidoku } from "@/lib/dane-czyste";
import { przypiszNumer, uzupelnijNazwiska, wczytajDrzewo, wyslijProsbe, zapiszDane, type WynikWczytania } from "@/lib/baza/api";
import { komunikatBledu } from "@/lib/baza/konta";
import * as L from "@/lib/baza/logika";
import { type DaneDb } from "@/lib/baza/typy";
import { metaDlaWidokow } from "@/lib/baza/widok";
import { firebaseSkonfigurowany } from "@/lib/baza/firebase";
import { PUSTE_EDYCJE } from "@/lib/edycje";
import { galezieWidoku, ID_CALEGO } from "@/lib/galezie";
import { slugDb, sciezkaDrzewa, sciezkaUstawienDrzewa } from "@/lib/sciezki";
import { KontekstDb } from "./KontekstDb";
import { UstawieniaDrzewa } from "./UstawieniaDrzewa";

type Wczytane = Extract<WynikWczytania, { stan: "ok" }>;

function Komunikat({ tytul, tekst, akcja }: { tytul: string; tekst: string; akcja?: React.ReactNode }) {
  return (
    <>
      <Naglowek />
      <main id="tresc" className="mx-auto w-full max-w-xl flex-1 px-4 py-16 text-center">
        <h1 className="text-4xl">{tytul}</h1>
        <p className="mt-3 text-tekst-2">{tekst}</p>
        {akcja && <p className="mt-6 flex flex-wrap justify-center gap-3">{akcja}</p>}
      </main>
      <Stopka />
    </>
  );
}

/** Przycisk „Poproś o dostęp” dla zalogowanego użytkownika, który trafił na cudze prywatne drzewo. */
function ProsbaODostep({ drzewoId, uid, nazwa, zweryfikowany }: { drzewoId: string; uid: string; nazwa: string; zweryfikowany: boolean }) {
  const [stan, setStan] = useState<{ typ: "ok" | "blad"; tekst: string } | null>(null);
  const [trwa, setTrwa] = useState(false);
  return (
    <>
      <button
        type="button"
        className="przycisk przycisk-glowny"
        disabled={trwa || !zweryfikowany || stan?.typ === "ok"}
        onClick={async () => {
          setTrwa(true);
          try {
            await wyslijProsbe(drzewoId, uid, nazwa);
            setStan({ typ: "ok", tekst: "Prośba wysłana. Gdy właściciel ją zatwierdzi, drzewo pojawi się w Twoim profilu w sekcji „Współpracuję przy”." });
          } catch (e) {
            setStan({ typ: "blad", tekst: komunikatBledu(e) });
          }
          setTrwa(false);
        }}
      >
        Poproś o dostęp jako kolaborant
      </button>
      {!zweryfikowany && <span className="basis-full text-sm text-tekst-2">Najpierw potwierdź adres e-mail w swoim profilu.</span>}
      {stan && (
        <span role={stan.typ === "blad" ? "alert" : "status"} className={`basis-full text-sm font-semibold ${stan.typ === "blad" ? "text-blad" : ""}`}>
          {stan.tekst}
        </span>
      )}
    </>
  );
}

/** Widok drzewa trzymanego w bazie: strona /d/?id=…&w=… (w = info, galaz, diagram, osoba, osoby, ustawienia). */
export function WidokDrzewaDb() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const w = params.get("w") ?? "";
  const galaz = params.get("g") ?? ID_CALEGO;
  const os = params.get("os") ?? "";
  const konto = useKonto();

  const [wczytane, setWczytane] = useState<Wczytane | "laduje" | "brak" | "zakaz" | "blad">("laduje");
  const [dane, setDane] = useState<DaneDb | null>(null);
  const daneRef = useRef<DaneDb | null>(null);
  const [zapisujeLicznik, setZapisuje] = useState(0);
  const [blad, setBlad] = useState<string | null>(null);
  const kolejka = useRef<Promise<void>>(Promise.resolve());

  const uid = konto.uid;
  const czyAdmin = konto.czyAdmin;
  const kontoGotowe = konto.status === "gosc" || konto.status === "zalogowany";

  const przeladuj = useCallback(async () => {
    if (!id) return;
    try {
      const wynik = await wczytajDrzewo(id, uid, czyAdmin);
      if (wynik.stan === "ok") {
        daneRef.current = wynik.dane;
        setDane(wynik.dane);
        setWczytane(wynik);
      } else setWczytane(wynik.stan);
    } catch {
      setWczytane("blad");
    }
  }, [id, uid, czyAdmin]);

  useEffect(() => {
    if (!kontoGotowe || !id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- wczytanie danych po zmianie drzewa lub konta
    void przeladuj();
  }, [kontoGotowe, id, przeladuj]);

  const meta = typeof wczytane === "object" ? wczytane.meta : null;
  const dostep = typeof wczytane === "object" ? wczytane.dostep : "gosc";
  const mozeEdytowac = dostep !== "gosc";

  // Zmiana danych: najpierw natychmiast w widoku, potem w transakcji na serwerze (kolejka zachowuje kolejność zmian).
  const mutuj = useCallback(
    (zmiana: (d: DaneDb) => DaneDb) => {
      if (!daneRef.current) return;
      setBlad(null);
      try {
        const nowe = zmiana(daneRef.current);
        L.sprawdzDane(nowe);
        daneRef.current = nowe;
        setDane(nowe);
      } catch (e) {
        setBlad(komunikatBledu(e));
        return;
      }
      setZapisuje((n) => n + 1);
      kolejka.current = kolejka.current
        .then(() => zapiszDane(id, zmiana))
        .catch(async (e) => {
          setBlad(`Nie udało się zapisać zmiany: ${komunikatBledu(e)}`);
          await przeladuj();
        })
        .finally(() => setZapisuje((n) => n - 1));
    },
    [id, przeladuj],
  );

  const api = useMemo<ApiEdycji>(
    () => ({
      mozeEdytowac,
      edycje: PUSTE_EDYCJE,
      liczbaZmian: 0,
      zapiszOsobe: (osobaId, patch) => mutuj(L.zapiszOsobe(osobaId, patch)),
      cofnijOsobe: () => {},
      dodajOsobe: (nowa) => mutuj(L.dodajOsobe(nowa)),
      usunDodana: () => {},
      wyczysc: () => {},
      pobierz: () => {},
      dodajMalzonka: (osobaId, nowa) => mutuj(L.dodajMalzonka(osobaId, nowa)),
      mozeZmieniacRodzicow: true,
      dodajRodzenstwo: (osobaId, nowa) => mutuj(L.dodajRodzenstwo(osobaId, nowa)),
      dodajRodzica: (dzieckoId, rola, nowa) => mutuj(L.dodajRodzica(dzieckoId, rola, nowa)),
      usunOsobe: (osobaId) => mutuj(L.usunOsobe(osobaId)),
      zapisuje: zapisujeLicznik > 0,
      blad,
    }),
    [mozeEdytowac, mutuj, zapisujeLicznik, blad],
  );

  // Edytujący widzą pełne dane; pozostali – dane już okrojone przez serwer (polityka dat).
  const drzewo = useMemo(() => {
    if (!meta || !dane || !dane.osoby.length) return null;
    return przygotujDrzewo(metaDlaWidokow(id, meta, mozeEdytowac), dane);
  }, [id, meta, dane, mozeEdytowac]);
  const indeks = useMemo(() => (drzewo ? indeksSzukaniaDrzewa(drzewo) : []), [drzewo]);

  // Starsze drzewa nie mają jeszcze krótkiego numeru: nadajemy go przy pierwszym otwarciu przez właściciela (lub administratora).
  const brakNumeru = !!meta && !meta.numer && (dostep === "wlasciciel" || dostep === "admin") && konto.zweryfikowany;
  useEffect(() => {
    if (!brakNumeru) return;
    let aktualne = true;
    przypiszNumer(id)
      .then(async () => {
        if (aktualne) await przeladuj();
      })
      .catch(() => null);
    return () => {
      aktualne = false;
    };
  }, [brakNumeru, id, przeladuj]);

  // To samo z listą nazwisk do wyszukiwania drzew po nazwisku (drzewa sprzed tej funkcji).
  const brakNazwisk = !!meta && !meta.nazwiska && (dostep === "wlasciciel" || dostep === "admin") && konto.zweryfikowany;
  useEffect(() => {
    if (!brakNazwisk) return;
    uzupelnijNazwiska(id).catch(() => null);
  }, [brakNazwisk, id]);

  useEffect(() => {
    if (meta) document.title = `${meta.nazwa} – Przodkowie`;
  }, [meta]);

  if (!firebaseSkonfigurowany) return <Komunikat tytul="Konta nie są włączone" tekst="Ten serwis nie ma jeszcze skonfigurowanej bazy drzew użytkowników." />;
  if (!id) return <Komunikat tytul="Brak drzewa" tekst="Adres nie wskazuje żadnego drzewa." akcja={<Link href="/drzewa/" className="przycisk przycisk-glowny">Katalog drzew</Link>} />;
  if (!kontoGotowe || wczytane === "laduje") return <><Naglowek /><p className="flex-1 px-4 py-16 text-center text-tekst-2" role="status">Wczytywanie drzewa…</p></>;
  if (wczytane === "blad") return <Komunikat tytul="Nie udało się wczytać drzewa" tekst="Sprawdź połączenie z internetem i odśwież stronę." />;
  if (wczytane === "brak" || wczytane === "zakaz" || !meta) {
    return (
      <Komunikat
        tytul="Nie ma takiego drzewa"
        tekst={uid ? "Drzewo nie istnieje albo jest prywatne i nie masz do niego dostępu. Jeśli znasz jego właściciela, możesz poprosić o dostęp jako kolaborant." : "Drzewo nie istnieje albo jest prywatne. Jeśli ktoś Ci je udostępnił, zaloguj się na swoje konto."}
        akcja={
          uid ? (
            <>
              {wczytane === "zakaz" && konto.profil && (
                <ProsbaODostep drzewoId={id} uid={uid} nazwa={`${konto.profil.imie} ${konto.profil.nazwisko}`} zweryfikowany={konto.zweryfikowany} />
              )}
              <Link href="/profil/" className="przycisk">Mój profil</Link>
            </>
          ) : (
            <Link href="/logowanie/" className="przycisk przycisk-glowny">Zaloguj się</Link>
          )
        }
      />
    );
  }

  const slug = slugDb(id);
  const galezie = (drzewo?.galezieLista ?? dane?.galezie ?? []).map((g) => ({ id: g.id, nazwa: g.nazwa, kolor: g.kolor }));
  const rola = dostep === "wlasciciel" ? "Właściciel" : dostep === "kolaborant" ? "Kolaborant" : dostep === "admin" ? "Administrator" : null;

  let tresc: React.ReactNode;
  if (w === "ustawienia") {
    tresc = (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-8 pt-8">
        <UstawieniaDrzewa key={id} drzewoId={id} meta={meta} dane={dane} dostep={dostep} naZmiane={przeladuj} />
      </main>
    );
  } else if (!drzewo) {
    tresc = (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-8 pt-10">
        <h1 className="text-4xl">{meta.nazwa}</h1>
        {meta.opis && <p className="mt-2 text-tekst-2">{meta.opis}</p>}
        {mozeEdytowac && dane ? (
          <div className="szklo mt-6 p-6">
            <p className="mb-4 text-sm text-tekst-2">To drzewo jest jeszcze puste. Zacznij od siebie albo od najstarszego znanego przodka – kolejne osoby (dzieci, małżonków, rodziców) dodasz z panelu osoby.</p>
            <FormularzNowejOsoby tytul="Dodaj pierwszą osobę" przycisk="Dodaj osobę" wszystkieId={new Set()} galazId={dane.galezie[0].id} naZapis={(n) => api.dodajOsobe(n)} naGotowe={() => {}} />
            {blad && <p role="alert" className="mt-3 text-sm font-semibold text-blad">{blad}</p>}
          </div>
        ) : (
          <p className="mt-6 text-tekst-2">To drzewo jest jeszcze puste.</p>
        )}
      </main>
    );
  } else if (w === "galaz" || w === "lista") {
    const s = statystykaWidoku(drzewo, galaz) ?? statystykaWidoku(drzewo, ID_CALEGO)!;
    const poprawna = galezieWidoku(drzewo.galezieLista).some((g) => g.id === galaz) ? galaz : ID_CALEGO;
    tresc = <ListaGalezi key={`l-${poprawna}`} slug={slug} {...daneWidoku(drzewo)} galazId={poprawna} liczbaOsob={s.osob} />;
  } else if (w === "diagram") {
    const poprawna = galezieWidoku(drzewo.galezieLista).some((g) => g.id === galaz) ? galaz : ID_CALEGO;
    tresc = (
      <main className="relative min-h-[30rem] flex-1">
        <PlotnoDrzewa key={`d-${poprawna}`} slug={slug} {...daneWidoku(drzewo)} galazId={poprawna} />
      </main>
    );
  } else if (w === "osoba") {
    tresc = drzewo.osoby.has(os) ? <WidokOsoby d={drzewo} id={os} mozeDodawac={mozeEdytowac} /> : <p className="px-4 py-16 text-center text-tekst-2">Nie ma takiej osoby w tym drzewie.</p>;
  } else if (w === "osoby") {
    tresc = <WidokIndeksuOsob d={drzewo} />;
  } else {
    tresc = <WidokStronyDrzewa d={drzewo} numer={meta.numer} />;
  }

  const pelnoekranowy = w === "galaz" || w === "lista" || w === "diagram";
  const stronaDrzewa = !!drzewo && w !== "ustawienia" && !pelnoekranowy && w !== "osoba" && w !== "osoby";

  // Pasek z rolą użytkownika w drzewie; na stronie drzewa (styl miękki) jako biała pigułka, w pozostałych widokach jak dotąd.
  const pasekRoli = (miekki: boolean) =>
    rola && (
      <div className={miekki ? "mx-auto mt-3 w-full max-w-[1160px] px-4 sm:px-8" : "border-b border-kreska bg-najazd px-4 py-1.5 text-sm"}>
        <div className={miekki ? "g-szklo flex flex-wrap items-center gap-x-4 gap-y-1 rounded-3xl px-5 py-2.5 text-sm" : "mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1"}>
          <span>
            <strong>{rola}</strong> · {meta.widocznosc === "publiczne" ? "drzewo publiczne" : "drzewo prywatne"} · osoby żyjące: {{ ukryj: "tylko imię i nazwisko", "tylko-rok": "z rokiem urodzenia", pokaz: "pełne dane" }[meta.politykaDatZyjacych]}
          </span>
          <IdDrzewa numer={meta.numer} />
          <span className={miekki ? "g-t3" : "text-tekst-2"} role="status">{zapisujeLicznik > 0 ? "Zapisywanie…" : blad ? "" : "Zapisano"}</span>
          <span className="ml-auto flex gap-3">
            <Link href={sciezkaDrzewa(slug)} className={miekki ? "g-akcent font-semibold underline-offset-2 hover:underline" : "link"}>Strona drzewa</Link>
            {(dostep === "wlasciciel" || dostep === "admin") && (
              <Link href={sciezkaUstawienDrzewa(slug)} className={miekki ? "g-akcent font-semibold underline-offset-2 hover:underline" : "link"}>Ustawienia i kolaboranci</Link>
            )}
          </span>
        </div>
      </div>
    );

  if (stronaDrzewa) {
    return (
      <KontekstDb.Provider value={{ drzewoId: id, api, indeks }}>
        <PowlokaMiekka
          pasek={
            <>
              {pasekRoli(true)}
              {blad && (
                <p role="alert" className="mx-auto mt-3 w-full max-w-[1160px] px-4 text-sm font-semibold text-blad sm:px-8">
                  {blad}
                </p>
              )}
            </>
          }
        >
          {tresc}
        </PowlokaMiekka>
      </KontekstDb.Provider>
    );
  }

  return (
    <KontekstDb.Provider value={{ drzewoId: id, api, indeks }}>
      <Naglowek drzewo={{ slug, nazwa: meta.nazwa, galezie }} />
      {pasekRoli(false)}
      <div id="tresc" className="flex flex-1 flex-col">
        {blad && w !== "ustawienia" && !pelnoekranowy && (
          <p role="alert" className="mx-auto mt-3 w-full max-w-7xl px-4 text-sm font-semibold text-blad">{blad}</p>
        )}
        {tresc}
        {!pelnoekranowy || w === "galaz" || w === "lista" ? <Stopka drzewo={metaDlaWidokow(id, meta)} /> : null}
      </div>
    </KontekstDb.Provider>
  );
}
