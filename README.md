# Nasi przodkowie – drzewa genealogiczne rodzin

Statyczna strona WWW (Next.js, eksport do plików HTML) z **wieloma drzewami genealogicznymi**.
Bez backendu, bez bazy danych, bez śledzenia i zewnętrznych skryptów; interfejs w całości po polsku.
Każde drzewo to osobny katalog z danymi w repozytorium. Widoki czytają dane tylko przez
`lib/dane.ts`, więc późniejsze przejście na bazę (Supabase – patrz „Dalsze kroki”) nie wymaga
przepisywania stron.

W repozytorium są dwa drzewa:

| slug | drzewo | uwagi |
|---|---|---|
| `lulkiewicz` | Rodzina Lulkiewiczów (427 osób, 10 pokoleń) | dane ze strony genealogia.okiem.pl |
| `przyklad` | Rodzina Przykładowskich (41 osób, 5 pokoleń, 2 gałęzie) | **fikcyjne**, oznaczone jako przykładowe; można je usunąć jednym commitem (`git rm -r data/drzewa/przyklad`) |

> **Zanim opublikujesz drzewo Lulkiewiczów:** jego dane pochodzą ze strony
> <https://genealogia.okiem.pl/drzewo/238/lulkiewicz>. Sprawdź regulamin tego serwisu
> (zasady kopiowania i ponownego publikowania danych) i w razie potrzeby uzyskaj zgodę opiekuna drzewa.
> Źródło i opiekun są na stronie drzewa i w stopce widoczne zawsze; to nie zastępuje zgody.

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
| `/admin/` | logowanie administratora i zarządzanie drzewami (bez linku w serwisie, poza indeksowaniem) |
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
npm test             # testy: parsowanie, walidacja, polityka dat, wyszukiwarki, lista
npm run lint         # eslint + kontrola typów
npm run waliduj      # walidacja drzew (opcjonalnie: -- <slug>)
npm run kontrast     # kontrola kontrastu WCAG motywów jasnego i ciemnego
npm run zastosuj-edycje -- <slug> <plik.json>   # wpisuje do danych zmiany osób pobrane z serwisu
npm run zastosuj-zmiany-drzew -- <plik.json>    # edycja metadanych i usuwanie drzew z panelu /admin/
npm run ustaw-haslo -- "haslo"                  # hasło trybu administratora
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
- `autor.url`, `przykladowe` (`true` oznacza drzewo fikcyjne – pokazywane z plakietką) i `wyrozniane`
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

## Tryb administratora

Zwykły odwiedzający widzi czysty interfejs do przeglądania. Narzędzia edycji są dostępne tylko po zalogowaniu
na stronie **`/admin/`** (nie ma do niej linku w serwisie; `robots.txt` wyłącza ją z indeksowania).

- **Hasło**: `npm run ustaw-haslo -- "moje-haslo"` (albo bez argumentu – skrypt wylosuje hasło i je wypisze).
  W `data/admin.json` zapisuje się tylko skrót PBKDF2 z solą. Po zmianie hasła zbuduj i wdróż stronę;
  dotychczasowe sesje wygasają. Pusty skrót wyłącza tryb administratora.
- **Co widzi administrator**: przycisk „Administracja” w nagłówku, w panelu osoby przyciski „✏️ Edytuj dane”
  i „👶 Dodaj dziecko”, a na `/admin/` listę drzew z akcjami „Edytuj osoby”, „Edytuj drzewo” (nazwa, opis, region,
  źródło, opiekun, polityka dat osób żyjących, wyróżnienie) i „Usuń drzewo”.
- **Publikacja zmian drzew**: przycisk „Pobierz zmiany drzew (JSON)”, a potem

  ```bash
  npm run zastosuj-zmiany-drzew -- ~/Pobrane/zmiany-drzew.json
  npm test && npm run build
  ```

  Skrypt najpierw sprawdza wszystkie zmiany, dopiero potem zapisuje `drzewo.json` i **kasuje katalogi usuniętych
  drzew** (`data/drzewa/<slug>/`). Usunięcie cofa się z historii gita. Ostatniego drzewa usunąć się nie da.
- **To nie jest zabezpieczenie danych.** Serwis jest statyczny, więc hasło jest sprawdzane w przeglądarce,
  a skrót i kod są w publicznych plikach strony. Tryb administratora tylko chowa narzędzia przed zwykłymi
  użytkownikami. Niczego nie da się nim zmienić w opublikowanym serwisie: zmiany powstają lokalnie i trafiają
  do serwisu wyłącznie przez repozytorium – faktyczną kontrolą dostępu jest prawo zapisu do repozytorium.
  Logowanie z kontami po stronie serwera opisują „Dalsze kroki”.

## Polityka prywatności

Strona `/polityka-prywatnosci/` (link w stopce). Dane administratora i nazwę dostawcy hostingu wpisz
w `data/serwis.json` – dopóki są puste, strona pokazuje ogólną formułę bez danych kontaktowych:

```json
{ "administrator": { "nazwa": "Jan Kowalski", "email": "kontakt@example.org" }, "hosting": "Vercel Inc." }
```

Treść jest w `app/polityka-prywatnosci/page.tsx`; przy zmianie popraw też datę `OBOWIAZUJE_OD`.

## Edycja osób

Edycja jest narzędziem administratora (patrz wyżej) i działa **lokalnie w przeglądarce**: w panelu osoby
(lista i diagram) przyciski „✏️ Edytuj dane” (imię, nazwisko, nazwisko rodowe, daty urodzenia i śmierci
z miejscem, notatka) i „👶 Dodaj dziecko” (z wyborem drugiego rodzica spośród małżonków). Daty wpisuje się jako
`1891`, `4.03.1891`, `ok. 1891` albo `?` (data nieznana), opcjonalnie z miejscem po przecinku.
Bez trybu administratora lokalne zmiany nie są nakładane na widok.

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
- Prawdziwa edycja wspólna dla wszystkich odwiedzających wymaga serwera i kont – patrz „Dalsze kroki”.

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
   ten sam projekt) utwórz konto serwisowe z rolami **Firebase Hosting Admin** i **Service Usage Consumer**, potem *Klucze → Dodaj klucz →
   JSON* i pobierz plik. W projekcie muszą być włączone API: Firebase Management, Firebase Hosting i Cloud Resource Manager.
4. W repozytorium na GitHubie: *Settings → Secrets and variables → Actions*:
   - zakładka **Secrets** → *New repository secret* o nazwie `FIREBASE_SERVICE_ACCOUNT`, wartość: **cała zawartość**
     pobranego pliku JSON,
   - zakładka **Variables** → *New repository variable* o nazwie `FIREBASE_PROJECT_ID`, wartość: identyfikator projektu.
   - (opcjonalnie, przy własnej domenie) zmienna `SITE_URL`, np. `https://przodkowie.example.org`.
5. Scal zmiany do `main` (albo uruchom ręcznie: *Actions → Wdrożenie na Firebase → Run workflow*).
   Po minucie strona jest pod adresem `https://<identyfikator>.web.app`.
6. Po wdrożeniu usuń pobrany plik JSON z komputera; klucz zostaje tylko w sekretach GitHuba.

Własną domenę dodaje się w Firebase: *Hosting → Dodaj domenę niestandardową*.

### Jak aktualizować stronę bez IDE

- **Dane** (`data/drzewa/<slug>/…`, `data/serwis.json`): na github.com otwórz plik, kliknij ołówek, zapisz
  („Commit changes”) na `main`. Wdrożenie ruszy samo.
- **Zmiany z panelu `/admin/`**: pobrane pliki JSON stosuje się skryptami (`zastosuj-edycje`, `zastosuj-zmiany-drzew`),
  więc wymagają terminala – np. GitHub Codespaces (przycisk *Code → Codespaces* w repozytorium) albo sesja Claude Code.
- Własna domena i pozostałe sposoby hostingu: Vercel (import repozytorium, ustawienia domyślne), dowolny serwer
  plików (zawartość `out/`). Dla GitHub Pages potrzebny jest workflow z `NEXT_PUBLIC_BASE_PATH=/<repozytorium>`
  (strona działa wtedy w podkatalogu).
- Adresy w `sitemap.xml`, `robots.txt` i metadanych bierze się ze zmiennej `NEXT_PUBLIC_SITE_URL`
  (domyślnie `https://woocash88.github.io`).

## Struktura repozytorium

```
app/                    strony i układy (/, /drzewa, /drzewa/[drzewo]/…), sitemap.ts, robots.ts, dane/[plik] (indeks wyszukiwania)
components/             Naglowek, Wyszukiwarka, KatalogDrzew, KartaDrzewa, ListaGalezi, PanelOsoby, PlotnoDrzewa, IndeksOsob, …
lib/dane.ts             JEDYNE miejsce, z którego widoki czytają dane: pobierzDrzewa(), pobierzDrzewo(slug),
                        pobierzOsoby(slug), pobierzOsobe(slug, id), pobierzIndeksSzukania(slug); polityka dat
lib/drzewa-pliki.ts     odczyt plików drzew (Node) i walidacja metadanych – do podmiany przy przejściu na bazę
lib/schemat*.ts         schematy zod: osoba/rodzina oraz metadane drzewa
lib/walidacja.ts        spójność danych (rodzice, duplikaty, cykle)
lib/drzewo.ts           jednostki rodzinne, układ (d3-flextree), widok gałęzi
lib/lista.ts            wiersze listy, wcięcia, liczniki potomków, stan w adresie
lib/szukaj*.ts          wyszukiwanie osób i drzew (bez polskich znaków)
scripts/                import.ts, waliduj.ts, generuj-testowe.ts, wytnij-zrodlo.mjs, kontrast.mjs
data/drzewa/<slug>/     dane drzew
tests/                  testy (vitest)
```

## Dalsze kroki: konta i formularz (Supabase)

Plan na wersję, w której użytkownik może sam dodać drzewo. **Nic z tego nie jest jeszcze zaimplementowane.**

1. **Warstwa danych.** Przepisać tylko `lib/dane.ts` (i `lib/drzewa-pliki.ts`): funkcje `pobierz*()` są już
   asynchroniczne, więc widoki się nie zmieniają. Tabele: `drzewa` (pola z `drzewo.json` + `wlasciciel_id`,
   `widocznosc`), `galezie`, `osoby` (klucz `(drzewo_id, id)`), `malzenstwa`. Polityka dat osób żyjących
   dalej stosowana w `okroj()` po stronie serwera – nigdy w przeglądarce.
2. **Konta.** Supabase Auth (e-mail + link, opcjonalnie Google). Row Level Security: właściciel czyta i zapisuje
   swoje drzewa; wszyscy czytają drzewa `publiczne`, ale tylko przez widok z już okrojonymi danymi osób żyjących.
3. **Formularz „Dodaj drzewo”.** Kreator: metadane → import pliku (JSON z szablonu, GEDCOM, tekst) → podgląd
   z raportem błędów (ta sama walidacja `lib/walidacja.ts`, uruchamiana także po stronie bazy) → publikacja.
   Edycja osób w tabeli i na liście gałęzi.
4. **Moderacja i prywatność.** Nowe drzewa trafiają najpierw jako `robocze`, publikacja po akceptacji; zgłaszanie
   naruszeń; domyślnie „ukryj” dla osób żyjących; możliwość usunięcia drzewa i eksportu danych.
5. **Budowanie stron.** Strony drzew są dziś w pełni statyczne. Po przejściu na bazę: ISR (przebudowa strony
   drzewa po zmianie) albo renderowanie na żądanie; indeks wyszukiwania per drzewo generowany przy zapisie.
6. **Migracja.** Skrypt wczytujący `data/drzewa/*` do bazy, żeby drzewa z repozytorium trafiły tam bez zmian
   identyfikatorów (adresy `/drzewa/<slug>/osoba/<id>/` muszą zostać takie same).
