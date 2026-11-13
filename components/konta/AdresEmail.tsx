"use client";

import { useId, useState } from "react";
import { dodajLogowanieHaslem, komunikatBledu, polaczZGoogle, zmienEmail } from "@/lib/baza/konta";
import { useKonto } from "./AuthProvider";

type Komunikat = { typ: "ok" | "blad"; tekst: string } | null;

/** Adres e-mail i sposoby logowania: zmiana adresu (konto z hasłem), dodanie hasła lub Google do istniejącego konta. */
export function AdresEmail() {
  const id = useId();
  const konto = useKonto();
  const [nowy, setNowy] = useState("");
  const [haslo, setHaslo] = useState("");
  const [noweHaslo, setNoweHaslo] = useState("");
  const [komunikat, setKomunikat] = useState<Komunikat>(null);
  const [trwa, setTrwa] = useState(false);
  const s = konto.sposoby;
  if (!s) return null;

  const wykonaj = async (dzialanie: () => Promise<string>) => {
    setTrwa(true);
    setKomunikat(null);
    try {
      setKomunikat({ typ: "ok", tekst: await dzialanie() });
    } catch (e) {
      setKomunikat({ typ: "blad", tekst: komunikatBledu(e) });
    }
    setTrwa(false);
  };

  const sposoby = [s.haslo && "hasłem", s.google && "kontem Google"].filter(Boolean).join(" i ") || "—";
  const OPIS = "text-sm text-tekst-2";
  const NAGLOWEK = "text-base font-semibold";

  return (
    <section className="szklo space-y-5 p-5" aria-label="Adres e-mail i logowanie">
      <div>
        <h2 className="text-xl">Adres e-mail i logowanie</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-tekst-2">Adres e-mail</dt>
          <dd className="break-all">
            <strong>{konto.email}</strong>{" "}
            {konto.zweryfikowany ? <span className="text-tekst-2">(potwierdzony)</span> : <span className="font-semibold text-blad">(niepotwierdzony)</span>}
          </dd>
          <dt className="text-tekst-2">Logowanie</dt>
          <dd>{sposoby}</dd>
        </dl>
        <p className={`${OPIS} mt-2`}>Logowanie przez Google tym samym adresem e-mail prowadzi do tego samego konta i tych samych drzew.</p>
      </div>

      {s.haslo ? (
        <form
          className="space-y-2"
          aria-label="Zmiana adresu e-mail"
          onSubmit={(e) => {
            e.preventDefault();
            void wykonaj(async () => {
              await zmienEmail(nowy, haslo);
              setNowy("");
              setHaslo("");
              return `Wysłaliśmy link potwierdzający na adres ${nowy.trim()}. Po kliknięciu w link adres się zmieni, a Ty zalogujesz się już nowym adresem. Do tego czasu logujesz się starym.`;
            });
          }}
        >
          <h3 className={NAGLOWEK}>Zmień adres e-mail</h3>
          <p className={OPIS}>Wyślemy link potwierdzający na nowy adres. Dla bezpieczeństwa podaj obecne hasło.{s.google && " Logowanie przez Google zostaje przy tym samym koncie także po zmianie adresu."}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-tekst-2" htmlFor={`${id}-n`}>
                Nowy adres e-mail
              </label>
              <input id={`${id}-n`} type="email" className="pole mt-1 w-full" value={nowy} onChange={(e) => setNowy(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm text-tekst-2" htmlFor={`${id}-h`}>
                Obecne hasło (dla bezpieczeństwa)
              </label>
              <input id={`${id}-h`} type="password" className="pole mt-1 w-full" value={haslo} onChange={(e) => setHaslo(e.target.value)} required autoComplete="current-password" />
            </div>
          </div>
          <button type="submit" className="przycisk !min-h-10" disabled={trwa || !nowy.trim() || !haslo}>
            Wyślij link na nowy adres
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="space-y-1">
            <h3 className={NAGLOWEK}>Zmiana adresu e-mail</h3>
            <p className={OPIS}>Adres tego konta pochodzi z Twojego konta Google i nie można go tu zmienić. Aby używać innego adresu, załóż nowe konto z tym adresem i przekaż mu własność swoich drzew (w ustawieniach drzewa, po dodaniu nowego konta jako kolaboranta).</p>
          </div>
          <form
            className="space-y-2"
            aria-label="Dodaj logowanie hasłem"
            onSubmit={(e) => {
              e.preventDefault();
              void wykonaj(async () => {
                await dodajLogowanieHaslem(noweHaslo);
                setNoweHaslo("");
                await konto.odswiez();
                return "Dodano logowanie hasłem. Możesz teraz logować się adresem e-mail i tym hasłem albo przez Google.";
              });
            }}
          >
            <h3 className={NAGLOWEK}>Dodaj logowanie hasłem</h3>
            <p className={OPIS}>Dzięki temu zalogujesz się adresem e-mail i hasłem albo przez Google.</p>
            <label className="block text-sm text-tekst-2" htmlFor={`${id}-p`}>
              Nowe hasło (min. 8 znaków)
            </label>
            <input id={`${id}-p`} type="password" className="pole w-full max-w-sm" value={noweHaslo} onChange={(e) => setNoweHaslo(e.target.value)} required minLength={8} autoComplete="new-password" />
            <div>
              <button type="submit" className="przycisk !min-h-10" disabled={trwa || noweHaslo.length < 8}>
                Dodaj logowanie hasłem
              </button>
            </div>
          </form>
        </div>
      )}

      {!s.google && (
        <div className="space-y-2">
          <h3 className={NAGLOWEK}>Logowanie przez Google</h3>
          <p className={OPIS}>Połączenie się powiedzie, jeśli konto Google ma ten sam adres e-mail co Twoje konto w serwisie.</p>
          <button
            type="button"
            className="przycisk !min-h-10"
            disabled={trwa}
            onClick={() =>
              void wykonaj(async () => {
                await polaczZGoogle();
                await konto.odswiez();
                return "Połączono z kontem Google.";
              })
            }
          >
            Połącz z kontem Google
          </button>
        </div>
      )}

      {komunikat && (
        <p role={komunikat.typ === "blad" ? "alert" : "status"} className={`text-sm font-semibold ${komunikat.typ === "blad" ? "text-blad" : ""}`}>
          {komunikat.tekst}
        </p>
      )}
    </section>
  );
}
