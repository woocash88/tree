"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { TEMATY_WIADOMOSCI, type TematWiadomosci } from "@/lib/baza/api";
import { komunikatBledu } from "@/lib/baza/konta";
import { KLUCZ_KONTAKTU, KONTAKT_WLACZONY, MAKS_TRESC_WIADOMOSCI, wyslijWiadomosc } from "@/lib/baza/kontakt";
import { sciezkaPolitykiPrywatnosci } from "@/lib/sciezki";
import { useKonto } from "./konta/AuthProvider";

const PRZERWA_MS = 30_000;
const KLUCZ_CZASU = "kontakt-ostatnio";

/** Formularz kontaktowy: imię, e-mail (do odpowiedzi), temat, wiadomość i zgoda. Zalogowanym podpowiada imię i adres z profilu. */
export function FormularzKontaktowy() {
  const id = useId();
  const konto = useKonto();
  const [imie, setImie] = useState("");
  const [email, setEmail] = useState("");
  const [temat, setTemat] = useState<TematWiadomosci>("pytanie");
  const [tresc, setTresc] = useState("");
  const [zgoda, setZgoda] = useState(false);
  const [pulapka, setPulapka] = useState("");
  const [blad, setBlad] = useState("");
  const [trwa, setTrwa] = useState(false);
  const [wyslano, setWyslano] = useState(false);

  // Zalogowanym podpowiadamy dane z profilu (tylko do pustych pól).
  useEffect(() => {
    if (konto.status !== "zalogowany" || !konto.profil) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- jednorazowe uzupełnienie pól po wczytaniu profilu
    setImie((v) => v || `${konto.profil!.imie} ${konto.profil!.nazwisko}`.trim());
    setEmail((v) => v || konto.email || "");
  }, [konto.status, konto.profil, konto.email]);

  if (!KONTAKT_WLACZONY) {
    return <p className="szklo p-6 text-tekst-2">Formularz kontaktowy nie jest jeszcze włączony w tym serwisie.</p>;
  }

  if (wyslano) {
    return (
      <div className="szklo p-6" role="status">
        <h2 className="text-2xl">Dziękujemy, wiadomość wysłana</h2>
        <p className="mt-2 text-tekst-2">Odpowiemy na adres <strong className="text-tekst">{email}</strong>, gdy tylko będzie to możliwe.</p>
        <button
          type="button"
          className="przycisk mt-4"
          onClick={() => {
            setWyslano(false);
            setTresc("");
            setZgoda(false);
          }}
        >
          Napisz kolejną wiadomość
        </button>
      </div>
    );
  }

  const wyslij = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlad("");
    if (!zgoda) return setBlad("Zaznacz zgodę na przetwarzanie danych, żebyśmy mogli odpowiedzieć.");
    // Pole-pułapka dla botów: człowiek go nie widzi. Udajemy sukces, nic nie wysyłając.
    if (pulapka) return setWyslano(true);
    let ostatnio = 0;
    try {
      ostatnio = Number(sessionStorage.getItem(KLUCZ_CZASU)) || 0;
    } catch {
      /* brak sessionStorage – bez ograniczenia częstotliwości */
    }
    if (Date.now() - ostatnio < PRZERWA_MS) return setBlad("Przed chwilą wysłano już wiadomość z tej przeglądarki. Odczekaj kilkadziesiąt sekund i spróbuj ponownie.");
    setTrwa(true);
    try {
      await wyslijWiadomosc({ imie, email, temat, tresc, uid: konto.uid });
      try {
        sessionStorage.setItem(KLUCZ_CZASU, String(Date.now()));
      } catch {
        /* jak wyżej */
      }
      setWyslano(true);
    } catch (err) {
      setBlad(komunikatBledu(err));
    }
    setTrwa(false);
  };

  return (
    <form onSubmit={wyslij} className="szklo space-y-4 p-6" aria-label="Formularz kontaktowy">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-tekst-2" htmlFor={`${id}-i`}>
            Imię lub nazwa
          </label>
          <input id={`${id}-i`} className="pole mt-1 w-full" value={imie} onChange={(e) => setImie(e.target.value)} maxLength={100} autoComplete="name" required />
        </div>
        <div>
          <label className="block text-sm text-tekst-2" htmlFor={`${id}-e`}>
            Twój adres e-mail (na niego odpowiemy)
          </label>
          <input id={`${id}-e`} type="email" className="pole mt-1 w-full" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} autoComplete="email" required />
        </div>
      </div>
      <div>
        <label className="block text-sm text-tekst-2" htmlFor={`${id}-t`}>
          Temat
        </label>
        <select id={`${id}-t`} className="pole mt-1 block w-full sm:w-80" value={temat} onChange={(e) => setTemat(e.target.value as TematWiadomosci)}>
          {TEMATY_WIADOMOSCI.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nazwa}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-tekst-2" htmlFor={`${id}-w`}>
          Wiadomość
        </label>
        <textarea id={`${id}-w`} className="pole mt-1 w-full !py-3" rows={7} value={tresc} onChange={(e) => setTresc(e.target.value)} maxLength={MAKS_TRESC_WIADOMOSCI} required />
        <p className="mt-1 text-right text-xs text-tekst-3">
          {tresc.length} / {MAKS_TRESC_WIADOMOSCI}
        </p>
      </div>
      {/* Pułapka na boty: ukryte pole, które prawdziwy użytkownik zostawia puste. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Nie wypełniaj tego pola
          <input tabIndex={-1} autoComplete="off" value={pulapka} onChange={(e) => setPulapka(e.target.value)} name="strona-www" />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 size-4" checked={zgoda} onChange={(e) => setZgoda(e.target.checked)} />
        <span>
          Zgadzam się na wykorzystanie podanego imienia, adresu e-mail i treści wiadomości wyłącznie do odpowiedzi.{" "}
          <Link href={sciezkaPolitykiPrywatnosci()} className="link" target="_blank">
            Polityka prywatności
          </Link>
          {KLUCZ_KONTAKTU && <span className="block text-xs text-tekst-3">Wiadomość trafia do administratora e-mailem przez usługę Web3Forms.</span>}
        </span>
      </label>
      {blad && (
        <p role="alert" className="text-sm font-semibold text-blad">
          {blad}
        </p>
      )}
      <button type="submit" className="przycisk przycisk-glowny !min-h-11 !px-6" disabled={trwa}>
        {trwa ? "Wysyłanie…" : "Wyślij wiadomość"}
      </button>
    </form>
  );
}
