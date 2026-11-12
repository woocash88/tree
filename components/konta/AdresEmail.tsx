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

  return (
    <section className="szklo space-y-4 p-5" aria-label="Adres e-mail i logowanie">
      <h2 className="text-xl">Adres e-mail i logowanie</h2>
      <p className="text-sm">
        Adres konta: <strong>{konto.email}</strong>{" "}
        {konto.zweryfikowany ? <span className="text-tekst-2">(potwierdzony)</span> : <span className="font-semibold text-blad">(niepotwierdzony)</span>}
        <br />
        Logowanie: {[s.haslo && "hasłem", s.google && "kontem Google"].filter(Boolean).join(" i ") || "—"}.
      </p>
      <p className="text-xs text-tekst-2">Jeśli zalogujesz się przez Google tym samym adresem, którego użyłeś(-aś) przy rejestracji, to nadal jest to jedno konto – z tymi samymi drzewami.</p>

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
              return `Wysłaliśmy link potwierdzający na adres ${nowy.trim()}. Kliknij go, a zmiana nastąpi – potem zalogujesz się ponownie nowym adresem. Do tego czasu logujesz się starym.`;
            });
          }}
        >
          <h3 className="text-sm font-semibold">Zmień adres e-mail</h3>
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
          {s.google && <p className="text-xs text-tekst-2">Logowanie przez Google zostaje powiązane z tym samym kontem, także po zmianie adresu.</p>}
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-tekst-2">Adres e-mail tego konta pochodzi z Twojego konta Google i nie można go tu zmienić. Jeśli chcesz używać innego adresu, załóż nowe konto z tym adresem i przekaż mu własność swoich drzew (w ustawieniach drzewa, po dodaniu go jako kolaboranta).</p>
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
            <h3 className="text-sm font-semibold">Dodaj logowanie hasłem</h3>
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
        <div>
          <h3 className="text-sm font-semibold">Logowanie przez Google</h3>
          <p className="mt-1 text-xs text-tekst-2">Połączenie powiedzie się tylko, jeśli konto Google ma ten sam adres e-mail co Twoje konto w serwisie.</p>
          <button
            type="button"
            className="przycisk mt-2 !min-h-10"
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
