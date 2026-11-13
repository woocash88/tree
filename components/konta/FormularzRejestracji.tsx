"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { komunikatBledu, zarejestruj } from "@/lib/baza/konta";
import { sciezkaPolitykiPrywatnosci } from "@/lib/sciezki";
import { useKonto } from "./AuthProvider";
import { celPoLogowaniu, PARAM_PO, useChceStworzycDrzewo, WARTOSC_PO_NOWE } from "./cel";
import { PrzyciskGoogle } from "./PrzyciskGoogle";

export function FormularzRejestracji() {
  const id = useId();
  const router = useRouter();
  const konto = useKonto();
  const chceStworzyc = useChceStworzycDrzewo();
  const [imie, setImie] = useState("");
  const [nazwisko, setNazwisko] = useState("");
  const [email, setEmail] = useState("");
  const [haslo, setHaslo] = useState("");
  const [haslo2, setHaslo2] = useState("");
  const [zgoda, setZgoda] = useState(false);
  const [blad, setBlad] = useState("");
  const [trwa, setTrwa] = useState(false);
  const [wyslano, setWyslano] = useState(false);

  useEffect(() => {
    if (konto.status === "zalogowany" && !trwa && !wyslano) router.replace(celPoLogowaniu());
  }, [konto.status, trwa, wyslano, router]);

  if (konto.status === "wylaczone") return <p className="szklo p-6 text-tekst-2">Konta użytkowników nie są jeszcze włączone w tym serwisie.</p>;

  if (wyslano) {
    return (
      <div className="szklo p-6" role="status">
        <h1 className="text-3xl">Sprawdź skrzynkę</h1>
        <p className="mt-3">
          Konto zostało założone. Wysłaliśmy wiadomość z linkiem potwierdzającym na adres <strong>{email}</strong>. Kliknij ten link, aby móc tworzyć drzewa i zapraszać współpracowników.
        </p>
        <p className="mt-3 text-sm text-tekst-2">Nie widzisz wiadomości? Zajrzyj do folderu ze spamem. Ponowne wysłanie linku znajdziesz w swoim profilu.</p>
        <Link href={celPoLogowaniu()} className="przycisk przycisk-glowny mt-5 !min-h-11 w-full">
          Przejdź do profilu
        </Link>
      </div>
    );
  }

  const zaloz = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlad("");
    if (imie.trim().length < 2 || nazwisko.trim().length < 2) return setBlad("Podaj imię i nazwisko.");
    if (haslo.length < 8) return setBlad("Hasło musi mieć co najmniej 8 znaków.");
    if (haslo !== haslo2) return setBlad("Hasła nie są takie same.");
    if (!zgoda) return setBlad("Aby założyć konto, zapoznaj się z polityką prywatności i zaznacz zgodę.");
    setTrwa(true);
    try {
      await zarejestruj({ imie, nazwisko, email, haslo });
      await konto.odswiez();
      setWyslano(true);
    } catch (err) {
      setBlad(komunikatBledu(err));
    }
    setTrwa(false);
  };

  const pole = "pole w-full";
  return (
    <div className="szklo p-6">
      <h1 className="text-3xl">Załóż konto</h1>
      {chceStworzyc && (
        <p role="note" className="mt-3 rounded-xl border border-kreska bg-najazd px-3 py-2 text-sm">
          Aby stworzyć drzewo, najpierw załóż konto (albo zaloguj się, jeśli już je masz). Zaraz po tym przejdziesz do formularza nowego drzewa.
        </p>
      )}
      <p className="mt-2 text-sm text-tekst-2">Konto pozwala tworzyć własne drzewa genealogiczne i zapraszać do nich współpracowników.</p>
      <div className="mt-5">
        <PrzyciskGoogle etykieta="Zarejestruj się przez Google" naSukces={() => router.replace(celPoLogowaniu())} naBlad={setBlad} />
      </div>
      <p className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-tekst-2">
        <span className="h-px flex-1 bg-kreska" />
        albo e-mailem
        <span className="h-px flex-1 bg-kreska" />
      </p>
      <form onSubmit={zaloz} className="space-y-3" aria-label="Rejestracja e-mailem">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-tekst-2" htmlFor={`${id}-i`}>
              Imię
            </label>
            <input id={`${id}-i`} autoComplete="given-name" required className={`${pole} mt-1`} value={imie} onChange={(e) => setImie(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-tekst-2" htmlFor={`${id}-n`}>
              Nazwisko
            </label>
            <input id={`${id}-n`} autoComplete="family-name" required className={`${pole} mt-1`} value={nazwisko} onChange={(e) => setNazwisko(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-tekst-2" htmlFor={`${id}-e`}>
            Adres e-mail
          </label>
          <input id={`${id}-e`} type="email" autoComplete="email" required className={`${pole} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-tekst-2" htmlFor={`${id}-h`}>
            Hasło (min. 8 znaków)
          </label>
          <input id={`${id}-h`} type="password" autoComplete="new-password" required minLength={8} className={`${pole} mt-1`} value={haslo} onChange={(e) => setHaslo(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-tekst-2" htmlFor={`${id}-h2`}>
            Powtórz hasło
          </label>
          <input id={`${id}-h2`} type="password" autoComplete="new-password" required className={`${pole} mt-1`} value={haslo2} onChange={(e) => setHaslo2(e.target.value)} />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 size-4" checked={zgoda} onChange={(e) => setZgoda(e.target.checked)} />
          <span>
            Zapoznałem(-am) się z{" "}
            <Link href={sciezkaPolitykiPrywatnosci()} className="link" target="_blank">
              polityką prywatności
            </Link>
            .
          </span>
        </label>
        {blad && (
          <p role="alert" className="text-sm font-semibold text-blad">
            {blad}
          </p>
        )}
        <button type="submit" className="przycisk przycisk-glowny !min-h-11 w-full" disabled={trwa}>
          {trwa ? "Zakładanie konta…" : "Załóż konto"}
        </button>
      </form>
      <p className="mt-5 border-t border-kreska pt-4 text-center text-sm text-tekst-2">
        Masz już konto?{" "}
        <Link href={chceStworzyc ? `/logowanie/?${PARAM_PO}=${WARTOSC_PO_NOWE}` : "/logowanie/"} className="link">
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}
