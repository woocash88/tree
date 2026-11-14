import type { Metadata } from "next";
import Link from "next/link";
import { Naglowek } from "@/components/Naglowek";
import { Stopka } from "@/components/Stopka";
import serwis from "@/data/serwis.json";
import { FACEBOOK_WLACZONY, KLUCZ_APP_CHECK } from "@/lib/baza/firebase";
import { KLUCZ_KONTAKTU } from "@/lib/baza/kontakt";
import { sciezkaIndeksuDrzew, sciezkaKontaktu } from "@/lib/sciezki";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description: "Jakie dane przetwarza serwis Przodkowie (konta, drzewa, osoby żyjące), co zapisuje w przeglądarce i jak usunąć konto albo zgłosić ukrycie czy usunięcie danych.",
};

/** Data ostatniej zmiany treści tej strony – zmień ją razem z treścią. */
const OBOWIAZUJE_OD = "14 listopada 2026";

function Sekcja({ tytul, id, children }: { tytul: string; id?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8" id={id}>
      <h2 className="text-2xl">{tytul}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-tekst">{children}</div>
    </section>
  );
}

export default function PolitykaPrywatnosci() {
  const { administrator } = serwis;
  const dane = [administrator.nazwa, administrator.email].filter(Boolean).join(", ");
  const link = (href: string, tekst: string) => (
    <a className="link" href={href} rel="noreferrer">
      {tekst}
    </a>
  );

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
              <li>Użytkownicy sami budują swoje drzewa. Jako właściciel drzewa sam decydujesz, czy jest ono publiczne czy prywatne oraz jak wiele informacji (np. same imiona bez dat) widzą odwiedzający.</li>
              <li>Administrator czuwa nad prywatnością. Jeśli Twoje dane znalazły się w cudzym drzewie bez Twojej zgody, możesz zażądać ich ukrycia lub usunięcia – realizujemy takie zgłoszenia w ciągu 7 dni.</li>
              <li>Konto i wszystkie swoje drzewa możesz w każdej chwili usunąć jednym kliknięciem w profilu.</li>
            </ul>
          </Sekcja>

          <Sekcja tytul="Administrator">
            <p>
              Serwis jest prowadzony prywatnie, w celach niekomercyjnych i edukacyjno-historycznych.{" "}
              {dane ? (
                <>Dane kontaktowe administratora: {administrator.email ? <>{administrator.nazwa && `${administrator.nazwa}, `}{link(`mailto:${administrator.email}`, administrator.email)}</> : dane}.</>
              ) : (
                <>
                  Kontakt z administratorem (także w sprawie zgłoszeń opisanych niżej): {" "}
                  <Link className="link" href={sciezkaKontaktu()}>
                    formularz kontaktowy
                  </Link>
                  .
                </>
              )}
            </p>
            <p>
              Administrator serwisu posiada pełną kontrolę techniczną nad platformą oraz dostęp do wszystkich kont i drzew (w tym prywatnych). Administrator ma prawo edytować, ukrywać lub usuwać dowolne wpisy i drzewa w przypadku naruszenia regulaminu, przepisów prawa lub na uzasadnione żądanie osoby, której dane dotyczą – również wtedy, gdy właściciel danego drzewa sam tego nie zrobi.
            </p>
          </Sekcja>

          <Sekcja tytul="Konta użytkowników">
            <p>
              Podczas rejestracji zbieramy imię, nazwisko i adres e-mail (także przy logowaniu przez Google – wtedy z konta Google pobieramy imię, nazwisko oraz adres e-mail). Dane te służą wyłącznie do prowadzenia konta, logowania, potwierdzenia adresu e-mail oraz wskazywania Ciebie jako właściciela albo współpracownika drzewa. Nie wysyłamy wiadomości marketingowych ani newsletterów.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Imię i nazwisko właściciela jest widoczne przy jego publicznych drzewach, a imiona i nazwiska współpracowników – osobom, które mają dostęp do danego drzewa.</li>
              <li>Adres e-mail nie jest nigdzie publikowany; służy jedynie do kontaktu systemowego oraz do zapraszania Cię do współpracy (inny użytkownik wpisuje Twój adres, żeby dodać Cię do swojego drzewa).</li>
            </ul>
            <p>
              Konta, drzewa i dane logowania są przechowywane w usługach Google Firebase (Authentication i Cloud Firestore), a strona jest udostępniana przez Firebase Hosting. Google LLC działa jako podmiot przetwarzający dane na zlecenie administratora. Ponieważ infrastruktura Google może wiązać się z przetwarzaniem danych poza Europejskim Obszarem Gospodarczym (w USA), odbywa się to w oparciu o zatwierdzone mechanizmy prawne (program EU-US Data Privacy Framework oraz standardowe klauzule umowne). Dostawca hostingu, jak każdy serwer WWW, może zapisywać w dziennikach technicznych adres IP i czas żądania w celach bezpieczeństwa.
            </p>
          </Sekcja>

          <Sekcja tytul="Drzewa genealogiczne i dane osób, które w nich występują">
            <p>Użytkownicy serwisu samodzielnie tworzą drzewa genealogiczne i wprowadzają do nich dane dotyczące swoich przodków oraz krewnych (imiona, nazwiska, daty i miejsca urodzenia, ślubu, śmierci oraz powiązania rodzinne).</p>
            <p>
              <strong>Odpowiedzialność za treść:</strong> Za legalność i prawdziwość danych wpisanych do drzewa odpowiada jego właściciel. Wpisuj dane osób żyjących tylko wtedy, gdy masz ku temu uzasadnioną podstawę (np. są to Twoi bliscy i poinformowałeś ich o tworzeniu drzewa lub wiesz, że nie wnoszą sprzeciwu).
            </p>
            <p>
              <strong>Kontrola widoczności i prywatności:</strong>
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Drzewo prywatne widzą wyłącznie jego właściciel, zaproszeni współpracownicy oraz administrator serwisu.</li>
              <li>Drzewo publiczne może przeglądać każdy, kto zna jego adres, a ponadto pojawia się ono w katalogu drzew.</li>
              <li>
                <strong>Ochrona osób żyjących:</strong> Właściciel drzewa decyduje o zakresie widoczności danych osób oznaczonych jako żyjące. Może całkowicie wyłączyć widoczność dat oraz nazwisk dla osób postronnych, pozostawiając np. same imiona, pokazać imię i nazwisko z rokiem urodzenia albo udostępnić pełne dane. Dane ukryte nie są w ogóle przesyłane do przeglądarki osób nieuprawnionych – serwer przechowuje je oddzielnie, udostępniając je tylko zarządzającym drzewem.
              </li>
              <li>
                <strong>Wyszukiwarki internetowe:</strong> Strony z danymi osób żyjących są domyślnie oznaczane w sposób ograniczający ich indeksowanie przez zewnętrzne wyszukiwarki internetowe (np. Google).
              </li>
            </ul>
            <p>
              <strong>Współpraca i eksport danych:</strong>
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Współpracownik wskazany przez właściciela może dodawać, zmieniać i usuwać osoby w drzewie, ale nie może zmieniać jego ustawień prywatności ani usunąć całego drzewa.</li>
              <li>Możesz poprosić o dołączenie do cudzego drzewa: prośba zawiera tylko Twoje imię i nazwisko, widzi ją właściciel drzewa i znika ona po podjęciu przez niego decyzji.</li>
              <li>Właściciel może przekazać drzewo jednemu ze swoich współpracowników – wtedy drzewo zostaje w serwisie, nawet jeśli dotychczasowy właściciel usunie swoje konto.</li>
              <li>Właściciel drzewa może pobrać jego kopię (pliki JSON lub GEDCOM). Plik taki zawiera pełne dane (także osób żyjących, niezależnie od ustawień widoczności w serwisie) – od momentu pobrania za bezpieczeństwo tego pliku odpowiada wyłącznie osoba, która go pobrała.</li>
            </ul>
            <p>
              <strong>Podstawy prawne (RODO):</strong> W zakresie danych dotyczących konta użytkownika podstawą przetwarzania jest umowa o świadczenie usługi drogą elektroniczną (art. 6 ust. 1 lit. b RODO). W zakresie, w jakim wpisy w drzewach dotyczą osób żyjących, podstawą przetwarzania jest prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO) właściciela drzewa polegający na dokumentowaniu historii rodziny i archiwizacji genealogicznej.
            </p>
          </Sekcja>

          {KLUCZ_APP_CHECK && (
            <Sekcja tytul="Ochrona przed nadużyciami (reCAPTCHA)">
              <p>
                Aby chronić bazę danych przed automatycznymi nadużyciami i spamem, serwis korzysta z Firebase App Check z usługą Google reCAPTCHA. W tym celu przeglądarka każdego odwiedzającego pobiera skrypt Google i przesyła do Google informacje o urządzeniu i sposobie korzystania ze strony (m.in. adres IP) zgodnie z polityką prywatności Google. Dane te służą wyłącznie do odróżnienia człowieka od bota. Ta strona jest chroniona przez reCAPTCHA (w rogu ekranu widać jej plakietkę); obowiązują {link("https://policies.google.com/privacy", "Polityka prywatności")} i {link("https://policies.google.com/terms", "Warunki korzystania")} Google.
              </p>
            </Sekcja>
          )}

          <Sekcja tytul="Pamięć przeglądarki (brak plików cookies)">
            <p>
              Serwis nie zapisuje tradycyjnych plików ciasteczek (cookies). W lokalnej pamięci przeglądarki (<code>localStorage</code>, <code>IndexedDB</code>) zapisywane są wyłącznie dane niezbędne do działania strony:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>wybrany motyw graficzny (jasny lub ciemny),</li>
              <li>sesja logowania Firebase – tylko po zalogowaniu, aby nie trzeba było logować się przy przechodzeniu między podstronami,</li>
              <li>robocze zmiany administratora dotyczące drzew z repozytorium – zapisywane wyłącznie w przeglądarce administratora.</li>
            </ul>
            <p>Dane te możesz w każdej chwili usunąć, wylogowując się z serwisu albo czyszcząc dane witryny w ustawieniach swojej przeglądarki.</p>
          </Sekcja>

          <Sekcja tytul="Twoje prawa, zastrzeganie danych i zgłoszenia (realizacja do 7 dni)">
            <p>
              Dane swojego konta możesz w każdej chwili poprawić w profilu, a samo konto wraz ze wszystkimi swoimi drzewami usunąć jednym przyciskiem („Usuń moje konto”). Usunięcie jest nieodwracalne (dane mogą utrzymywać się wyłącznie w szyfrowanych kopiach zapasowych bazy przez okres niezbędny do zachowania ciągłości technicznej serwisu, nie dłużej niż 30 dni, po czym są trwale nadpisywane). Drzewa innych osób, w których jesteś współpracownikiem, pozostają w serwisie, a Ty przestajesz mieć do nich dostęp.
            </p>
            <p>
              <strong>Żądanie ukrycia lub usunięcia swoich danych z cudzego drzewa:</strong> Jeśli w którymkolwiek drzewie w serwisie znajdują się dane Twoje lub Twoich małoletnich dzieci, masz prawo wnieść sprzeciw wobec ich publikacji oraz zażądać ich:
            </p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>częściowego ukrycia / zastrzeżenia (np. ukrycia daty urodzenia, miejsca lub nazwiska i pozostawienia samego imienia bądź inicjałów),</li>
              <li>sprostowania (poprawienia błędnych informacji),</li>
              <li>całkowitego usunięcia z drzewa.</li>
            </ol>
            <p>
              W tym celu skontaktuj się bezpośrednio z właścicielem drzewa lub napisz bezpośrednio do administratora serwisu (<Link className="link" href={sciezkaKontaktu()}>formularz kontaktowy</Link>), wskazując link do drzewa oraz osobę, której dotyczy zgłoszenie. Administrator rozpatruje i realizuje takie zgłoszenia w terminie maksymalnie 7 dni – w razie braku reakcji ze strony właściciela drzewa, administrator samodzielnie ukryje lub usunie wskazane dane.
            </p>
            <p>Przysługuje Ci również prawo dostępu do swoich danych, ich przenoszenia oraz prawo wniesienia skargi do organu nadzorczego – Prezesa Urzędu Ochrony Danych Osobowych ({link("https://uodo.gov.pl/", "uodo.gov.pl")}).</p>
          </Sekcja>

          <Sekcja tytul="Formularz kontaktowy" id="kontakt">
            <p>
              Jeśli napiszesz do nas przez formularz kontaktowy, przetwarzamy podane w nim imię (lub nazwę), adres e-mail, temat i treść wiadomości – wyłącznie po to, żeby Ci odpowiedzieć (prawnie uzasadniony interes administratora, art. 6 ust. 1 lit. f RODO, oraz Twoja zgoda zaznaczona w formularzu). Wiadomość jest zapisywana w bazie serwisu, do której dostęp ma tylko administrator, i usuwana, gdy sprawa zostanie załatwiona.
              {KLUCZ_KONTAKTU && " Dodatkowo trafia do administratora e-mailem za pośrednictwem usługi Web3Forms (Web3Forms, jako podmiot przetwarzający, przekazuje wiadomość na skrzynkę administratora)."}
            </p>
          </Sekcja>

          {FACEBOOK_WLACZONY && (
            <Sekcja tytul="Logowanie przez Facebook" id="facebook">
              <p>
                Możesz zalogować się kontem Facebook. W oknie logowania Facebook (Meta Platforms) pyta o zgodę na udostępnienie serwisowi imienia i nazwiska oraz adresu e-mail – tylko te dane do nas trafiają, nie pobieramy zdjęcia, listy znajomych ani innych informacji z Facebooka i nie publikujemy niczego na Twoim koncie. Facebook przetwarza dane logowania jako odrębny administrator według własnej polityki prywatności.
              </p>
              <p id="usuwanie-danych">
                <strong>Usuwanie danych.</strong> Aby usunąć konto i wszystkie powiązane z nim dane w serwisie, zaloguj się i w profilu wybierz „Usuń moje konto” (drzewa, które chcesz zachować, możesz wcześniej przekazać innemu użytkownikowi). Możesz też w ustawieniach Facebooka (Ustawienia i prywatność → Aplikacje i witryny) usunąć aplikację „Przodkowie”; dane w serwisie usuwa się wtedy opisanym wyżej sposobem. Z prośbą o usunięcie danych możesz się też skontaktować z administratorem.
              </p>
            </Sekcja>
          )}

          <Sekcja tytul="Zmiany polityki prywatności">
            <p>
              Administrator zastrzega sobie prawo do wprowadzania zmian w niniejszej Polityce prywatności (np. w związku z rozwojem funkcji serwisu lub zmianami prawa). Aktualna treść dokumentu jest zawsze publikowana na tej podstronie wraz z nową datą obowiązywania.
            </p>
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
