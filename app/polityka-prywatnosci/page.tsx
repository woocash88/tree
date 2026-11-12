import type { Metadata } from "next";
import Link from "next/link";
import { Naglowek } from "@/components/Naglowek";
import { Stopka } from "@/components/Stopka";
import serwis from "@/data/serwis.json";
import { sciezkaIndeksuDrzew } from "@/lib/sciezki";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description: "Jakie dane przetwarza serwis Przodkowie (konta, drzewa, osoby żyjące), co zapisuje w przeglądarce i jak usunąć konto albo zgłosić poprawkę danych.",
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
  const { administrator } = serwis;
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
              <li>Przeglądanie publicznych drzew nie wymaga konta. Serwis nie używa ciasteczek reklamowych, narzędzi analitycznych ani skryptów śledzących.</li>
              <li>Konto jest potrzebne tylko do tworzenia własnych drzew. Przy rejestracji podajesz imię, nazwisko i adres e-mail.</li>
              <li>Sam decydujesz, czy Twoje drzewo jest publiczne czy prywatne i co odwiedzający widzą o osobach żyjących.</li>
              <li>Konto i wszystkie swoje drzewa możesz w każdej chwili usunąć w profilu.</li>
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
            <p>Administrator serwisu ma dostęp do wszystkich kont i drzew, w tym prywatnych, i może je edytować lub usuwać (np. w razie naruszenia regulaminu albo na prośbę zainteresowanej osoby).</p>
          </Sekcja>

          <Sekcja tytul="Konta użytkowników">
            <p>
              Podczas rejestracji zbieramy imię, nazwisko i adres e-mail (także przy logowaniu przez Google – wtedy z konta Google pobieramy imię i nazwisko oraz adres e-mail). Dane te służą do prowadzenia konta, logowania, potwierdzenia adresu e-mail i wskazywania Ciebie jako właściciela albo współpracownika drzewa. Nie wysyłamy wiadomości marketingowych.
            </p>
            <p>
              Imię i nazwisko właściciela jest widoczne przy jego publicznych drzewach, a imiona i nazwiska współpracowników – osobom, które mogą zobaczyć dane drzewo. Adres e-mail nie jest nigdzie publikowany; służy jedynie do zaproszenia Cię do współpracy (inny użytkownik wpisuje Twój adres, żeby dodać Cię do swojego drzewa).
            </p>
            <p>
              Konta, drzewa i dane logowania są przechowywane w usługach Google Firebase (Authentication i Cloud Firestore), a strona jest udostępniana przez Firebase Hosting. Google LLC działa jako podmiot przetwarzający dane na zlecenie administratora; dostawca, jak każdy serwer WWW, może zapisywać w dziennikach technicznych adres IP i czas żądania.
            </p>
          </Sekcja>

          <Sekcja tytul="Drzewa i dane osób, które w nich występują">
            <p>
              Drzewa zawierają imiona, nazwiska, daty i miejsca urodzenia oraz śmierci, a także powiązania rodzinne. Za dane wpisane do drzewa odpowiada jego właściciel. Wpisuj dane osób żyjących tylko wtedy, gdy masz do tego podstawę (np. są to Twoi bliscy i wiesz, że nie mają nic przeciwko).
            </p>
            <p>
              <strong>Drzewo prywatne</strong> widzą tylko jego właściciel, zaproszeni współpracownicy i administrator serwisu. <strong>Drzewo publiczne</strong> może przeglądać każdy, kto zna jego adres, a ponadto pojawia się w katalogu drzew. Przy osobach oznaczonych jako żyjące właściciel wybiera, czy odwiedzający widzą tylko imię i nazwisko, dodatkowo rok urodzenia, czy wszystkie dane. Dane osób żyjących, których odwiedzający nie powinni widzieć, nie są w ogóle przesyłane do ich przeglądarki – serwer przechowuje je oddzielnie, dostępne tylko dla zarządzających drzewem.
            </p>
            <p>
              Współpracownik wskazany przez właściciela może dodawać, zmieniać i usuwać osoby w drzewie, ale nie zmienia ustawień prywatności ani nie usuwa drzewa. Możesz też sam poprosić o dołączenie do cudzego drzewa: prośba zawiera tylko Twoje imię i nazwisko, widzi ją właściciel drzewa i znika po jego decyzji. Właściciel może przekazać drzewo jednemu ze swoich współpracowników – wtedy drzewo zostaje w serwisie, nawet jeśli dotychczasowy właściciel usunie konto.
            </p>
            <p>
              Właściciel drzewa może pobrać jego kopię (pliki JSON lub GEDCOM). Taki plik zawiera pełne dane, także osób żyjących, niezależnie od ustawień prywatności – za jego przechowywanie odpowiada osoba, która go pobrała.
            </p>
            <p>W zakresie, w jakim wpisy dotyczą osób żyjących, podstawą przetwarzania jest prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO) właściciela drzewa polegający na dokumentowaniu historii rodziny, a w przypadku konta – umowa o świadczenie usługi (art. 6 ust. 1 lit. b RODO).</p>
          </Sekcja>

          <Sekcja tytul="Pamięć przeglądarki">
            <p>Serwis nie zapisuje ciasteczek. W pamięci przeglądarki (localStorage, IndexedDB) zapisywane są wyłącznie:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>wybrany motyw</strong> (jasny lub ciemny),
              </li>
              <li>
                <strong>sesja logowania</strong> Firebase – tylko po zalogowaniu, aby nie trzeba było logować się przy każdej stronie,
              </li>
              <li>
                <strong>robocze zmiany administratora</strong> dotyczące drzew z repozytorium – tylko w przeglądarce administratora.
              </li>
            </ul>
            <p>Są to dane niezbędne do działania serwisu. Możesz je usunąć, wylogowując się albo czyszcząc dane strony w ustawieniach przeglądarki.</p>
          </Sekcja>

          <Sekcja tytul="Twoje prawa i zgłoszenia">
            <p>
              Dane konta możesz poprawić w profilu, a konto wraz ze wszystkimi swoimi drzewami usunąć jednym przyciskiem („Usuń moje konto”). Usunięcie jest nieodwracalne. Drzewa innych osób, w których jesteś współpracownikiem, pozostają, a Ty przestajesz być ich współpracownikiem.
            </p>
            <p>
              Jeśli w drzewie znajdują się dane Twoje lub Twoich bliskich, możesz poprosić o ich poprawienie, ograniczenie albo usunięcie, a także wnieść sprzeciw wobec ich publikacji.{" "}
              {kontakt ? <>Napisz na adres {kontakt}</> : "Skontaktuj się z administratorem serwisu"} i wskaż drzewo oraz osobę, której dotyczy zgłoszenie – albo zwróć się bezpośrednio do właściciela drzewa. Zgłoszenia dotyczące osób żyjących są rozpatrywane w pierwszej kolejności.
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
