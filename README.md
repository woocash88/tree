# Przodkowie – drzewa genealogiczne rodzin

Serwis z **wieloma drzewami genealogicznymi**, w całości po polsku. Strona jest statyczna (Next.js, eksport do plików
HTML, hosting Firebase), ale **każdy użytkownik może założyć konto i prowadzić własne drzewa**: konta, drzewa i osoby
użytkowników trzymane są w Firebase (Authentication + Cloud Firestore) i obsługiwane w przeglądarce, a dostępu
pilnują reguły bazy (`firestore.rules`). Bez śledzenia i zewnętrznych skryptów.

Wszystkie drzewa, które widać na stronie, są **drzewami użytkowników** (`/d/?id=…`): tworzą je i edytują zarejestrowani
użytkownicy w przeglądarce, a dane leżą w bazie. Repozytorium dodatkowo przechowuje **kopie źródłowe** w `data/drzewa/<slug>/`
(oznaczone `"archiwalne": true` w `drzewo.json`, więc **nie są publikowane na stronie**). Serwis nadal potrafi publikować
drzewa z repozytorium jako statyczne strony (`/drzewa/<slug>/…`), jeśli usuniesz z nich flagę `archiwalne`.

Konta włączają się dopiero po skonfigurowaniu Firebase (sekcja „Konta, role i prywatność”). Bez konfiguracji
serwis nie ma żadnych drzew, dopóki nie opublikujesz drzew z repozytorium.

Kopie źródłowe w repozytorium:

| slug | drzewo | uwagi |
|---|---|---|
| `lulkiewicz` | Rodzina Lulkiewiczów (427 osób, 10 pokoleń) | dane ze strony genealogia.okiem.pl; **przeniesione do bazy** jako drzewo właściciela serwisu (workflow „Przenieś drzewo do bazy”); kopia źródłowa i wzorzec importu (`npm run import`) |
| `przyklad` | Rodzina Przykładowskich (41 osób, 5 pokoleń, 2 gałęzie) | **fikcyjne**; nie jest publikowane, służy jako dane testowe (testy listy, wyszukiwarki, edycji) |

> **Dane Lulkiewiczów** pochodzą ze strony <https://genealogia.okiem.pl/drzewo/238/lulkiewicz>. Sprawdź regulamin tego serwisu
> (zasady kopiowania i ponownego publikowania danych) i w razie potrzeby uzyskaj zgodę opiekuna drzewa.
> Źródło jest zapisane w opisie drzewa; to nie zastępuje zgody.

## Adresy

| adres | zawartość |
|---|---|
| `/` | strona główna: wyszukiwarka drzew, wyróżnione drzewa, krótki opis |
| `/drzewa/` | indeks drzew: karty (nazwa, opis, lata, osoby, pokolenia, region, aktualizacja), wyszukiwanie po nazwie/nazwisku/regionie, sortowanie (alfabetycznie, największe, ostatnio zaktualizowane) |
| `/drzewa/<drzewo>/` | strona drzewa: statystyki, kafelki gałęzi, wyszukiwarka osób, źródło i opiekun |
| `/drzewa/<drzewo>/galaz/<galaz>/` | **lista gałęzi** (widok główny): zwijana lista z wcięciami, panel osoby; `cale` = „Całe drzewo” |
| `/drzewa/<drzewo>/diagram/<galaz>/` | diagram na płótnie (React Flow) – widok dodatkowy (też `cale`) |
| `/drzewa/<drzewo>/osoba/<id>/` | widok osoby: przodkowie, rodzeństwo, małżonkowie, dzieci |
| `/drzewa/<drzewo>/osoby/` | alfabetyczny indeks osób z filtrami |
| `/polityka-prywatnosci/` | polityka prywatności (link w stopce) |
| `/rejestracja/`, `/logowanie/` | zakładanie konta (e-mail albo Google) i logowanie |
| `/profil/` | profil użytkownika: dane, moje drzewa, drzewa, przy których współpracuje, tworzenie drzewa, usunięcie konta |
| `/d/?id=<id>` | drzewo użytkownika; parametr `w` wybiera widok: brak = strona drzewa, `galaz` (lista; `g` = gałąź, `os` = osoba), `diagram`, `osoba`, `osoby`, `ustawienia` |
| `/admin/` | panel administratora serwisu, podzielony na podstrony `?s=uzytkownicy`, `?s=drzewa` (z ID drzew) i `?s=repozytorium`: tabele z wyszukiwaniem i stronicowaniem po 25 wierszy; w tabeli użytkowników widać role w drzewach (właściciel / kolaborant) i można zmienić imię i nazwisko użytkownika (profil i nazwy w jego drzewach); adres e-mail jest adresem konta logowania i zmienia go sam użytkownik (poza indeksowaniem) |
| `/dane/szukaj-<drzewo>.json` | indeks wyszukiwania osób jednego drzewa (ładowany dopiero na stronie tego drzewa) |
| `/sitemap.xml`, `/robots.txt` | generowane z listy drzew |

Identyfikatory osób są unikalne w obrębie drzewa, a adres zawsze zawiera slug drzewa.
Stan listy i diagramu jest w adresie (`?os=<id osoby>&rozw=<pokolenia>`), więc widok można wysłać linkiem.

## Uruchomienie lokalne

Wymagany Node.js 20 lub nowszy.

```bash
npm install
npm run dev          # tryb deweloperski: http://localhost:3000
npm run build        # walidacja wszystkich drzew + statyczny eksport do katalogu out/
npm start            # podgląd zbudowanej strony z katalogu out/
npm test             # testy: parsowanie, walidacja, polityka dat, wyszukiwarki, lista, logika drzew użytkowników
npm run lint         # eslint + kontrola typów
npm run waliduj      # walidacja drzew (opcjonalnie: -- <slug>)
npm run kontrast     # kontrola kontrastu WCAG motywów jasnego i ciemnego
npm run zastosuj-edycje -- <slug> <plik.json>   # wpisuje do danych zmiany osób pobrane z serwisu
npm run zastosuj-zmiany-drzew -- <plik.json>    # edycja metadanych i usuwanie drzew z panelu /admin/
npm run test:reguly                             # testy reguł bazy na emulatorze Firestore (wymaga Javy)
npm run test:e2e                                # testy end-to-end kont i drzew na emulatorach (wymaga Playwrighta)
```

## Struktura danych

```
data/drzewa/<slug>/
  drzewo.json          metadane drzewa (poniżej)
  rodzina.json         osoby, małżeństwa, gałęzie
  poprawki.json        (opcjonalnie) ręczne poprawki nakładane po imporcie
  import-raport.md     (opcjonalnie) raport importu
  zrodlo/              (opcjonalnie) pliki źródłowe
```

Nazwa katalogu to slug drzewa i jest częścią adresów (`/drzewa/<slug>/`). Katalog główny można
zmienić zmienną `DRZEWA_KATALOG` (używa jej test wydajności).

### `drzewo.json`

```json
{
  "slug": "rodzina-kowalskich",
  "nazwa": "Rodzina Kowalskich",
  "opis": "Krótki opis drzewa (1–2 zdania).",
  "zakresLat": { "od": 1820, "do": 2005 },
  "region": "Kobylin, Wielkopolska",
  "zrodlo": { "nazwa": "Archiwum rodzinne", "url": "https://example.org/zrodlo" },
  "autor": { "nazwa": "Jan Kowalski", "url": "https://example.org/jan" },
  "zaktualizowano": "2026-11-11",
  "widocznosc": "publiczne",
  "politykaDatZyjacych": "ukryj"
}
```

- `slug` – zgodny z nazwą katalogu; małe litery bez polskich znaków, cyfry i łączniki.
- `zakresLat` – lata skrajne w danych (test pilnuje, żeby żadna data nie wychodziła poza zakres).
- `archiwalne` (`true` = kopia źródłowa, niepublikowana na stronie), `autor.url`, `przykladowe` (`true` oznacza drzewo fikcyjne – pokazywane z plakietką) i `wyrozniane`
  (`true` = pokaż na stronie głównej) są opcjonalne.
- `widocznosc` – na razie jedyna wartość to `"publiczne"`.
- `politykaDatZyjacych` – co pokazać przy osobach z flagą `"zyjaca": true`:
  - `"ukryj"` (domyślnie) – tylko imię i nazwisko; dat, miejsc i notatek nie ma w zbudowanych plikach,
  - `"tylko-rok"` – rok urodzenia (bez miejsc i notatek),
  - `"pokaz"` – wszystkie dane.

Okrajanie dzieje się w `lib/dane.ts` (`okroj()`), zanim dane trafią do widoków i do przeglądarki.
Sam plik `rodzina.json` zawiera pełne dane – jeśli repozytorium jest publiczne, rozważ usunięcie
dat osób żyjących ze źródła. Błąd w którymkolwiek drzewie zatrzymuje build z komunikatem
wskazującym drzewo i osobę:

```
✖ Drzewo „lulkiewicz” zawiera błędy – build zatrzymany.
  • rodzina.json: Zduplikowane id osoby: "jan-kowalski-1560" (Jan Kowalski).
  • rodzina.json: Osoba "piotr-kowalski-1891" (Piotr Kowalski): brakujący rodzic – ojciecId = "x-y" nie istnieje na liście osób.
```

### `rodzina.json`

```json
{
  "galezie": [{ "id": "kowalscy", "nazwa": "Kowalscy", "kolor": "#3b82f6", "opis": "Potomkowie Jana." }],
  "osoby": [
    {
      "id": "jan-kowalski-1891",
      "imie": "Jan",
      "nazwisko": "Kowalski",
      "nazwiskoRodowe": "…",
      "plec": "M",
      "urodzenie": { "wartosc": "1891-03-04", "dokladnosc": "dokladna", "miejsce": "Kobylin" },
      "smierc": { "wartosc": "1973", "dokladnosc": "rok" },
      "ojciecId": "piotr-kowalski-1860",
      "matkaId": null,
      "galazId": "kowalscy",
      "notatka": "Dowolny krótki tekst."
    }
  ],
  "malzenstwa": [{ "osobaAId": "jan-kowalski-1891", "osobaBId": "anna-nowak", "kolejnosc": 1 }]
}
```

Zasady:

- `id` – unikalne **w obrębie drzewa**: małe litery bez polskich znaków, cyfry i łączniki. Jest częścią
  adresu, więc po publikacji go nie zmieniaj. Przy osobach żyjących nie wpisuj roku urodzenia do `id`.
- `plec`: `"M"`, `"K"` albo `"nieznana"`.
- Data: `wartosc` to `"RRRR"` albo `"RRRR-MM-DD"`, `dokladnosc` to `"dokladna"` (pełna data), `"rok"`,
  `"okolo"` albo `"nieznana"` (wtedy bez `wartosc`). Na stronie: „ok. 1560–1610”, „1891–1973”, „ur. 4.03.1953”.
- `smierc` pomiń, jeśli nic o niej nie wiadomo; `{ "dokladnosc": "nieznana" }` oznacza „zmarł(a), data nieznana”.
  Pustą datę śmierci strona pokazuje tylko osobom, które według danych nie żyją.
- `ojciecId` / `matkaId` – id rodziców albo `null`. Kolejność osób w pliku = kolejność rodzeństwa.
- Opcjonalne: `nazwiskoRodowe`, `miejsce`, `notatka`, `zyjaca`, `niepewne` (lista z: `imie`, `nazwisko`,
  `wpis`, `miejsce`, `rodzice`, `plec`).
- Małżeństwo: `kolejnosc` to numer związku (1, 2, …) osoby, która miała ich kilka. Dzieci trafiają pod właściwą
  parę na podstawie swoich `ojciecId` i `matkaId`. Małżonek spoza rodu to zwykła osoba bez rodziców,
  z tą samą `galazId` co partner.
- Gałąź: każda osoba ma `galazId`. Gałęzie nie muszą być ze sobą połączone. Gałąź z `"wspolna": true` (pień wspólny
  dla wszystkich linii, np. dwa pierwsze pokolenia Lulkiewiczów) nie jest pokazywana jako osobna kategoria:
  jej osoby widać w widoku **„Całe drzewo”** (`/galaz/cale/`), który jest zawsze pierwszy w wyborze gałęzi. Wybierz żywy kolor `#rrggbb`
  (na stronie koloru używamy zawsze razem z nazwą gałęzi, więc nie jest jedynym nośnikiem informacji).

## Jak dodać drzewo (krok po kroku)

Formularza online jeszcze nie ma – drzewa dodaje się do repozytorium (Pull Request albo zgłoszenie issue
z plikami).

1. Wybierz **slug**, np. `rodzina-kowalskich`, i utwórz katalog `data/drzewa/rodzina-kowalskich/`.
2. Skopiuj `data/drzewa/przyklad/drzewo.json` i `rodzina.json` jako punkt wyjścia (albo `tests/przyklad.json`
   – najmniejszy kompletny przykład formatu). Uzupełnij metadane: nazwę, opis, region, **źródło danych i opiekuna**,
   politykę dat osób żyjących. Usuń `przykladowe` i ewentualnie `wyrozniane`.
3. Wpisz osoby, małżeństwa i gałęzie do `rodzina.json` (zasady wyżej). Osoby żyjące oznacz `"zyjaca": true`.
   Jeśli masz dane w innym formacie, dopisz skrypt importu na wzór `scripts/import.ts`.
4. Uruchom `npm run waliduj -- rodzina-kowalskich`. Błędy wskażą drzewo, osobę i pole.
5. Uruchom `npm run dev` i sprawdź: stronę drzewa, listę gałęzi, widok osoby, wyszukiwarkę.
6. Zrób commit i Pull Request. `npm run build` waliduje wszystkie drzewa i zatrzymuje się na błędzie
   w którymkolwiek z nich.

Drzewo usuwa się, kasując jego katalog z `data/drzewa/`.

## Import drzewa Lulkiewiczów

Skrypty przyjmują slug drzewa jako argument i działają tylko na jego katalogu.

```bash
curl -L -o /tmp/strona.html https://genealogia.okiem.pl/drzewo/238/lulkiewicz
node scripts/wytnij-zrodlo.mjs lulkiewicz /tmp/strona.html   # → data/drzewa/lulkiewicz/zrodlo/lulkiewicz.txt (+ .pre.html)
npm run import -- lulkiewicz                                  # → rodzina.json + import-raport.md w katalogu drzewa
```

- `zrodlo/lulkiewicz.pre.html` – blok `<pre>` ze strony, bajt w bajt; `zrodlo/lulkiewicz.txt` – ten sam tekst
  po mechanicznej zamianie `<br>` na nowe wiersze i usunięciu znaczników. To z niego czyta `scripts/import.ts`.
- `import-raport.md` – wszystko, czego nie dało się odczytać jednoznacznie, z numerem wiersza.
- `poprawki.json` – ręczne poprawki nakładane **po** imporcie (ponowny import ich nie kasuje):

  ```json
  { "osoby": { "aukasz-mocek": { "imie": "Łukasz", "plec": "M" } }, "scal": [] }
  ```

  `osoby`: id → pola do nadpisania (`null` usuwa pole opcjonalne). `scal`: łączy dwa wpisy tej samej osoby.
  Nieistniejące id zatrzymuje import, żeby nieaktualna poprawka nie przeszła niezauważona.
- Ręczna edycja `rodzina.json` tego drzewa zostanie nadpisana przy następnym imporcie (pilnuje tego test).

Jak import czyta źródło: rodzic = ostatnia wcześniejsza osoba o numerze pokolenia o 1 mniejszym; `=a4` / `=b4` →
dziecko z 1. / 2. związku; `??` i `?` → pole `niepewne`; płeć z listy imion (`scripts/imiona.ts`); `id` =
imię-nazwisko-rok urodzenia (bez roku u osób żyjących); gałęzie: dzieci Wiktora (pokolenie 3) zaczynają siedem
linii, pokolenia 1–2 to „Wspólny pień”; `zyjaca` = urodzenie po 1925 r. i brak informacji o śmierci.

## Konta, role i prywatność

### Kto co może

| | gość | zalogowany | kolaborant drzewa | właściciel drzewa | administrator serwisu |
|---|---|---|---|---|---|
| przegląda drzewa publiczne (osoby żyjące wg ustawień właściciela) | ✔ | ✔ | ✔ | ✔ | ✔ |
| zakłada konto i tworzy własne drzewa | | ✔ (po potwierdzeniu e-maila) | | | |
| widzi pełne dane drzewa, dodaje, edytuje i usuwa osoby | | | ✔ | ✔ | ✔ (każde drzewo) |
| prosi o dołączenie do cudzego drzewa jako kolaborant | | ✔ | | | |
| zmienia ustawienia drzewa (nazwa, publiczne/prywatne, osoby żyjące), dodaje kolaborantów, zatwierdza prośby, przekazuje własność, usuwa drzewo | | | | ✔ | ✔ (ustawienia i usunięcie; własności nie przekazuje) |
| usuwa użytkowników i ich drzewa | | | | | ✔ |

- **Rejestracja**: imię, nazwisko, adres e-mail i hasło (min. 8 znaków) albo konto Google. Adres e-mail trzeba
  potwierdzić linkiem z wiadomości (konta Google są potwierdzone automatycznie); do tego czasu nie można tworzyć drzew ani
  być zapraszanym. Strona sama wykrywa kliknięcie linku w innej karcie.
- **Prywatność drzewa** (ustawienia drzewa): *prywatne* – widzą je tylko właściciel, kolaboranci i administrator;
  *publiczne* – każdy z linkiem, drzewo pojawia się w katalogu `/drzewa/`.
- **Osoby żyjące** (oznaczone przy osobie; nowa osoba urodzona po 1925 r. bez daty śmierci jest domyślnie żyjąca):
  właściciel wybiera, co widzą odwiedzający – *tylko imię i nazwisko*, *z rokiem urodzenia* albo *wszystkie dane*.
  To ustawienie jest wymuszane przez bazę, nie tylko ukrywane w widoku: w Firestore każde drzewo ma dwa dokumenty,
  `dane/pelne` (tylko dla zarządzających) i `dane/publiczne` (kopia już okrojona według polityki, przeliczana
  przy każdej zmianie). Odwiedzający nigdy nie pobierają dat osób żyjących.
- **Kolaboranci** można dodać na dwa sposoby. (1) Właściciel wpisuje adres e-mail zarejestrowanego użytkownika (ustawienia
  drzewa). (2) Użytkownik wkleja w profilu („Dołącz do istniejącego drzewa”) link do drzewa **albo sam numer drzewa** od właściciela (numer jest
  widoczny jako „ID drzewa: …” z przyciskiem „Kopiuj” obok nazwy drzewa: na stronie drzewa, w pasku roli, w profilu i w ustawieniach) albo otwiera
  link do prywatnego drzewa i klika „Poproś o dostęp”; **prośbę zatwierdza albo odrzuca właściciel** (ustawienia drzewa,
  w profilu widać liczbę oczekujących próśb). Kolaborant widzi drzewo w profilu w sekcji „Współpracuję przy” i może
  je tam opuścić. Prośba zawiera tylko imię i nazwisko autora i znika po zatwierdzeniu lub odrzuceniu.
- **Przekazanie własności**: właściciel może przekazać drzewo jednemu ze swoich kolaborantów (ustawienia drzewa →
  „Przekaż własność”); dotychczasowy właściciel zostaje kolaborantem. Dzięki temu może usunąć konto, a drzewo zostaje.
  W sekcji „Usuń konto” w profilu widać, które drzewa zostaną usunięte, z linkami do przekazania.
- **Usuwanie**: użytkownik usuwa konto i wszystkie swoje drzewa w profilu. Administrator może usunąć użytkownika
  (jego drzewa i udział w cudzych drzewach znikają, konto zostaje zablokowane) oraz dowolne drzewo.

### Adres e-mail i dwa sposoby logowania

Konto można prowadzić hasłem, przez Google albo oboma sposobami naraz – wciąż jest to jedno konto z jednymi drzewami.

- **Jedno konto na adres.** W konsoli Firebase (*Authentication → Settings → User account linking*) powinna być wybrana opcja
  **„Link accounts that use the same email”** (domyślna). Wtedy logowanie przez Google adresem, którym ktoś zarejestrował się
  hasłem (i odwrotnie), prowadzi do tego samego konta, a nie zakłada drugiego.
- **Zmiana adresu** (profil → „Adres e-mail i logowanie”): dla kont z hasłem. Użytkownik podaje nowy adres i swoje hasło, na nowy
  adres idzie link; po jego kliknięciu adres się zmienia, a użytkownik loguje się ponownie. Profil i wpis w rejestrze adresów
  (wyszukiwanie kolaboranta) są uzgadniane przy najbliższym logowaniu. Konto założone wyłącznie przez Google ma adres
  konta Google – nie da się go tu zmienić (można dodać hasło albo założyć nowe konto i przekazać mu drzewa).
- **Dodanie drugiego sposobu**: konto Google może dodać logowanie hasłem, a konto z hasłem – połączyć się z Google
  (tylko jeśli konto Google ma ten sam adres e-mail, inaczej połączenie jest cofane).

### Konfiguracja Firebase (jednorazowo, w przeglądarce)

1. **Authentication** (Build → Authentication → Rozpocznij → Sign-in method): włącz **Adres e-mail/hasło** oraz **Google**
   (przy Google wybierz adres pomocniczy projektu). W *Settings → Authorized domains* powinna być domena strony
   (`<projekt>.web.app` dodaje się automatycznie).
2. **Cloud Firestore** (Build → Firestore Database → Utwórz bazę): lokalizacja **eur3 (Europe)**, tryb **produkcyjny**
   (nie „testowy”!). Reguły wdroży workflow albo wkleisz je ręcznie: Firestore → *Reguły* → wklej zawartość
   `firestore.rules` → *Opublikuj*. **Po każdej zmianie pliku `firestore.rules` trzeba je opublikować ponownie** – automatycznie
   zrobi to workflow, o ile konto serwisowe ma rolę *Firebase Rules Admin* (w logu Actions pojawi się ostrzeżenie, jeśli nie ma).
   Bez aktualnych reguł nowe funkcje nie działają, a przy braku reguł baza odmawia wszystkiego.
3. **Aplikacja internetowa**: Ustawienia projektu (zębatka) → *Ogólne* → *Twoje aplikacje* → ikona `</>` → nazwa dowolna,
   bez Firebase Hosting → *Zarejestruj*. Zapisz `apiKey` i `appId` z wyświetlonej konfiguracji (to publiczne identyfikatory).
4. **GitHub** → *Settings → Secrets and variables → Actions → Variables*: dodaj `FIREBASE_API_KEY` (= `apiKey`)
   i `FIREBASE_APP_ID` (= `appId`). Dopiero te zmienne włączają konta w zbudowanej stronie.
5. **Pierwszy administrator**: zarejestruj się w serwisie własnym kontem, potwierdź e-mail. W konsoli Firebase
   (Authentication → Users) skopiuj swój **UID**. Potem w Firestore (Dane → *Rozpocznij kolekcję*) utwórz kolekcję
   `admini` z dokumentem o identyfikatorze równym Twojemu UID i dowolnym polem (np. `od` = tekst `1`).
   Od tej chwili po zalogowaniu widzisz „Panel administratora” w menu konta. Klient nie może zapisać tej kolekcji,
   więc nikt nie nada sobie roli sam.
6. Wdróż (scal zmiany do `main` albo *Run workflow*) i sprawdź: rejestracja, tworzenie drzewa, zaproszenie kolaboranta.

### Ochrona przed nadużyciami (App Check, opcjonalnie)

Reguły chronią dane, ale nie ograniczają ruchu: skrypt spoza strony mógłby w pętli czytać publiczne drzewa i zużyć dzienny limit odczytów
(wtedy strona do końca doby zgłasza błędy). **Firebase App Check** sprawia, że baza przyjmuje tylko żądania z Twojej strony.

1. Klasyczna konsola reCAPTCHA jest wycofana. W Google Cloud (projekt `familytree-bab4e`) włącz *reCAPTCHA Enterprise API* (obecnie „Fraud Defense”)
   i utwórz klucz typu **witryna internetowa** z domenami `familytree-bab4e.web.app` i `familytree-bab4e.firebaseapp.com`.
   Skopiuj jego **identyfikator** – to klucz witryny.
2. W konsoli Firebase: *Build → App Check → Apps* → aplikacja internetowa → **reCAPTCHA Enterprise** → wklej ten klucz → *Save*.
3. W GitHubie (*Settings → Secrets and variables → Actions → Variables*) dodaj `FIREBASE_APPCHECK_KEY` = **klucz witryny**. Dla starego klucza klasycznego v3 dodaj jeszcze `FIREBASE_APPCHECK_TYP` = `v3`. Wdróż stronę.
4. Odczekaj dobę i w *App Check → APIs → Cloud Firestore* sprawdź wykres: żądania mają być „zweryfikowane”. **Dopiero wtedy** kliknij **Enforce**.
   Włączenie od razu zablokuje każdego, kto ma jeszcze starą wersję strony w przeglądarce.

Koszt i prywatność: usługa jest darmowa, ale reCAPTCHA ładuje skrypt Google u każdego odwiedzającego – dlatego jest włączana tylko po
ustawieniu zmiennej, a polityka prywatności i stopka dostają wtedy odpowiednie informacje (stopka z wymaganym przez Google oznaczeniem,
plakietka reCAPTCHA jest ukryta, żeby nie zasłaniała paneli). Emulatory i testy nie używają App Check.

**Oszczędność odczytów.** Każdy dokument zwrócony przez zapytanie to jeden odczyt z dziennego limitu. Dlatego strona główna nie pobiera
żadnych drzew: lista publicznych drzew (limit 100) ładuje się dopiero, gdy ktoś kliknie w wyszukiwarkę albo wejdzie do katalogu, a wynik jest
wspólny dla całej strony i pamiętany 10 minut w pamięci i `sessionStorage`. Zmiana drzewa (utworzenie, ustawienia, usunięcie) unieważnia
pamięć. Przy ponad 100 publicznych drzewach katalog pokazuje 100 z nich; dalsza skala wymagałaby stronicowania.

**Numer drzewa („ID drzewa”).** Każde drzewo ma krótki numer: losowy, 5-cyfrowy (np. 48213); gdy wylosowane numery okazują się zajęte
(pula się zapełnia), numer dostaje o cyfrę więcej (6, 7… do 9 cyfr). Numer widać z przyciskiem „Kopiuj” obok nazwy drzewa, na
karcie drzewa w profilu, w ustawieniach i w panelu administratora. Technicznie: dokument `numery/{numer}` wskazuje drzewo (`drzewoId`),
a pole `numer` w drzewie jest ustawiane atomowo razem z nim (batch); reguły pozwalają nadać numer tylko raz, tylko własnemu drzewu
i tylko wolny (zajęty numer odrzucają, wtedy losujemy kolejny). Starsze drzewa bez numeru dostają go automatycznie przy pierwszym
otwarciu przez właściciela lub administratora. Kto zna numer, może wysłać prośbę o dołączenie (profil → „Dołącz do istniejącego drzewa”);
sam numer nie daje wglądu w dane, o dostępie decyduje właściciel i reguły. Adres drzewa nadal zawiera długi identyfikator dokumentu.

**Limity i koszty.** Wszystko mieści się w darmowym planie Spark dla typowego użytku rodzinnego (Firestore: 50 tys. odczytów
i 20 tys. zapisów dziennie). Jedno drzewo użytkownika to dokumenty o rozmiarze do 1 MiB, czyli ok. 2000 osób
(twardy limit w regułach i aplikacji). Konta Google i e-mailowe działają bez planu Blaze.

**Czego nie ma.** Usunięcie *konta logowania* w Firebase Authentication przez administratora wymagałoby funkcji
serwerowych (plan Blaze). Dlatego administrator usuwa dane użytkownika i **blokuje** konto; jeśli chcesz je wymazać
całkowicie, usuń je dodatkowo w konsoli (Authentication → Users). Użytkownik usuwający własne konto jest usuwany
w całości. Reguły chronią dane, ale w statycznej stronie nie ma limitów szybkości (ochrona przed nadużyciami
to w Firebase App Check – patrz „Dalsze kroki”).

### Eksport i import drzewa

W ustawieniach drzewa (właściciel i administrator) jest sekcja „Eksport i import”:

- **Kopia zapasowa JSON** (`przodkowie-<nazwa>-<data>.json`): pełna wierność – wszystkie pola osób, gałęzie, kolejność
  związków, oznaczenia osób żyjących i niepewności z importu. Format to dokładnie schemat danych serwisu
  (`format: "przodkowie-drzewo"`, `wersja: 1`, listy `galezie`, `osoby`, `malzenstwa` i ustawienia `drzewo`), więc przy imporcie plik
  jest sprawdzany tym samym walidatorem co build (brakujący rodzic, cykl, duplikaty id → czytelny błąd).
- **GEDCOM 5.5.1** (`.ged`, UTF-8): standard wymiany z innymi programami (Ancestry, MyHeritage, Gramps, Geneanet). Przenosi
  osoby, imiona i nazwiska (także rodowe), płeć, daty i miejsca urodzenia i śmierci, notatki, małżeństwa i dzieci. Nie przenosi
  gałęzi ani oznaczeń osób żyjących (przy imporcie obowiązuje reguła: urodzony po 1925 r. bez daty śmierci = żyjący). Daty
  zapisane w sposób, którego serwis nie obsługuje (przedziały, same miesiące), są upraszczane, a import raportuje to
  w ostrzeżeniach.
- **Import** ma dwie drogi: przy tworzeniu nowego drzewa (profil → „Utwórz nowe drzewo” → „Wypełnij z pliku”) albo jako
  **zastąpienie zawartości** istniejącego drzewa (ustawienia → „Import z pliku”). Przed zastąpieniem serwis sam pobiera kopię
  zapasową obecnego drzewa, a podgląd pokazuje liczbę osób i ostrzeżenia. Widoczność i prywatność z pliku nie są
  przejmowane (nowe drzewo startuje jako prywatne), żeby import nie opublikował niechcący drzewa.
- **Uwaga na prywatność:** plik zawiera **pełne dane, także osób żyjących**, niezależnie od ustawień drzewa. Przechowuj go
  ostrożnie i nie wrzucaj do publicznego repozytorium. Limit pliku to 5 MB, a drzewa ok. 900 KB danych (ok. 2000 osób).

### Przeniesienie drzewa z repozytorium do bazy

Workflow **„Przenieś drzewo do bazy”** (*Actions → Run workflow*) kopiuje drzewo z `data/drzewa/<slug>/` do bazy jako drzewo
wskazanego użytkownika: podajesz slug oraz imię i nazwisko właściciela (tak jak w jego profilu, bez względu na wielkość liter
i polskie znaki) albo jego UID. Osoba musi być wcześniej zarejestrowana. Drzewo zachowuje ustawienia z `drzewo.json`
(widoczność, polityka dat osób żyjących), a źródło danych trafia do opisu. Workflow jest bezpieczny do ponownego uruchomienia
(nic nie dubluje, chyba że zaznaczysz „zastąp”), a w logu nie ma adresów e-mail. Ta sama logika działa lokalnie na
emulatorach: `npx tsx scripts/przenies-do-bazy.ts --slug lulkiewicz --imie Jan --nazwisko Kowalski`.

### Administrator drzew z repozytorium

Drzewa wbudowane (`data/drzewa/`) nie leżą w bazie. Administrator (konto z dokumentem `admini/<uid>`) widzi w menu konta
„Panel administratora” i narzędzia edycji osób w ich panelach. Zmiany powstają lokalnie w przeglądarce i trafiają
do serwisu tylko przez repozytorium:

  ```bash
  npm run zastosuj-zmiany-drzew -- ~/Pobrane/zmiany-drzew.json   # metadane i usuwanie drzew
  npm run zastosuj-edycje -- <slug> ~/Pobrane/edycje-<slug>.json   # osoby
  npm test && npm run build
  ```

  Skrypt najpierw sprawdza wszystkie zmiany, dopiero potem zapisuje `drzewo.json` i **kasuje katalogi usuniętych
  drzew** (`data/drzewa/<slug>/`). Usunięcie cofa się z historii gita. Ostatniego drzewa usunąć się nie da.

## Polityka prywatności

Strona `/polityka-prywatnosci/` (link w stopce) opisuje konta, drzewa publiczne i prywatne, osoby żyjące, pamięć przeglądarki
i prawa użytkowników (w tym usunięcie konta). Dane administratora wpisz w `data/serwis.json` – dopóki są puste, strona
pokazuje ogólną formułę bez danych kontaktowych:

```json
{ "administrator": { "nazwa": "Jan Kowalski", "email": "kontakt@example.org" } }
```

Treść jest w `app/polityka-prywatnosci/page.tsx`; przy zmianie popraw też datę `OBOWIAZUJE_OD`. To nie jest porada prawna –
przed udostępnieniem serwisu innym osobom warto ją przeczytać i dopasować do swojej sytuacji.

## Edycja osób

**Drzewa użytkowników** edytuje się w panelu osoby bezpośrednio w bazie (właściciel, kolaboranci, administrator):
„✏️ Edytuj dane” (w tym płeć i oznaczenie „żyjąca”, usunięcie osoby), „👶 Dodaj dziecko”, „💍 Dodaj małżonka”,
„👨 Dodaj ojca” / „👩 Dodaj matkę”. Bliskich można też dodawać przyciskami „+” na **stronie osoby**: rodzeństwo
(do 15; dostaje tych samych rodziców, więc wymaga co najmniej jednego rodzica), małżonek (do 4) i dziecko (do 15, z wyborem
drugiego rodzica), a także brakujący ojciec lub matka. Limity pilnuje logika zmian (`lib/baza/logika.ts`), nie tylko widok;
limit rodzeństwa liczy każdego, kto dzieli z osobą rodzica, a limit dzieci dotyczy każdego z rodziców osobno. Na stronie osoby jest też
przycisk „✏️ Edytuj dane” (okno z formularzem): oprócz imienia, nazwisk, dat, płci i notatki można w nim **zmienić rodziców** – z listy
z wyszukiwaniem. Domyślnie lista zawiera tylko wiarygodnych rodziców (`lib/rodzice.ts`): z poprzedniego pokolenia, nie młodszych od
edytowanej osoby (przy znanych datach co najmniej 12 lat starszych; gdy dat brak, rok szacuje się z rodziców i dzieci), niezmarłych przed jej
urodzeniem, bez samej osoby i jej potomków (ojciec: bez kobiet, matka: bez mężczyzn). Pole „Pokaż wszystkie osoby” wyłącza ograniczenia
pokolenia i dat, gdy w danych są błędy; gdy wybierzesz oboje rodziców, a nie są jeszcze
małżeństwem, zostaną połączeni w małżeństwo. W pustym drzewie pierwszą osobę dodaje formularz na stronie drzewa. Zmiana pojawia się
natychmiast, a zapis idzie w tle w transakcji (równoczesne edycje kolaborantów się nie nadpisują). Poniższy opis dotyczy
**drzew z repozytorium**, które edytuje tylko administrator serwisu i które działają **lokalnie w przeglądarce**: w panelu osoby
(lista i diagram) przyciski „✏️ Edytuj dane” (imię, nazwisko, nazwisko rodowe, daty urodzenia i śmierci
z miejscem, notatka) i „👶 Dodaj dziecko” (z wyborem drugiego rodzica spośród małżonków). Daty wpisuje się jako
`1891`, `4.03.1891`, `ok. 1891` albo `?` (data nieznana), opcjonalnie z miejscem po przecinku.
Bez roli administratora lokalne zmiany nie są nakładane na widok.

- Zmiany zapisują się w `localStorage` (klucz `edycje:<slug>`) i są nakładane na dane z repozytorium na liście
  i na diagramie; widzisz je tylko Ty, w tej przeglądarce. Strony osób, indeks i wyszukiwarka pokazują dane
  z repozytorium.
- Przycisk „Pobierz zmiany (JSON)” zapisuje plik `edycje-<slug>.json`. Żeby zmiany trafiły do serwisu:

  ```bash
  npm run zastosuj-edycje -- lulkiewicz ~/Pobrane/edycje-lulkiewicz.json
  npm test && npm run build
  ```

  Dla drzewa z importem (Lulkiewiczowie) zmiany lądują w `poprawki.json` (`osoby` i `dodane`) i import przelicza
  `rodzina.json`; dla pozostałych drzew skrypt zmienia `rodzina.json`. Poszerza też zakres lat i datę aktualizacji
  w `drzewo.json`.

## Lista gałęzi i diagram

Główny widok gałęzi to **lista w układzie „outline”**: jeden wiersz na osobę z rodu (małżonkowie w tej samej
linii), wcięcie według pokolenia z cienką linią prowadzącą, przycisk zwijania z licznikiem potomków („+36”).

- Domyślnie rozwinięte 3 pokolenia; przyciski „Rozwiń wszystko”, „Zwiń wszystko” i numery pokoleń
  („Zwiń do pokolenia N”).
- Klawiatura: ↑/↓ poruszają po wierszach, ←/→ zwijają i rozwijają (← na zwiniętym wierszu przechodzi do rodzica),
  Home/End, Enter otwiera panel osoby.
- Kliknięcie wiersza otwiera panel (z boku; na telefonie szuflada od dołu) z linkami do rodziców, małżonków
  i dzieci oraz przyciskami „Widok osoby” i „Pokaż na diagramie”.
- Wyszukiwarka z nagłówka rozwija ścieżkę przodków, przewija do wiersza i podświetla go (osoba z innej gałęzi
  otwiera listę jej gałęzi).
- Kolor kropki przy osobie oznacza **pokolenie** (ta sama paleta przy numerach pokoleń na belce); w widoku „Całe drzewo” cienki pasek z lewej pokazuje gałąź.
- Lista jest zwirtualizowana (`@tanstack/react-virtual`): w DOM jest tylko kilkadziesiąt wierszy.

Diagram (`@xyflow/react` + `d3-flextree`) jest widokiem dodatkowym. „Dopasuj do ekranu” i widok początkowy
dobierają powiększenie tak, by daty na kartach były czytelne bez przybliżania (≥ 0,9; na telefonie ≥ 0,8)
i by nad drzewem nie było pustego pola. Gdy całość się nie mieści, widok dopasowuje się do wybranej osoby
(albo korzenia) i pokazuje podpowiedź „użyj wyszukiwarki lub zwijania”.

### Wybór biblioteki do diagramu

Porównane zostały trzy podejścia na prawdziwych danych (427 osób, 303 „jednostki rodzinne”, 10 pokoleń):

| | family-chart 0.9 | @xyflow/react + dagre | @xyflow/react + elkjs | **@xyflow/react + d3-flextree** |
|---|---|---|---|---|
| Małżonkowie obok siebie | tak, wbudowane | tylko jako wspólny węzeł pary | jw. | jako wspólny węzeł pary |
| Kolejność dzieci (wg urodzenia) | tak | **gubiona w 37 z 92 rodzin** | wymaga ograniczeń | zachowana (0 z 92) |
| Rodzice nad środkiem dzieci | tak | nie: 32 z 92 rodzin >100 px obok | zależnie od algorytmu | tak (0 z 92) |
| Czas układu całego drzewa | — | 127 ms | asynchronicznie, worker | **3 ms** |
| Minimapa, zoom, „dopasuj” | brak | wbudowane | wbudowane | wbudowane |
| Rysuje tylko widoczne węzły | nie | tak | tak | tak |
| Rozmiar | ok. 100 kB + d3 | — | **1,6 MB** | kilka kB + d3-hierarchy |

Wybór: `@xyflow/react` (płótno, minimapa, dotyk, wirtualizacja) + `d3-flextree` (układ). Własny kod
(`lib/drzewo.ts`) tylko grupuje osoby w jednostki rodzinne (osoba z rodu + małżonkowie = jeden węzeł).

## Styl i dostępność

Styl „glass morphism”, jasny i ciemny motyw (domyślnie według `prefers-color-scheme`, przełącznik w nagłówku
zapamiętywany w `localStorage` w `try/catch`). Wszystkie kolory to zmienne CSS w `app/globals.css`.

- Rozmycie tła (`backdrop-filter`) tylko na kilku dużych powierzchniach: nagłówek, panel boczny, karty
  indeksów i okno widoku osoby. Wiersze listy i karty na płótnie mają zwykłe półprzezroczyste tło.
- Tekst nigdy nie leży bezpośrednio na gradiencie: zawsze na powierzchni (szkło, panel, pole).
  `npm run kontrast` liczy kontrast w najgorszym punkcie tła w obu motywach: tekst podstawowy ≥ 11:1,
  pomocniczy ≥ 6:1, linki i przyciski ≥ 5,6:1 (WCAG AA wymaga 4,5:1).
- Zapasowe style: bez `backdrop-filter`, przy `prefers-reduced-transparency` i `prefers-contrast: more`
  powierzchnie są jednolite i nieprzezroczyste, a plamy tła znikają.
- Animacje (hover, rozwijanie, panel) wyłącza `prefers-reduced-motion`.
- Fonty (Inter) pochodzą z pakietu `@fontsource-variable/inter` i są serwowane z tej samej domeny;
  strona nie wykonuje żadnych żądań do zewnętrznych serwerów, nie ma ciasteczek ani skryptów śledzących.
  Jedyny skrypt inline ustawia zapamiętany motyw przed pierwszym wyrenderowaniem strony.

## Wydajność

Test: `npm run generuj-testowe -- 1500` tworzy fikcyjne drzewo w `data/testowe/testowe-1500/` (katalog jest
w `.gitignore`), a `DRZEWA_KATALOG=data/testowe npm run build` buduje stronę tylko z nim – poza głównym buildem
produkcyjnym. Chromium, 1500 osób w 3 gałęziach (największa: 283 wiersze listy po „Rozwiń wszystko”):

| | okno 1440×900 | 4× spowolniony procesor | telefon 390×844, 4× wolniej |
|---|---|---|---|
| Wiersze w DOM (zwirtualizowane) | 40 | 40 | 28 |
| Przewijanie całej listy: mediana / 95. percentyl klatki | 7 / 9 ms | 11 / 16 ms | 13 / 20 ms |
| Otwarcie panelu osoby po kliknięciu | 75 ms | 319 ms | 351 ms |
| 20 × strzałka w dół (z fokusem) | 30 ms | 466 ms | 416 ms |
| Pierwsze wyświetlenie listy gałęzi | 0,1–0,2 s | 0,5–1,1 s | 0,5–1,1 s |

Na zwykłym komputerze lista Lulkiewiczów (gałąź Antoniego, 178 osób) mieści 25 wierszy bez przewijania
w oknie 1440×900.

## Wdrożenie

Wynikiem `npm run build` jest katalog `out/` z samymi plikami statycznymi. Domyślny sposób publikacji to
**Firebase Hosting**: każda zmiana na gałęzi `main` (także zrobiona w przeglądarce na github.com) uruchamia
workflow `.github/workflows/firebase.yml`, który uruchamia testy, buduje stronę i wdraża ją. Jeśli testy lub
walidacja danych nie przejdą, strona **nie** jest aktualizowana, a w zakładce *Actions* widać komunikat błędu.

### Wdrożenie na Firebase – jednorazowa konfiguracja (wszystko w przeglądarce)

1. W <https://console.firebase.google.com> utwórz projekt (plan Spark, darmowy) i zapisz jego **identyfikator**
   (Ustawienia projektu → Ogólne → „Identyfikator projektu”, np. `nasi-przodkowie`).
2. Wejdź w **Build → Hosting** i kliknij „Rozpocznij”; kroki z instalacją CLI możesz pominąć, ale zakończ kreator,
   żeby Hosting został włączony.
3. **Klucz konta serwisowego**: w Google Cloud (<https://console.cloud.google.com/iam-admin/serviceaccounts>,
   ten sam projekt) utwórz konto serwisowe z rolą **Firebase Hosting Admin**, potem *Klucze → Dodaj klucz →
   JSON* i pobierz plik.
4. W repozytorium na GitHubie: *Settings → Secrets and variables → Actions*:
   - zakładka **Secrets** → *New repository secret* o nazwie `FIREBASE_SERVICE_ACCOUNT`, wartość: **cała zawartość**
     pobranego pliku JSON,
   - zakładka **Variables** → *New repository variable* o nazwie `FIREBASE_PROJECT_ID`, wartość: identyfikator projektu.
   - (opcjonalnie, przy własnej domenie) zmienna `SITE_URL`, np. `https://przodkowie.example.org`.
5. Scal zmiany do `main` (albo uruchom ręcznie: *Actions → Wdrożenie na Firebase → Run workflow*).
   Po minucie strona jest pod adresem `https://<identyfikator>.web.app`.
6. Po wdrożeniu usuń pobrany plik JSON z komputera; klucz zostaje tylko w sekretach GitHuba.

Własną domenę dodaje się w Firebase: *Hosting → Dodaj domenę niestandardową*. Po wdrożeniu włącz konta użytkowników według sekcji „Konfiguracja Firebase” wyżej.

### Jak aktualizować stronę bez IDE

- **Drzewa użytkowników** nie wymagają żadnej aktualizacji strony – użytkownicy edytują je sami w przeglądarce.
- **Dane** (`data/drzewa/<slug>/…`, `data/serwis.json`): na github.com otwórz plik, kliknij ołówek, zapisz
  („Commit changes”) na `main`. Wdrożenie ruszy samo.
- **Zmiany drzew z repozytorium zrobione w panelu administratora**: pobrane pliki JSON stosuje się skryptami (`zastosuj-edycje`, `zastosuj-zmiany-drzew`),
  więc wymagają terminala – np. GitHub Codespaces (przycisk *Code → Codespaces* w repozytorium) albo sesja Claude Code.
- Własna domena i pozostałe sposoby hostingu: Vercel (import repozytorium, ustawienia domyślne), dowolny serwer
  plików (zawartość `out/`). Dla GitHub Pages potrzebny jest workflow z `NEXT_PUBLIC_BASE_PATH=/<repozytorium>`
  (strona działa wtedy w podkatalogu).
- Adresy w `sitemap.xml`, `robots.txt` i metadanych bierze się ze zmiennej `NEXT_PUBLIC_SITE_URL`
  (domyślnie `https://woocash88.github.io`).

## Struktura repozytorium

```
app/                    strony i układy (/, /drzewa, /drzewa/[drzewo]/…, /d, /profil, /logowanie, /rejestracja, /admin), sitemap.ts, robots.ts
components/             Naglowek, Wyszukiwarka, KatalogDrzew, ListaGalezi, PanelOsoby, PlotnoDrzewa, IndeksOsob, …
components/konta/       AuthProvider, MenuKonta, formularze logowania/rejestracji, PanelProfilu, HeroKonta
components/db/          WidokDrzewaDb (strona /d/), UstawieniaDrzewa, kontekst i hooki drzew z bazy
components/widoki/      widoki wspólne dla drzew z repozytorium i z bazy (osoba, strona drzewa, indeks osób)
lib/baza/               Firebase: firebase.ts (inicjalizacja), konta.ts, api.ts (Firestore), logika.ts (czyste zmiany drzewa), typy.ts
lib/dane-czyste.ts      okrajanie osób żyjących i struktury drzewa (bez plików – działa też w przeglądarce)
lib/dane.ts             drzewa z repozytorium – widoki statyczne czytają dane WYŁĄCZNIE stąd: pobierzDrzewa(), pobierzDrzewo(slug),
                        pobierzOsoby(slug), pobierzOsobe(slug, id), pobierzIndeksSzukania(slug); polityka dat
lib/drzewa-pliki.ts     odczyt plików drzew (Node) i walidacja metadanych – do podmiany przy przejściu na bazę
lib/schemat*.ts         schematy zod: osoba/rodzina oraz metadane drzewa
lib/walidacja.ts        spójność danych (rodzice, duplikaty, cykle)
lib/drzewo.ts           jednostki rodzinne, układ (d3-flextree), widok gałęzi
lib/lista.ts            wiersze listy, wcięcia, liczniki potomków, stan w adresie
lib/szukaj*.ts          wyszukiwanie osób i drzew (bez polskich znaków)
firestore.rules         reguły dostępu do bazy (testy: tests/reguly, npm run test:reguly)
scripts/                import.ts, waliduj.ts, generuj-testowe.ts, wytnij-zrodlo.mjs, kontrast.mjs, zastosuj-*.ts
data/drzewa/<slug>/     dane drzew
tests/                  testy (vitest); tests/reguly – reguły Firestore na emulatorze; tests/e2e – scenariusze Playwright na emulatorach
```

## Testy end-to-end

`npm run test:e2e` buduje stronę w trybie testowym (`NEXT_PUBLIC_FIREBASE_EMULATOR=1`), uruchamia emulatory Auth i Firestore
i przechodzi dwa scenariusze w Chromium (`tests/e2e/`): rejestracja i potwierdzenie e-maila, tworzenie drzewa i osób,
kolaborant, odwiedzający (brak dat osób żyjących w publicznym drzewie i w bazie), administrator, liczba zapytań do bazy (strona główna: zero; pamięć podręczna, leniwa wyszukiwarka), numery drzew, edycja osoby i rodziców ze strony osoby, usuwanie użytkownika
i drzewa, eksport i import JSON/GEDCOM, przeniesienie drzewa z repozytorium do bazy, usuwanie własnego konta, edycja profilu, prośby o dołączenie (zatwierdzanie i odrzucanie), przekazanie własności
i zachowanie drzewa po usunięciu konta, opuszczanie drzewa, zmiana adresu e-mail, logowanie hasłem do konta Google. Wymaga Javy i Playwrighta (`npm install --no-save playwright && npx playwright install chromium`).
Okno logowania Google pobiera skrypty z internetu, więc w testach używane jest sztuczne poświadczenie Google
(dostępne tylko w buildzie testowym); działanie samego okna Google trzeba sprawdzić ręcznie na wdrożonej stronie.

## Dalsze kroki

- **Firebase App Check** (reCAPTCHA) – ochrona bazy przed nadużyciami spoza strony.
- **Funkcje serwerowe** (plan Blaze): pełne usuwanie kont logowania przez administratora, powiadomienia e-mail o zaproszeniu
  do współpracy, ochrona przed masowym zakładaniem kont.
- **Import GEDCOM / JSON** do drzewa użytkownika oraz eksport drzewa.
- **Przeniesienie drzew z repozytorium do bazy**, żeby administrator edytował je tak jak drzewa użytkowników.
- **Moderacja**: zgłaszanie naruszeń i ukrywanie drzew publicznych do akceptacji.
