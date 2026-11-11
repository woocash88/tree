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
