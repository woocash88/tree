import type { Metadata } from "next";
import Link from "next/link";
import { Naglowek } from "@/components/Naglowek";
import { Stopka } from "@/components/Stopka";
import serwis from "@/data/serwis.json";
import { sciezkaIndeksuDrzew } from "@/lib/sciezki";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description: "Jakie dane przetwarza serwis Nasi przodkowie, co zapisuje w przeglądarce i jak zgłosić poprawkę lub usunięcie danych.",
};

/** Data ostatniej zmiany treści tej strony – zmień ją razem z treścią. */
const OBOWIAZUJE_OD = "12 listopada 2026";

function Sekcja({ tytul, children }: { tytul: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl">{tytul}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-tekst">{children}</div>
    </section>
  );
}

export default function PolitykaPrywatnosci() {
  const { administrator, hosting } = serwis;
  const kontakt = administrator.email ? (
    <a className="link" href={`mailto:${administrator.email}`}>
      {administrator.email}
    </a>
  ) : null;

  return (
    <>
      <Naglowek />
      <main id="tresc" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-8 pt-8">
        <article className="szklo p-6 sm:p-8">
          <h1 className="text-4xl">Polityka prywatności</h1>
          <p className="mt-2 text-sm text-tekst-2">Obowiązuje od: {OBOWIAZUJE_OD}</p>

          <Sekcja tytul="W skrócie">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Serwis nie używa ciasteczek, narzędzi analitycznych ani skryptów śledzących.</li>
              <li>Nie ma kont użytkowników, formularzy kontaktowych ani newslettera – niczego o Tobie nie zbieramy.</li>
              <li>Strona nie pobiera niczego z zewnętrznych serwerów: fonty i skrypty są serwowane z tej samej domeny.</li>
              <li>Drzewa zawierają dane genealogiczne. Dane osób żyjących są domyślnie ograniczone do imienia i nazwiska.</li>
            </ul>
          </Sekcja>

          <Sekcja tytul="Administrator">
            {administrator.nazwa || kontakt ? (
              <p>
                Administratorem serwisu jest {administrator.nazwa || "osoba prowadząca serwis"}
                {kontakt && <>. Kontakt: {kontakt}</>}.
              </p>
            ) : (
              <p>Serwis jest prowadzony prywatnie, w celach niekomercyjnych. Dane kontaktowe administratora zostaną podane w tym miejscu.</p>
            )}
          </Sekcja>

          <Sekcja tytul="Dane odwiedzających">
            <p>
              Samo przeglądanie serwisu nie wymaga podawania żadnych danych. Serwis składa się wyłącznie z plików statycznych – nie ma własnego serwera aplikacji ani bazy danych, w której mogłyby być zapisywane informacje o odwiedzających.
            </p>
            <p>
              Dostawca hostingu{hosting ? ` (${hosting})` : ""}, jak każdy serwer WWW, może zapisywać w dziennikach technicznych adres IP, czas żądania i rodzaj przeglądarki. Dzieje się to na zasadach tego dostawcy i służy zapewnieniu działania oraz bezpieczeństwa usługi; administrator serwisu nie łączy tych danych z konkretnymi osobami.
            </p>
          </Sekcja>

          <Sekcja tytul="Pamięć przeglądarki">
            <p>Serwis nie zapisuje ciasteczek. W pamięci lokalnej przeglądarki (localStorage) mogą zostać zapisane wyłącznie:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>wybrany motyw</strong> (jasny lub ciemny) – po kliknięciu przełącznika w nagłówku,
              </li>
              <li>
                <strong>robocze zmiany administratora</strong> – tylko w przeglądarce osoby, która zalogowała się do panelu administracyjnego.
              </li>
            </ul>
            <p>Te informacje nie opuszczają Twojego urządzenia i nie są nigdzie wysyłane. Możesz je usunąć, czyszcząc dane strony w ustawieniach przeglądarki.</p>
          </Sekcja>

          <Sekcja tytul="Dane w drzewach genealogicznych">
            <p>
              Drzewa zawierają imiona, nazwiska, daty i miejsca urodzenia oraz śmierci, a także powiązania rodzinne. Źródło danych i opiekun każdego drzewa są podane na jego stronie i w stopce. Dane są publikowane w celu dokumentowania i udostępniania historii rodzin.
            </p>
            <p>
              Większość wpisów dotyczy osób zmarłych. Przy osobach oznaczonych jako żyjące serwis domyślnie pokazuje tylko imię i nazwisko – daty, miejsca i notatki nie są publikowane. Opiekun drzewa może zdecydować o pokazaniu roku urodzenia lub pełnych danych; informacja o tym jest w stopce drzewa.
            </p>
            <p>W zakresie, w jakim wpisy dotyczą osób żyjących, podstawą przetwarzania jest prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO) polegający na dokumentowaniu historii rodziny.</p>
          </Sekcja>

          <Sekcja tytul="Twoje prawa i zgłoszenia">
            <p>
              Jeśli w drzewie znajdują się dane Twoje lub Twoich bliskich, możesz poprosić o ich poprawienie, ograniczenie albo usunięcie, a także wnieść sprzeciw wobec ich publikacji.{" "}
              {kontakt ? <>Napisz na adres {kontakt}</> : "Skontaktuj się z administratorem serwisu albo z opiekunem danego drzewa"} i wskaż drzewo oraz osobę, której dotyczy zgłoszenie. Zgłoszenia dotyczące osób żyjących są rozpatrywane w pierwszej kolejności.
            </p>
            <p>
              Przysługuje Ci również prawo dostępu do danych oraz prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (
              <a className="link" href="https://uodo.gov.pl/" rel="noreferrer">
                uodo.gov.pl
              </a>
              ).
            </p>
          </Sekcja>

          <Sekcja tytul="Zmiany polityki">
            <p>Zmiany tej polityki są publikowane na tej stronie wraz z nową datą obowiązywania.</p>
          </Sekcja>

          <p className="mt-8 border-t border-kreska pt-4">
            <Link href={sciezkaIndeksuDrzew()} className="link">
              ← Wróć do drzew
            </Link>
          </p>
        </article>
      </main>
      <Stopka />
    </>
  );
}
