"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { komunikatBledu, resetHasla, zalogujEmail } from "@/lib/baza/konta";
import { useKonto } from "./AuthProvider";
import { celPoLogowaniu, PARAM_PO, useChceStworzycDrzewo, WARTOSC_PO_NOWE } from "./cel";
import { PrzyciskGoogle } from "./PrzyciskGoogle";

export function FormularzLogowania() {
  const id = useId();
  const router = useRouter();
  const konto = useKonto();
  const [email, setEmail] = useState("");
  const [haslo, setHaslo] = useState("");
  const [blad, setBlad] = useState("");
  const [info, setInfo] = useState("");
  const [trwa, setTrwa] = useState(false);
  const chceStworzyc = useChceStworzycDrzewo();

  useEffect(() => {
    if (konto.status === "zalogowany") router.replace(celPoLogowaniu());
  }, [konto.status, router]);

  if (konto.status === "wylaczone") return <p className="szklo p-6 text-tekst-2">Konta użytkowników nie są jeszcze włączone w tym serwisie.</p>;

  const zaloguj = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlad("");
    setInfo("");
    setTrwa(true);
    try {
      await zalogujEmail(email, haslo);
    } catch (err) {
      setBlad(komunikatBledu(err));
    }
    setTrwa(false);
  };

  const zapomnialem = async () => {
    setBlad("");
    if (!email.trim()) return setBlad("Wpisz najpierw adres e-mail, na który wyślemy link do zmiany hasła.");
    try {
      await resetHasla(email);
      setInfo("Jeśli konto z tym adresem istnieje, wysłaliśmy na nie link do ustawienia nowego hasła.");
    } catch (err) {
      setBlad(komunikatBledu(err));
    }
  };

  return (
    <div className="szklo p-6">
      <h1 className="text-3xl">Zaloguj się</h1>
      {chceStworzyc && (
        <p role="note" className="mt-3 rounded-xl border border-kreska bg-najazd px-3 py-2 text-sm">
          Aby stworzyć drzewo, najpierw zaloguj się lub załóż konto. Zaraz po tym przejdziesz do formularza nowego drzewa.
        </p>
      )}
      <div className="mt-5">
        <PrzyciskGoogle etykieta="Zaloguj się przez Google" naSukces={() => {}} naBlad={setBlad} />
      </div>
      <p className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-tekst-2">
        <span className="h-px flex-1 bg-kreska" />
        albo e-mailem
        <span className="h-px flex-1 bg-kreska" />
      </p>
      <form onSubmit={zaloguj} className="space-y-3" aria-label="Logowanie e-mailem">
        <label className="block text-sm text-tekst-2" htmlFor={`${id}-e`}>
          Adres e-mail
        </label>
        <input id={`${id}-e`} type="email" autoComplete="email" required className="pole w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="block text-sm text-tekst-2" htmlFor={`${id}-h`}>
          Hasło
        </label>
        <input id={`${id}-h`} type="password" autoComplete="current-password" required className="pole w-full" value={haslo} onChange={(e) => setHaslo(e.target.value)} />
        {blad && (
          <p role="alert" className="text-sm font-semibold text-blad">
            {blad}
          </p>
        )}
        {info && (
          <p role="status" className="text-sm font-semibold">
            {info}
          </p>
        )}
        <button type="submit" className="przycisk przycisk-glowny !min-h-11 w-full" disabled={trwa}>
          {trwa ? "Logowanie…" : "Zaloguj się"}
        </button>
        <p className="text-center text-sm">
          <button type="button" className="link" onClick={zapomnialem}>
            Nie pamiętam hasła
          </button>
        </p>
      </form>
      <p className="mt-5 border-t border-kreska pt-4 text-center text-sm text-tekst-2">
        Nie masz konta?{" "}
        <Link href={chceStworzyc ? `/rejestracja/?${PARAM_PO}=${WARTOSC_PO_NOWE}` : "/rejestracja/"} className="link">
          Zarejestruj się
        </Link>
      </p>
    </div>
  );
}
