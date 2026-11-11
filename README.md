# Drzewo genealogiczne rodziny Lulkiewiczów

Statyczna strona WWW (Next.js, eksport do plików HTML) prezentująca drzewo genealogiczne
w stylu starej księgi rodowej. Bez backendu, bez bazy danych, bez śledzenia.

## Plan

1. **Dane** – jedno źródło prawdy `data/rodzina.json`, schemat zod, walidacja przy buildzie,
   import z tekstu źródłowego z raportem niejasności i ręcznymi poprawkami.
2. **Widok osoby i indeks** – strony w pełni statyczne (`/osoba/[id]`, `/osoby`), wyszukiwarka.
3. **Płótno drzewa** – `/drzewo` i `/drzewo/[galaz]`: przesuwanie, zoom, minimapa, zwijanie pokoleń,
   panel boczny, stan w adresie URL.
4. **Strona główna, dopracowanie stylu, test na 600 osobach, przegląd w przeglądarce.**

## Wybór biblioteki do rysowania drzewa

Porównane zostały trzy podejścia, na prawdziwych danych (427 osób, 303 „jednostki rodzinne”, 10 pokoleń):

| | family-chart 0.9 | @xyflow/react + dagre | @xyflow/react + elkjs | **@xyflow/react + d3-flextree** |
|---|---|---|---|---|
| Małżonkowie obok siebie | tak, wbudowane | tylko jako wspólny węzeł pary | jw. (albo węzły złożone) | jako wspólny węzeł pary |
| Kolejne małżeństwa | tak | jw. | jw. | jw. |
| Kolejność dzieci (wg urodzenia) | tak | **gubiona w 37 z 92 rodzin** | wymaga dodatkowych ograniczeń | zachowana (0 z 92) |
| Rodzice nad środkiem dzieci | tak | nie: 32 z 92 rodzin >100 px obok | zależnie od algorytmu | tak (0 z 92) |
| Czas układu całego drzewa | — | 127 ms | asynchronicznie, worker | **3 ms** |
| Minimapa, przyciski zoomu, „dopasuj” | brak – trzeba dopisać | wbudowane | wbudowane | wbudowane |
| Gesty dotykowe, klawiatura | częściowo | tak | tak | tak |
| Rysuje tylko widoczne węzły (600+ osób) | nie | tak | tak | tak |
| Rozmiar | ok. 100 kB + d3 | — | **1,6 MB** | kilka kB + d3-hierarchy |

Wnioski:

- **family-chart** najlepiej „rozumie” genealogię, ale jest widokiem skupionym na jednej osobie
  (przodkowie i potomkowie wskazanej osoby), rysuje wszystko imperatywnie przez d3, nie ma minimapy
  ani wirtualizacji i trudno go pogodzić z własnymi kartami w React, panelem bocznym i stanem w URL.
- **dagre** i **elkjs** to układy dla dowolnych grafów skierowanych. Dla drzewa potomków są zbyt ogólne:
  dagre przestawia rodzeństwo (minimalizuje przecięcia, których w drzewie i tak nie ma) i nie centruje
  rodziców nad dziećmi; elkjs jest ciężki i asynchroniczny.
- Drzewo potomków z małżonkami da się sprowadzić do **lasu „jednostek rodzinnych”**
  (osoba z rodu + jej małżonkowie = jeden węzeł, dzieci pod parą). Dla lasu właściwym, gotowym
  algorytmem jest „tidy tree” dla węzłów o różnej szerokości – **d3-flextree**.

**Wybór: `@xyflow/react` (płótno: pan/zoom, minimapa, dotyk, wirtualizacja) + `d3-flextree` (układ).**
Algorytm układu nie jest pisany od zera; własny kod (`lib/drzewo.ts`) tylko grupuje osoby w jednostki
i rozmieszcza karty wewnątrz jednej pary. Widok osoby (`/osoba/[id]`) to zwykła siatka CSS – nie
potrzebuje biblioteki grafowej, dzięki czemu jest w pełni statyczny i lekki na telefonie.

## Uruchomienie lokalne

Wymagany Node.js 20 lub nowszy.

```bash
npm install
npm run dev        # tryb deweloperski: http://localhost:3000
npm run build      # walidacja danych + statyczny eksport do katalogu out/
npm start          # podgląd zbudowanej strony z katalogu out/
npm test           # testy importu, walidacji i formatowania
npm run lint       # eslint + kontrola typów
```

## Wdrożenie

Wynikiem `npm run build` jest katalog `out/` z samymi plikami statycznymi.

- **Vercel**: zaimportuj repozytorium; ustawienia domyślne (framework Next.js, polecenie `npm run build`)
  wystarczą, katalog `out/` zostanie wykryty automatycznie.
- **GitHub Pages**: w repozytorium jest gotowy workflow `.github/workflows/pages.yml`. Włącz
  *Settings → Pages → Source: GitHub Actions* i wypchnij gałąź `main`. Workflow ustawia
  `NEXT_PUBLIC_BASE_PATH=/<nazwa-repozytorium>`, bo strona działa wtedy w podkatalogu.
  Przy własnej domenie albo repozytorium `<użytkownik>.github.io` usuń tę zmienną.
- **Dowolny serwer plików**: skopiuj zawartość `out/`.

## Dane

Jedynym źródłem prawdy jest `data/rodzina.json`. Plik jest sprawdzany schematem zod
(`lib/schemat.ts`) i regułami spójności (`lib/walidacja.ts`) przed każdym buildem. Błąd zatrzymuje
build z komunikatem wskazującym osobę, np.:

```
✖ Plik data/rodzina.json zawiera błędy – build zatrzymany.
  • Zduplikowane id osoby: "jan-kowalski-1560" (Jan Kowalski).
  • Osoba "piotr-kowalski-1891" (Piotr Kowalski): brakujący rodzic – ojciecId = "x-y" nie istnieje na liście osób.
  • Cykl w pokrewieństwie: jan → anna → piotr → jan (każda kolejna osoba jest rodzicem poprzedniej).
```

Mały, kompletny przykład formatu: `data/przyklad.json`.

> **Uwaga:** `data/rodzina.json` jest generowany przez import (patrz niżej). W tym projekcie zmiany
> wprowadzaj przez `data/poprawki.json` albo w źródle – ręczna edycja `rodzina.json` zostanie
> nadpisana przy następnym `npm run import` (pilnuje tego test). Jeśli zrezygnujesz z importu,
> edytuj `rodzina.json` bezpośrednio według opisu poniżej.

### Jak dodać osobę

1. Dopisz obiekt do tablicy `osoby`:

   ```json
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
     "galazId": "antoni",
     "notatka": "Dowolny krótki tekst."
   }
   ```

2. Zasady:
   - `id` – unikalne, małe litery bez polskich znaków, cyfry i łączniki. Jest częścią adresu
     (`/osoba/jan-kowalski-1891`), więc po publikacji go nie zmieniaj.
   - `plec`: `"M"`, `"K"` albo `"nieznana"`.
   - Data: `wartosc` to `"RRRR"` albo `"RRRR-MM-DD"`, `dokladnosc` to `"dokladna"` (pełna data),
     `"rok"`, `"okolo"` albo `"nieznana"` (wtedy bez `wartosc`). Opcjonalnie `miejsce`.
     Na stronie: „ok. 1560–1610”, „1891–1973”, „ur. 4.03.1953”.
   - `smierc` pomiń, jeśli nic o niej nie wiadomo; `{ "dokladnosc": "nieznana" }` oznacza
     „zmarł(a), data nieznana”.
   - `ojciecId` / `matkaId` – id rodziców albo `null`.
   - Opcjonalne: `nazwiskoRodowe`, `miejsce`, `notatka`, `niepewne` (lista z: `imie`, `nazwisko`,
     `wpis`, `miejsce`, `rodzice`, `plec`), `ukryjDaty`.
   - `"ukryjDaty": true` dla osób żyjących: strona pokazuje wtedy tylko imię i nazwisko, a dat,
     miejsc i notatki nie ma w ogóle w zbudowanych plikach. Nie wpisuj wtedy roku do `id`.
     (Sam plik `rodzina.json` nadal zawiera te dane – jeśli repozytorium jest publiczne, rozważ
     usunięcie dat osób żyjących ze źródła.)
3. Kolejność osób w pliku = kolejność rodzeństwa w drzewie.
4. Uruchom `npm run waliduj`.

### Jak dodać małżeństwo

Dopisz do tablicy `malzenstwa`:

```json
{ "osobaAId": "jan-kowalski-1891", "osobaBId": "anna-nowak", "kolejnosc": 1 }
```

`kolejnosc` to numer związku (1, 2, …) osoby, która miała ich kilka. Dzieci trafiają pod właściwą
parę na podstawie swoich pól `ojciecId` i `matkaId`. Małżonek spoza rodu to zwykła osoba bez
rodziców, z tą samą `galazId` co partner.

### Jak dodać gałąź

1. Dopisz do tablicy `galezie`:

   ```json
   { "id": "nowakowie", "nazwa": "Nowakowie", "kolor": "#2b3f66", "opis": "Krótki opis gałęzi." }
   ```

   Kolor powinien być stonowany i ciemny (kontrast z białym tekstem co najmniej 4,5:1).
2. Ustaw `"galazId": "nowakowie"` u osób tej gałęzi.
3. Gałąź dostaje automatycznie kafelek na stronie głównej, pozycję w legendzie i adres
   `/drzewo/nowakowie`. Gałęzie nie muszą być ze sobą połączone – osoba bez rodziców, która nie
   jest niczyim małżonkiem, zaczyna osobne drzewo.

## Import danych źródłowych

Dane pochodzą ze strony <https://genealogia.okiem.pl/drzewo/238/lulkiewicz>.

```bash
curl -L -o /tmp/strona.html https://genealogia.okiem.pl/drzewo/238/lulkiewicz
node scripts/wytnij-zrodlo.mjs /tmp/strona.html   # → data/zrodlo/lulkiewicz.txt (+ dosłowny fragment HTML)
npm run import                                    # → data/rodzina.json + data/import-raport.md
```

- `data/zrodlo/lulkiewicz.pre.html` – blok `<pre>` ze strony, bajt w bajt.
- `data/zrodlo/lulkiewicz.txt` – ten sam tekst po mechanicznej zamianie `<br>` na nowe wiersze
  i usunięciu znaczników. To z niego czyta `scripts/import.ts`.
- `data/import-raport.md` – wszystko, czego nie dało się odczytać jednoznacznie, z numerem wiersza.
- `data/poprawki.json` – ręczne poprawki nakładane **po** imporcie (ponowny import ich nie kasuje).
  Przykład (wpis `scal` jest tu tylko ilustracją – w repozytorium lista scaleń jest pusta):

  ```json
  {
    "osoby": {
      "aukasz-mocek": { "imie": "Łukasz", "plec": "M" }
    },
    "scal": [{ "zostaw": "piotr-matysiak-2", "usun": "piotr-matysiak" }]
  }
  ```

  `osoby`: id → pola do nadpisania (`null` usuwa pole opcjonalne). `scal`: łączy dwa wpisy tej samej
  osoby w jeden. Nieistniejące id zatrzymuje import, żeby nieaktualna poprawka nie przeszła niezauważona.

Jak import czyta źródło:

- rodzic = ostatnia wcześniejsza osoba o numerze pokolenia o 1 mniejszym (wcięcie służy do kontroli);
- `=a4` / `=b4` → dziecko z 1. / 2. związku; bez litery i przy jednym związku drugi rodzic to ten
  małżonek; bez litery przy kilku związkach drugi rodzic zostaje pusty (raport);
- `ojciec:` / `matka:` / `Mother:` po małżonku → pole `notatka` małżonka;
- `??`, `?` → pole `niepewne`;
- płeć z listy imion (`scripts/imiona.ts`); imię spoza listy trafia do raportu;
- `id` = imię-nazwisko-rok urodzenia (bez roku u osób żyjących), przy powtórzeniach `-2`, `-3`;
- gałęzie: dzieci Wiktora (pokolenie 3) zaczynają siedem linii, pokolenia 1–2 to „Wspólny pień”;
- `ukryjDaty` = urodzenie po 1925 r. i brak informacji o śmierci.

## Wydajność

Sprawdzone na wygenerowanym zestawie 600 osób (`npm run generuj-testowe`, potem
`RODZINA_PLIK=data/testowe-600.json npm run build`), Chromium, okno 1440×900:

| | 427 osób (Lulkiewiczowie) | 600 osób (testowe) |
|---|---|---|
| Układ całego drzewa (d3-flextree) | ok. 3 ms | nie mierzono osobno |
| Przesuwanie w pełni rozwiniętego drzewa | 60 kl./s | 60 kl./s (16,7 ms na klatkę) |
| To samo przy 4× spowolnionym procesorze | mediana 16,7 ms, pojedyncze klatki do 150 ms | jw. |
| „Rozwiń wszystko” przy 4× spowolnieniu | ok. 1,5 s | ok. 1,2 s |

Płótno rysuje tylko węzły widoczne na ekranie, a indeks wyszukiwania (ok. 40 kB) jest pobierany
dopiero przy pierwszym użyciu wyszukiwarki.

## Struktura

```
app/                    strony: /, /drzewo, /drzewo/[galaz], /osoba/[id], /osoby, /dane/szukaj.json
components/             Wyszukiwarka, PlotnoDrzewa, PanelOsoby, IndeksOsob, KartaOsoby, …
lib/schemat.ts          schemat zod i typy
lib/walidacja.ts        spójność danych (rodzice, duplikaty, cykle)
lib/dane.ts             wczytanie danych przy buildzie, okrojenie danych osób żyjących
lib/drzewo.ts           jednostki rodzinne + układ (d3-flextree)
lib/szukaj.ts           wyszukiwanie bez polskich znaków
scripts/import.ts       import ze źródła     scripts/waliduj.ts   walidacja przed buildem
scripts/generuj-testowe.ts  duży zestaw testowy
data/                   rodzina.json, poprawki.json, import-raport.md, przyklad.json, zrodlo/
```

Fonty (EB Garamond, Source Sans 3) są dołączone z pakietów `@fontsource` i serwowane z tej samej
domeny – strona nie wykonuje żadnych żądań do zewnętrznych serwerów.
