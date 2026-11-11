// Imiona rozpoznawane przez import. Służą do ustalenia płci i do wykrywania literówek:
// imię spoza listy trafia do raportu (z podpowiedzią najbliższego znanego imienia).
export const IMIONA_MESKIE = `Adam Aleksander Andrzej Antoni Artur Augustyn Bartek Bartłomiej Bartosz Bogdan Bolesław Bronisław
Celestyn Czesław Dariusz Dawid Edmund Edward Eugeniusz Euzebiusz Feliks Filip Franciszek Grzegorz Helmut Henryk Hipolit
Ignacy Ireneusz Jakub Jan Janusz Jarek Jarosław Jerzy Joachim Julian Józef Karol Kazimierz Krzysztof Laurenty Leon Leszek
Łukasz Maciej Makary Maksymilian Marcel Marcin Marek Marian Mariusz Mateusz Michał Mieczysław Mikołaj Mirosław Nepomucen
Paweł Piotr Przemysław Rafał Richard Roman Ryszard Sebastian Stanisław Sylwester Szymon Tadeusz Teodor Teofil Tomasz
Walenty Wawrzyniec Wiesław Wiktor Wincenty Witold Wojciech Władysław Zbigniew Zdzisław Zenon Zygmunt`.split(/\s+/);

export const IMIONA_ZENSKIE = `Agata Agnieszka Aleksandra Alicja Alina Aniela Anna Antonina Asia Barbara Beata Bożena Bronisława
Cecylia Czesława Danuta Dorota Edyta Elżbieta Eugenia Ewa Ewelina Filipina Franciszka Genowefa Gizela Grażyna Halina Hanna
Helena Henryka Honorata Irena Iwona Iza Izabela Jadwiga Joanna Jolanta Julianna Justyna Józefa Kamila Karolina Katarzyna
Kazimiera Kinga Koleta Konstancja Krystyna Kunegunda Leona Leonarda Liliana Longina Lucyna Łucja Małgorzata Maria Marianna
Mariola Marta Martyna Marynia Mieczysława Mirela Mirosława Miła Natalia Paulina Pelagia Renata Rozalia Sabina Seweryna
Stanisława Tekla Teodora Teresa Urszula Wanda Weronika Wiktoria Wincentyna Wioleta Wioletta Zofia`.split(/\s+/);
