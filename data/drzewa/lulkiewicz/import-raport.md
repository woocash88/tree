# Raport importu

Plik generowany przez `npm run import` – nie edytuj go ręcznie.
Zawiera wszystko, czego skrypt nie potrafił jednoznacznie odczytać z pliku źródłowego (`zrodlo/<slug>.txt`).
Poprawki wpisuj do `poprawki.json` drzewa (opis w README), a następnie uruchom import ponownie.

## Podsumowanie

- Wiersze źródła: **304** (z numerem pokolenia: 303, bez numeru: 1).
- Wzmianki o małżonkach (znak „+”): **125**.
- Osoby scalone (odsyłacze „[n]” i sekcja „scal”): **1**.
- Osoby w `rodzina.json`: **427** = 303 + 125 − 1.
- Małżeństwa: **125**, pokolenia: **10**, gałęzie: **8** (w tym wspólny pień).
- Osoby z flagą `zyjaca` (ur. po 1925, bez daty śmierci): **59**.
- Zastosowane poprawki ręczne: **2** osób, **0** scaleń.

## Wiersze bez numeru pokolenia

- **Wiersz 177:** „2nd Wife of Wiktor Lulkiewicz + Koleta Adamczewska  ur. ok. 1855   ojciec: Ignacy Adamczewski matka: Urszula Adamczewska” – wiersz bez numeru pokolenia. Małżeństwo nr 2 przypisano najbliższej poprzedzającej osobie o tym imieniu i nazwisku: wiersz 170 („wiktor-lulkiewicz-1844”). Inni kandydaci o tym samym imieniu i nazwisku: wiersz 2 (wiktor-lulkiewicz-1780), wiersz 6 (wiktor-lulkiewicz-1834).
- **Wiersz 178:** Agnieszka Lulkiewicz („agnieszka-lulkiewicz-1845”) stoi pod wierszem bez numeru (177). Według numeru pokolenia (=4) i wcięcia rodzicem jest Wojciech Lulkiewicz („wojciech-lulkiewicz-1819”) i tak zapisano; rodziców oznaczono jako niepewnych.
- **Wiersz 179:** Antoni Lulkiewicz („antoni-lulkiewicz-1846”) stoi pod wierszem bez numeru (177). Według numeru pokolenia (=4) i wcięcia rodzicem jest Wojciech Lulkiewicz („wojciech-lulkiewicz-1819”) i tak zapisano; rodziców oznaczono jako niepewnych.
- **Wiersz 180:** Wojciech Lulkiewicz („wojciech-lulkiewicz-1848”) stoi pod wierszem bez numeru (177). Według numeru pokolenia (=4) i wcięcia rodzicem jest Wojciech Lulkiewicz („wojciech-lulkiewicz-1819”) i tak zapisano; rodziców oznaczono jako niepewnych.
- **Wiersz 181:** Józef Lulkiewicz („jozef-lulkiewicz-1850”) stoi pod wierszem bez numeru (177). Według numeru pokolenia (=4) i wcięcia rodzicem jest Wojciech Lulkiewicz („wojciech-lulkiewicz-1819”) i tak zapisano; rodziców oznaczono jako niepewnych.

## Nieregularne wcięcia

- **Wiersz 287:** Znacznik pokolenia w kolumnie 29, a pod rodzicem z wiersza 286 oczekiwano kolumny 27. Rodzica ustalono według numeru pokolenia (=9): Martyna Hop.

## Prawdopodobne duplikaty

- **Wiersz 119:** Maksymilian Wabiński z odsyłaczem „[1]” występuje też w wierszu 108 (to samo imię, nazwisko i data urodzenia). Potraktowano jako JEDNĄ osobę („maksymilian-wabinski-1863”) z kolejnym małżeństwem. Kolejność związków przyjęto według kolejności wierszy – źródło jej nie podaje.
- **Wiersz 147:** Józef Buczkiewicz, ur. 1880-03-05 („jozef-buczkiewicz-1880-2”) – to samo imię, nazwisko i data urodzenia co w wierszu 146 („jozef-buczkiewicz-1880”). Zachowano oba wpisy.
- **Wiersz 241:** Para „Piotr Matysiak + Zofia Rybacka” występuje też w wierszu 201. Być może to te same osoby (małżeństwo dwojga potomków): „piotr-matysiak-2” ≟ „piotr-matysiak”, „zofia-rybacka-2” ≟ „zofia-rybacka”. Nie scalono – w razie potrzeby użyj sekcji „scal” w poprawki.json.

## Podejrzane literówki i utracone polskie znaki

- **Wiersz 2:** Nierozpoznane imię „Kungeunda” (Kungeunda Pernaczyńska). Może chodzi o „Kunegunda”?
- **Wiersz 42:** Nierozpoznane imię „Michel” (Michel Maćkowiak). Może chodzi o „Michał”?
- **Wiersz 43:** Nierozpoznane imię „Nicol” (Nicol Maćkowiak).
- **Wiersz 65:** Nierozpoznane imię „Aukasz” (Aukasz Mocek). Prawdopodobnie utracony znak „Ł”: „Łukasz”?
- **Wiersz 114:** Nierozpoznane imię „Wiech” (Wiech Gerber).
- **Wiersz 127:** Nierozpoznane imię „Prazevis” (Prazevis Siberna).
- **Wiersz 129:** Miejsce pisane małą literą: „kobylin” (zachowano bez zmian).
- **Wiersz 227:** Nierozpoznane imię „Boniu” (Boniu Grocholski).
- **Wiersz 260:** Nazwisko „Aenski” (Marian) – prawdopodobnie utracony znak „Ł”: „Łenski”?
- **Wiersz 261:** Nazwisko „Aenska” (Joanna) – prawdopodobnie utracony znak „Ł”: „Łenska”?
- **Wiersz 269:** Nierozpoznane imię „Aukasz” (Aukasz Zemboldt). Prawdopodobnie utracony znak „Ł”: „Łukasz”?
- **Wiersz 273:** Nazwisko „Zemoldt” (Beata) różni się nieznacznie od nazwiska rodzica „Zemboldt” – literówka?
- **Wiersz 285:** Nazwisko „Aazińska” (Wioletta) – prawdopodobnie utracony znak „Ł”: „Łazińska”?

## Niejednoznaczni rodzice

- **Wiersz 278:** Anna Zemboldt („anna-zemboldt”): rodzic Krzysztof Zemboldt ma 2 związki, a wiersz nie ma wariantu a/b. Drugi rodzic pozostał pusty.
- **Wiersz 279:** Marta Zemboldt („marta-zemboldt”): rodzic Krzysztof Zemboldt ma 2 związki, a wiersz nie ma wariantu a/b. Drugi rodzic pozostał pusty.

## Sprzeczności i nietypowe dane

- **Wiersz 166:** Dziecko ze związku nr 2 (ur. 1840-05-06) jest starsze niż dziecko ze związku nr 1 (ur. 1842-09-18) – rodzic „jozefa-lulkiewicz-1817”. Być może numery związków są zamienione.
- **Wiersz 286:** Martyna Hop („martyna-hop”) nosi inne nazwisko niż rodzice (Paweł Gregor i Wioletta Aazińska).

## Wpisy oznaczone w źródle jako niepewne ("??", "?")

- **Wiersz 8:** Nieznane imię („??”): „?? Paterek”.
- **Wiersz 17:** Nieznane imię („??”): „?? Lasota”.
- **Wiersz 33:** Nieznane nazwisko („??”): „Mieczysława ??”.
- **Wiersz 34:** Nieznane nazwisko („??”): „Teresa ??”.
- **Wiersz 44:** Nieznane nazwisko („??”): „Gizela ??”.
- **Wiersz 56:** Nieznane nazwisko („??”): „Hanna ??”.
- **Wiersz 60:** Wpis niepewny („?” po nazwisku): „Mikołaj Welzer?”.
- **Wiersz 62:** Nieznane imię („??”): „?? Mocek”.
- **Wiersz 80:** Nieznane imię („??”): „?? Skalski”.
- **Wiersz 88:** Nieznane imię („??”): „?? Stanisławski”.
- **Wiersz 93:** Niepewne miejsce: „Jutrosin?”.
- **Wiersz 133:** Nieznane imię („??”): „?? Jarczyński”.
- **Wiersz 151:** Nieznane imię („??”): „?? Buczkiewicz”.
- **Wiersz 152:** Nieznane imię („??”): „?? Buczkiewicz”.
- **Wiersz 153:** Nieznane imię („??”): „?? Buczkiewicz”.
- **Wiersz 193:** Nieznane imię („??”): „?? Rybacka”.
- **Wiersz 198:** Nieznane imię („??”): „?? Grzybek”.
- **Wiersz 218:** Nieznane imię („??”): „?? Smykowska”.
- **Wiersz 238:** Nieznane nazwisko („??”): „Halina ??”.
- **Wiersz 277:** Nieznane nazwisko („??”): „Lucyna ??”.
- **Wiersz 281:** Nieznane imię („??”): „?? Ciechoń”.
- **Wiersz 287:** Nieznane nazwisko („??”): „Tomasz ??”.

## Płeć nieustalona lub ustalona z kontekstu

- **Wiersz 8:** NN Paterek („nn-paterek”): płeć przyjęta jako przeciwna do płci małżonka (Helena Lulkiewicz).
- **Wiersz 17:** NN Lasota („nn-lasota”): płeć przyjęta jako przeciwna do płci małżonka (Maria Lulkiewicz).
- **Wiersz 42:** Michel Maćkowiak („michel-mackowiak”): płci nie da się ustalić z imienia ani nazwiska.
- **Wiersz 43:** Nicol Maćkowiak („nicol-mackowiak”): płci nie da się ustalić z imienia ani nazwiska.
- **Wiersz 62:** NN Mocek („nn-mocek”): płeć przyjęta jako przeciwna do płci małżonka (Miła Welzer).
- **Wiersz 114:** Wiech Gerber („wiech-gerber”): płeć przyjęta jako przeciwna do płci małżonka (Helena Biskupska).
- **Wiersz 127:** Prazevis Siberna („prazevis-siberna-1867”): płci nie da się ustalić z imienia ani nazwiska.
- **Wiersz 151:** NN Buczkiewicz („nn-buczkiewicz-1886”): płci nie da się ustalić z imienia ani nazwiska.
- **Wiersz 152:** NN Buczkiewicz („nn-buczkiewicz-1889”): płci nie da się ustalić z imienia ani nazwiska.
- **Wiersz 153:** NN Buczkiewicz („nn-buczkiewicz-1891”): płci nie da się ustalić z imienia ani nazwiska.
- **Wiersz 198:** NN Grzybek („nn-grzybek”): płeć przyjęta jako przeciwna do płci małżonka (Helena Rybacka).
- **Wiersz 227:** Boniu Grocholski („boniu-grocholski”): płci nie da się ustalić z imienia ani nazwiska.
- **Wiersz 281:** NN Ciechoń („nn-ciechon”): płeć przyjęta jako przeciwna do płci małżonka (Iwona Tomaszewska).

## Pozostałe uwagi parsera

- **Wiersz 108:** Odsyłacz „[1]” przy małżonku Maksymilian Wabiński – osoba może występować w kilku wierszach.
- **Wiersz 170:** Nazwisko dwuczłonowe „Meller - Adamczewska” zapisano jako „Meller-Adamczewska”.
- **Wiersz 276:** Wariant „=a7”, choć Antoni Zemboldt ma w źródle tylko jeden związek.
- **Wiersz 277:** Wariant „=a7”, choć Antoni Zemboldt ma w źródle tylko jeden związek.
- **Wiersz 280:** Wariant „=a7”, choć Antoni Zemboldt ma w źródle tylko jeden związek.

## Zastosowane poprawki z poprawki.json

- `aukasz-mocek`: imie → "Łukasz", plec → "M"
- `aukasz-zemboldt`: imie → "Łukasz", plec → "M"
