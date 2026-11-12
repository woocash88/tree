"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { listaMoich, listaProsbDrzewa, opuscDrzewo, utworzDrzewo, type WpisDrzewa } from "@/lib/baza/api";
import { czyKontoUsuwane, komunikatBledu, usunWlasneKonto, wyloguj, wyslijWeryfikacje, zakonczUsuwanieKonta, zapiszProfil } from "@/lib/baza/konta";
import { POLITYKI_DAT, type PolitykaDat } from "@/lib/schemat-drzewa";
import type { Widocznosc } from "@/lib/baza/typy";
import { ileOsob } from "@/lib/format";
import { sciezkaDrzewa, sciezkaUstawienDrzewa, slugDb } from "@/lib/sciezki";
import { AdresEmail } from "./AdresEmail";
import { useKonto } from "./AuthProvider";
import { DolaczDoDrzewa } from "./DolaczDoDrzewa";

const NAZWY_POLITYK: Record<PolitykaDat, string> = { ukryj: "tylko imię i nazwisko", "tylko-rok": "imię, nazwisko i rok urodzenia", pokaz: "wszystkie dane" };

function KartaMojegoDrzewa({ wpis, rola, prosby = 0, naOpusc }: { wpis: WpisDrzewa; rola: "wlasciciel" | "kolaborant"; prosby?: number; naOpusc?: () => void }) {
  const { meta } = wpis;
  const slug = slugDb(wpis.id);
  return (
    <li className="szklo flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
      <div className="min-w-0 flex-1">
        <h3 className="text-xl">
          <Link href={sciezkaDrzewa(slug)} className="link">
            {meta.nazwa}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-tekst-2">
          <span>{meta.widocznosc === "publiczne" ? "Publiczne" : "Prywatne"}</span>
          <span>{ileOsob(meta.statystyki.osob)}</span>
          {rola === "kolaborant" && <span>Właściciel: {meta.wlascicielNazwa}</span>}
          {meta.kolaboranci.length > 0 && <span>Kolaborantów: {meta.kolaboranci.length}</span>}
          {prosby > 0 && <span className="font-semibold text-akcent">Prośby o dołączenie: {prosby}</span>}
        </p>
      </div>
      <div className="flex gap-2">
        <Link href={sciezkaDrzewa(slug)} className="przycisk">
          Otwórz
        </Link>
        {rola === "wlasciciel" && (
          <Link href={sciezkaUstawienDrzewa(slug)} className="przycisk">
            {prosby > 0 ? "Ustawienia i prośby" : "Ustawienia"}
          </Link>
        )}
        {rola === "kolaborant" && naOpusc && (
          <button type="button" className="przycisk" onClick={naOpusc}>
            Opuść drzewo
          </button>
        )}
      </div>
    </li>
  );
}

function NoweDrzewo({ uid, nazwaWlasciciela, mozeTworzyc }: { uid: string; nazwaWlasciciela: string; mozeTworzyc: boolean }) {
  const id = useId();
  const router = useRouter();
  const [otwarte, setOtwarte] = useState(false);
  const [nazwa, setNazwa] = useState("");
  const [opis, setOpis] = useState("");
  const [region, setRegion] = useState("");
  const [widocznosc, setWidocznosc] = useState<Widocznosc>("prywatne");
  const [polityka, setPolityka] = useState<PolitykaDat>("ukryj");
  const [blad, setBlad] = useState("");
  const [trwa, setTrwa] = useState(false);

  if (!otwarte) {
    return (
      <button type="button" className="przycisk przycisk-glowny !min-h-11" disabled={!mozeTworzyc} onClick={() => setOtwarte(true)} title={mozeTworzyc ? undefined : "Najpierw potwierdź adres e-mail"}>
        + Utwórz nowe drzewo
      </button>
    );
  }
  return (
    <form
      className="szklo space-y-3 p-5"
      aria-label="Nowe drzewo"
      onSubmit={async (e) => {
        e.preventDefault();
        setBlad("");
        setTrwa(true);
        try {
          const nowe = await utworzDrzewo({ nazwa, opis, region, widocznosc, politykaDatZyjacych: polityka }, uid, nazwaWlasciciela);
          router.push(sciezkaDrzewa(slugDb(nowe)));
        } catch (err) {
          setBlad(komunikatBledu(err));
          setTrwa(false);
        }
      }}
    >
      <h3 className="text-xl">Nowe drzewo</h3>
      <div>
        <label className="block text-sm text-tekst-2" htmlFor={`${id}-n`}>
          Nazwa (np. „Rodzina Kowalskich”)
        </label>
        <input id={`${id}-n`} className="pole mt-1 w-full" value={nazwa} maxLength={120} onChange={(e) => setNazwa(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="block text-sm text-tekst-2" htmlFor={`${id}-o`}>
          Opis (opcjonalnie)
        </label>
        <textarea id={`${id}-o`} className="pole mt-1 w-full !py-2" rows={2} maxLength={1000} value={opis} onChange={(e) => setOpis(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-tekst-2" htmlFor={`${id}-r`}>
          Region (opcjonalnie)
        </label>
        <input id={`${id}-r`} className="pole mt-1 w-full" maxLength={120} value={region} onChange={(e) => setRegion(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-tekst-2" htmlFor={`${id}-w`}>
            Kto widzi drzewo
          </label>
          <select id={`${id}-w`} className="pole mt-1 w-full" value={widocznosc} onChange={(e) => setWidocznosc(e.target.value as Widocznosc)}>
            <option value="prywatne">Prywatne – tylko Ty i kolaboranci</option>
            <option value="publiczne">Publiczne – każdy z linkiem</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-tekst-2" htmlFor={`${id}-p`}>
            Osoby żyjące widzą odwiedzający
          </label>
          <select id={`${id}-p`} className="pole mt-1 w-full" value={polityka} onChange={(e) => setPolityka(e.target.value as PolitykaDat)}>
            {POLITYKI_DAT.map((p) => (
              <option key={p} value={p}>
                {NAZWY_POLITYK[p]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-tekst-2">Te ustawienia możesz później zmienić. Ty i kolaboranci zawsze widzicie pełne dane.</p>
      {blad && (
        <p role="alert" className="text-sm font-semibold text-blad">
          {blad}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="przycisk przycisk-glowny !min-h-10" disabled={trwa || !nazwa.trim()}>
          {trwa ? "Tworzenie…" : "Utwórz drzewo"}
        </button>
        <button type="button" className="przycisk !min-h-10" onClick={() => setOtwarte(false)}>
          Anuluj
        </button>
      </div>
    </form>
  );
}

function UsuwanieKonta({ haslo: czyHaslo, wlasne }: { haslo: boolean; wlasne: WpisDrzewa[] }) {
  const router = useRouter();
  const [otwarte, setOtwarte] = useState(false);
  const [haslo, setHaslo] = useState("");
  const [blad, setBlad] = useState("");
  const [trwa, setTrwa] = useState(false);
  return (
    <section className="szklo border-blad p-5" aria-label="Usuwanie konta">
      <h2 className="text-xl text-blad">Usuń konto</h2>
      <p className="mt-1 text-sm">Usunięte zostaną Twoje konto, profil i wszystkie Twoje drzewa wraz z osobami. Drzewa innych osób, w których jesteś kolaborantem, pozostaną bez zmian. Tej operacji nie można cofnąć.</p>
      {wlasne.length > 0 ? (
        <div className="mt-3 rounded-xl border border-kreska bg-najazd p-3 text-sm" role="note">
          <p className="font-semibold">Chcesz zachować swoje drzewa? Przekaż je innemu użytkownikowi.</p>
          <p className="mt-1">W ustawieniach drzewa dodaj tę osobę jako kolaboranta, a potem wybierz „Przekaż własność”. Po przekazaniu drzewo zostanie, a Ty możesz usunąć konto bez jego utraty. Drzewa, które usuniesz razem z kontem:</p>
          <ul className="mt-1 list-disc pl-5">
            {wlasne.map((d) => (
              <li key={d.id}>
                {d.meta.nazwa} (
                <Link href={sciezkaUstawienDrzewa(slugDb(d.id))} className="link">
                  przekaż własność
                </Link>
                )
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-sm text-tekst-2">Nie masz własnych drzew, więc nic poza kontem nie zostanie usunięte.</p>
      )}
      {!otwarte ? (
        <button type="button" className="przycisk mt-3" onClick={() => setOtwarte(true)}>
          Usuń moje konto…
        </button>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!window.confirm(wlasne.length ? `Na pewno usunąć konto i swoje drzewa (${wlasne.length})? Tej operacji nie można cofnąć.\n\nJeśli chcesz zachować drzewa, najpierw przekaż je innemu użytkownikowi.` : "Na pewno usunąć konto? Tej operacji nie można cofnąć.")) return;
            setBlad("");
            setTrwa(true);
            try {
              await usunWlasneKonto(haslo);
              router.replace("/");
              // Powiadomienie o wylogowaniu może dotrzeć już po tym wywołaniu – flagę zdejmujemy dopiero po chwili.
              setTimeout(zakonczUsuwanieKonta, 5000);
            } catch (err) {
              setBlad(komunikatBledu(err));
              setTrwa(false);
            }
          }}
        >
          {czyHaslo ? (
            <>
              <label className="block text-sm" htmlFor="haslo-usuniecie">
                Potwierdź hasłem
              </label>
              <input id="haslo-usuniecie" type="password" autoComplete="current-password" className="pole w-full" value={haslo} onChange={(e) => setHaslo(e.target.value)} required />
            </>
          ) : (
            <p className="text-sm">Zostaniesz poproszony(-a) o ponowne zalogowanie przez Google.</p>
          )}
          {blad && (
            <p role="alert" className="text-sm font-semibold text-blad">
              {blad}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="przycisk" disabled={trwa}>
              {trwa ? "Usuwanie…" : "Usuń konto na stałe"}
            </button>
            <button type="button" className="przycisk" onClick={() => setOtwarte(false)}>
              Anuluj
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/** Profil zalogowanego użytkownika: dane, drzewa własne i współdzielone, tworzenie drzewa, usunięcie konta. */
export function PanelProfilu() {
  const konto = useKonto();
  const router = useRouter();
  const [drzewa, setDrzewa] = useState<{ wlasne: WpisDrzewa[]; wspolne: WpisDrzewa[] } | null>(null);
  const [prosbyIle, setProsbyIle] = useState<Record<string, number>>({});
  const [bladListy, setBladListy] = useState("");
  const [imie, setImie] = useState("");
  const [nazwisko, setNazwisko] = useState("");
  const [komunikat, setKomunikat] = useState("");
  const [wyslano, setWyslano] = useState("");

  useEffect(() => {
    if (konto.status === "gosc" && !czyKontoUsuwane()) router.replace("/logowanie/");
  }, [konto.status, router]);
  useEffect(() => {
    if (konto.profil) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- inicjalizacja pól po wczytaniu profilu
      setImie(konto.profil.imie);
      setNazwisko(konto.profil.nazwisko);
    }
  }, [konto.profil]);

  const uid = konto.uid;
  const wczytaj = useCallback(async () => {
    if (!uid) return;
    try {
      const lista = await listaMoich(uid);
      setDrzewa(lista);
      // Liczba oczekujących próśb o dołączenie do moich drzew.
      const ile = await Promise.all(lista.wlasne.map(async (d) => [d.id, (await listaProsbDrzewa(d.id).catch(() => [])).length] as const));
      setProsbyIle(Object.fromEntries(ile));
    } catch (e) {
      setBladListy(komunikatBledu(e));
    }
  }, [uid]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- wczytanie listy drzew po zalogowaniu
    if (konto.status === "zalogowany" && konto.zweryfikowany && !konto.zablokowany) void wczytaj();
  }, [konto.status, konto.zweryfikowany, konto.zablokowany, wczytaj]);

  if (konto.status === "wylaczone") return <p className="szklo p-6 text-tekst-2">Konta użytkowników nie są jeszcze włączone w tym serwisie.</p>;
  if (konto.status !== "zalogowany") return <p className="py-16 text-center text-tekst-2" role="status">Wczytywanie…</p>;
  if (konto.zablokowany) {
    return (
      <div className="szklo p-6">
        <h1 className="text-3xl">Konto usunięte</h1>
        <p className="mt-2 text-tekst-2">To konto zostało usunięte przez administratora serwisu. Jeśli uważasz, że to pomyłka, skontaktuj się z administratorem.</p>
        <button type="button" className="przycisk mt-4" onClick={() => void wyloguj()}>
          Wyloguj
        </button>
      </div>
    );
  }
  const czyHaslo = konto.sposoby?.haslo ?? true;
  const nazwa = konto.profil ? `${konto.profil.imie} ${konto.profil.nazwisko}` : (konto.email ?? "");

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-4xl">Twój profil</h1>
        <p className="mt-1 text-tekst-2">{konto.email}{konto.czyAdmin ? " · administrator serwisu" : ""}</p>
      </header>

      {!konto.zweryfikowany && (
        <section className="szklo border-akcent p-5" role="status" aria-label="Potwierdzenie adresu e-mail">
          <h2 className="text-xl">Potwierdź adres e-mail</h2>
          <p className="mt-1 text-sm">Wysłaliśmy link na adres {konto.email}. Dopóki go nie potwierdzisz, nie możesz tworzyć drzew ani być zapraszany jako kolaborant. Po kliknięciu linku ta strona odświeży się sama.</p>
          <p className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="przycisk przycisk-glowny" onClick={async () => { setWyslano(""); await konto.odswiez(); }}>
              Kliknąłem w link – odśwież
            </button>
            <button
              type="button"
              className="przycisk"
              onClick={async () => {
                try {
                  await wyslijWeryfikacje();
                  setWyslano("Wysłaliśmy link ponownie.");
                } catch (e) {
                  setWyslano(komunikatBledu(e));
                }
              }}
            >
              Wyślij link ponownie
            </button>
          </p>
          {wyslano && <p className="mt-2 text-sm font-semibold" role="status">{wyslano}</p>}
        </section>
      )}

      <form
        className="szklo space-y-3 p-5"
        aria-label="Dane profilu"
        onSubmit={async (e) => {
          e.preventDefault();
          setKomunikat("");
          if (imie.trim().length < 2 || nazwisko.trim().length < 2) return setKomunikat("Podaj imię i nazwisko.");
          try {
            await zapiszProfil(konto.uid!, imie, nazwisko);
            await konto.odswiez();
            setKomunikat("Zapisano.");
          } catch (err) {
            setKomunikat(komunikatBledu(err));
          }
        }}
      >
        <h2 className="text-xl">Dane</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-tekst-2" htmlFor="profil-imie">Imię</label>
            <input id="profil-imie" className="pole mt-1 w-full" value={imie} onChange={(e) => setImie(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-tekst-2" htmlFor="profil-nazwisko">Nazwisko</label>
            <input id="profil-nazwisko" className="pole mt-1 w-full" value={nazwisko} onChange={(e) => setNazwisko(e.target.value)} required />
          </div>
        </div>
        <p className="text-sm text-tekst-2">Adres e-mail: {konto.email} (nie można go zmienić)</p>
        <div className="flex items-center gap-3">
          <button type="submit" className="przycisk przycisk-glowny">Zapisz dane</button>
          {komunikat && <span className="text-sm font-semibold" role="status">{komunikat}</span>}
        </div>
      </form>

      <AdresEmail />

      <section aria-label="Moje drzewa" className="grid gap-3">
        <h2 className="text-2xl">Moje drzewa</h2>
        {bladListy && <p role="alert" className="text-sm font-semibold text-blad">{bladListy}</p>}
        {drzewa && drzewa.wlasne.length === 0 && <p className="text-tekst-2">Nie masz jeszcze żadnego drzewa.</p>}
        {drzewa && drzewa.wlasne.length > 0 && (
          <ul className="grid gap-3">
            {drzewa.wlasne.map((d) => (
              <KartaMojegoDrzewa key={d.id} wpis={d} rola="wlasciciel" prosby={prosbyIle[d.id] ?? 0} />
            ))}
          </ul>
        )}
        <div>
          <NoweDrzewo uid={konto.uid!} nazwaWlasciciela={nazwa} mozeTworzyc={konto.zweryfikowany} />
        </div>
      </section>

      <DolaczDoDrzewa nazwaUzytkownika={nazwa} />

      {drzewa && drzewa.wspolne.length > 0 && (
        <section aria-label="Drzewa, w których współpracuję" className="grid gap-3">
          <h2 className="text-2xl">Współpracuję przy</h2>
          <ul className="grid gap-3">
            {drzewa.wspolne.map((d) => (
              <KartaMojegoDrzewa
                key={d.id}
                wpis={d}
                rola="kolaborant"
                naOpusc={async () => {
                  if (!window.confirm(`Opuścić drzewo „${d.meta.nazwa}”? Stracisz możliwość jego edycji.`)) return;
                  try {
                    await opuscDrzewo(d.id, konto.uid!);
                    await wczytaj();
                  } catch (e) {
                    setBladListy(komunikatBledu(e));
                  }
                }}
              />
            ))}
          </ul>
        </section>
      )}

      {konto.czyAdmin && (
        <p className="text-sm">
          <Link href="/admin/" className="link">Przejdź do panelu administratora</Link>
        </p>
      )}

      <UsuwanieKonta haslo={czyHaslo} wlasne={drzewa?.wlasne ?? []} />
    </div>
  );
}
