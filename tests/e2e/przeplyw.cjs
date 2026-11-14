const { chromium } = require('playwright');
const { B, AUTH, FS, P, ok, wyniki, bledy, wyczysc, potwierdzEmail, uidPo, nadajAdmina, dokument, nowaKarta, rejestruj, zaloguj, dodajOsobePanelem, czekajNaOsoby, wpiszDate } = require('./helpery.cjs');
(async () => {
  const br = await chromium.launch();
  await wyczysc();
  const t = Date.now();
  const mail = (n) => `${n}-${t}@example.org`;

  // ── 1. gość: hero i nagłówek ──
  const g = await nowaKarta(br);
  await g.p.goto(B + '/');
  await g.p.getByRole('heading', { name: 'Odnajdź swoich przodków.', level: 1 }).waitFor();
  ok('nagłówek strony to „Przodkowie”', (await g.p.title()).includes('Przodkowie') && !(await g.p.title()).includes('Nasi'));
  const kartaStworz = g.p.getByRole('article', { name: 'Stwórz drzewo genealogiczne' });
  await kartaStworz.getByRole('link', { name: 'Zacznij tu' }).waitFor();
  ok('gość: w karcie „Stwórz drzewo genealogiczne” jest przycisk „Zacznij tu” (nie „Załóż konto”)', (await g.p.getByText('Załóż konto', { exact: true }).count()) === 0);
  const naglowek = g.p.getByRole('navigation', { name: 'Główna nawigacja' });
  await naglowek.getByRole('link', { name: 'Zaloguj się' }).waitFor();
  ok('gość: nagłówek ma „Przegląd drzew”, „Stwórz drzewo” i „Zaloguj się”', (await naglowek.getByRole('link').allInnerTexts()).filter((t) => /Przegląd drzew|Stwórz drzewo|Zaloguj się/.test(t)).length === 3);
  ok('logo w nagłówku', (await g.p.locator('header img[src$="przodkowie_logo.png"]').count()) === 1);

  // „Stwórz drzewo” bez logowania prowadzi do logowania/rejestracji, a po zalogowaniu do formularza nowego drzewa
  await naglowek.getByRole('link', { name: 'Stwórz drzewo' }).click();
  await g.p.waitForURL('**/logowanie/?po=nowe');
  await g.p.getByText(/Aby stworzyć drzewo, najpierw zaloguj się lub załóż konto/).waitFor();
  ok('gość klikający „Stwórz drzewo” trafia do logowania z wyjaśnieniem', true);
  await g.p.getByRole('link', { name: 'Zarejestruj się' }).last().click();
  await g.p.waitForURL('**/rejestracja/?po=nowe');
  ok('przejście logowanie → rejestracja zachowuje cel „stwórz drzewo”', true);
  await g.p.goto(B + '/');
  await g.p.getByRole('article', { name: 'Stwórz drzewo genealogiczne' }).getByRole('link', { name: 'Zacznij tu' }).click();
  await g.p.waitForURL('**/rejestracja/?po=nowe');
  ok('„Zacznij tu” prowadzi do rejestracji', true);
  await g.p.goto(B + '/');
  ok('brak starych przycisków edycji u gościa', (await g.p.getByRole('button', { name: /Edytuj|Dodaj/ }).count()) === 0);

  // ── 2. rejestracja Ali ──
  const ala = await nowaKarta(br);
  await rejestruj(ala.p, 'Ala', 'Nowak', mail('ala'));
  await ala.p.goto(B + '/profil/');
  await ala.p.getByRole('heading', { name: 'Potwierdź adres e-mail' }).waitFor();
  ok('niezweryfikowany użytkownik nie może tworzyć drzew', await ala.p.getByRole('button', { name: '+ Utwórz nowe drzewo' }).isDisabled());
  await potwierdzEmail(mail('ala'));
  await ala.p.getByRole('button', { name: /Kliknąłem w link/ }).click();
  await ala.p.getByRole('heading', { name: 'Potwierdź adres e-mail' }).waitFor({ state: 'detached' });
  ok('po potwierdzeniu e-maila baner znika', true);
  await ala.p.goto(B + '/');
  await ala.p.waitForTimeout(1500);
  ok('po zalogowaniu karta pokazuje „Moje drzewa” zamiast „Zacznij tu”', (await ala.p.getByRole('article', { name: 'Stwórz drzewo genealogiczne' }).getByRole('link', { name: 'Moje drzewa' }).count()) === 1 && (await ala.p.getByRole('link', { name: 'Zacznij tu' }).count()) === 0);
  ok('nagłówek pokazuje profil (menu konta) i nie ma „Zaloguj się”', (await ala.p.getByRole('button', { name: /Ala/ }).isVisible()) && (await ala.p.getByRole('navigation', { name: 'Główna nawigacja' }).getByRole('link', { name: 'Zaloguj się' }).count()) === 0);
  const kolejnosc = await ala.p.getByRole('navigation', { name: 'Główna nawigacja' }).locator('a, button').allInnerTexts();
  const iStworz = kolejnosc.findIndex((t) => t.includes('Stwórz drzewo'));
  const iProfil = kolejnosc.findIndex((t) => t.includes('Ala'));
  ok('profil jest po prawej stronie przycisku „Stwórz drzewo”', iStworz >= 0 && iProfil > iStworz, kolejnosc.join('|'));
  await ala.p.getByRole('navigation', { name: 'Główna nawigacja' }).getByRole('link', { name: 'Stwórz drzewo' }).click();
  await ala.p.waitForURL('**/profil/?nowe=1');
  await ala.p.getByRole('button', { name: 'Utwórz drzewo' }).waitFor();
  ok('zalogowany: „Stwórz drzewo” prowadzi do profilu z otwartym formularzem nowego drzewa', true);

  // ── 3. tworzenie drzewa i osób ──
  await ala.p.goto(B + '/profil/');
  await ala.p.getByRole('button', { name: '+ Utwórz nowe drzewo' }).click();
  await ala.p.getByLabel(/^Nazwa/).fill('Rodzina Nowak');
  await ala.p.getByRole('button', { name: 'Utwórz drzewo' }).click();
  await ala.p.waitForURL('**/d/?id=*');
  const idDrzewa = new URL(ala.p.url()).searchParams.get('id');
  ok('drzewo utworzone, adres /d/?id=…', !!idDrzewa);
  await ala.p.getByText('To drzewo jest jeszcze puste').waitFor();
  await ala.p.getByLabel('Imię').first().fill('Jan');
  await ala.p.getByLabel('Nazwisko').first().fill('Nowak');
  await wpiszDate(ala.p, 'urodzenia', '4.03.1950, Kobylin');
  await ala.p.getByRole('button', { name: 'Dodaj osobę' }).click();
  await czekajNaOsoby(idDrzewa, 1);
  await ala.p.getByRole('heading', { name: 'Statystyki' }).or(ala.p.getByLabel('Statystyki')).first().waitFor();
  ok('pierwsza osoba zapisana w bazie, widok drzewa zamiast pustego stanu', true);

  const lista = (os) => `${B}/d/?id=${idDrzewa}&w=galaz&g=cale&os=${os}`;
  await ala.p.goto(lista('jan-nowak'));
  await ala.p.getByRole('button', { name: '💍 Dodaj małżonka' }).waitFor();
  await dodajOsobePanelem(ala.p, '💍 Dodaj małżonka', { Imię: 'Anna', Nazwisko: 'Nowak', Urodzenie: '1952' }, 'Dodaj małżonka', idDrzewa, 2);
  await ala.p.goto(lista('jan-nowak'));
  await ala.p.getByRole('button', { name: '👶 Dodaj dziecko' }).waitFor();
  await dodajOsobePanelem(ala.p, '👶 Dodaj dziecko', { Imię: 'Piotr', Urodzenie: '1980' }, 'Dodaj dziecko', idDrzewa, 3);
  await ala.p.goto(lista('jan-nowak'));
  await ala.p.getByRole('button', { name: '👨 Dodaj ojca' }).waitFor();
  await dodajOsobePanelem(ala.p, '👨 Dodaj ojca', { Imię: 'Stefan', Urodzenie: '1920', 'Śmierć (puste = brak informacji)': '1990' }, 'Dodaj ojca', idDrzewa, 4);
  await ala.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-e1-edycja.png' });
  await ala.p.goto(B + `/d/?id=${idDrzewa}&w=osoby`);
  await ala.p.waitForSelector('text=Osób: 4');
  ok('po odświeżeniu w bazie jest 4 osoby (Jan, Anna, Piotr, Stefan)', true);
  const pelne = await dokument(`drzewa/${idDrzewa}/dane/pelne`);
  const publ = await dokument(`drzewa/${idDrzewa}/dane/publiczne`);
  const osobyPubl = JSON.stringify(publ);
  ok('dane pełne zawierają daty urodzenia żyjących', JSON.stringify(pelne).includes('1950-03-04'));
  ok('dane publiczne NIE zawierają dat osób żyjących (polityka „ukryj”)', !/1950|1952|1980/.test(osobyPubl), osobyPubl.match(/19(50|52|80)/)?.[0]);
  ok('dane publiczne zawierają datę zmarłego Stefana', osobyPubl.includes('1920'));
  const metaDoc = await dokument(`drzewa/${idDrzewa}`);
  ok('meta: statystyki 4 osoby, zakres lat tylko ze zmarłych', metaDoc.fields.statystyki.mapValue.fields.osob.integerValue === '4' && metaDoc.fields.zakresLat.mapValue.fields.od.integerValue === '1920' && metaDoc.fields.zakresLat.mapValue.fields.do.integerValue === '1990', JSON.stringify(metaDoc.fields.zakresLat));

  // ── 4. prywatne: gość nie widzi ──
  await g.p.goto(`${B}/d/?id=${idDrzewa}&w=osoba&os=jan-nowak`);
  await g.p.getByRole('heading', { name: 'Nie ma takiego drzewa' }).waitFor();
  ok('prywatne drzewo niewidoczne dla gościa', true);
  await g.p.goto(B + '/drzewa/');
  await g.p.waitForTimeout(1500);
  ok('prywatne drzewo nie jest w katalogu', (await g.p.getByText('Rodzina Nowak').count()) === 0);

  // ── 5. ustawienia: publiczne, kolaborant ──
  const kuba = await nowaKarta(br);
  await rejestruj(kuba.p, 'Kuba', 'Kowalski', mail('kuba'));
  await potwierdzEmail(mail('kuba'));
  await kuba.p.goto(B + '/profil/');
  await kuba.p.getByRole('heading', { name: 'Potwierdź adres e-mail' }).waitFor({ state: 'detached', timeout: 20000 });
  ok('potwierdzenie e-maila w innej karcie wykrywane automatycznie', true);

  await ala.p.goto(`${B}/d/?id=${idDrzewa}&w=ustawienia`);
  await ala.p.getByRole('heading', { name: 'Ustawienia drzewa' }).waitFor();
  await ala.p.getByLabel(/^Publiczne/).check();
  await ala.p.getByRole('button', { name: 'Zapisz ustawienia' }).click();
  await ala.p.getByText('Zapisano ustawienia.').waitFor();
  ok('drzewo ustawione jako publiczne', true);
  await ala.p.getByLabel(/Adres e-mail użytkownika/).fill(mail('nieistniejacy'));
  await ala.p.getByRole('button', { name: 'Dodaj kolaboranta' }).click();
  await ala.p.getByText(/Nie ma zarejestrowanego użytkownika/).waitFor();
  ok('nieznany adres e-mail: czytelny błąd', true);
  await ala.p.getByLabel(/Adres e-mail użytkownika/).fill(mail('kuba').toUpperCase());
  await ala.p.getByRole('button', { name: 'Dodaj kolaboranta' }).click();
  await ala.p.getByText('Dodano kolaboranta.').waitFor({ timeout: 8000 }).catch(async () => {
    console.log('KOMUNIKATY NA STRONIE:', await ala.p.locator('[role=alert], [role=status]').allInnerTexts());
    console.log('adresy:', JSON.stringify(await (await fetch(`${FS}/v1/projects/${P}/databases/(default)/documents/adresy`, { headers: { Authorization: 'Bearer owner' } })).json()).slice(0, 600));
    throw new Error('kolaborant nie został dodany');
  });
  ok('kolaborant dodany po adresie e-mail (wielkość liter bez znaczenia)', (await ala.p.getByText('Kuba Kowalski').count()) > 0);

  // ── 6. gość widzi publiczne drzewo, ale bez dat żyjących ──
  await g.p.goto(`${B}/d/?id=${idDrzewa}&w=osoba&os=jan-nowak`);
  await g.p.getByRole('heading', { name: 'Jan Nowak' }).waitFor();
  const html = await g.p.content();
  ok('gość widzi imię i nazwisko osoby żyjącej', true);
  ok('gość NIE widzi dat urodzenia osoby żyjącej na stronie', !/1950|4\.03\.1950/.test(await g.p.locator('main').innerText()));
  ok('gość nie widzi przycisków edycji', (await g.p.getByRole('button', { name: /Edytuj|Dodaj|Usuń/ }).count()) === 0);
  await g.p.goto(`${B}/d/?id=${idDrzewa}&w=osoba&os=stefan-nowak-1920`);
  await g.p.getByRole('heading', { name: 'Stefan Nowak' }).waitFor();
  ok('gość widzi dane zmarłego przodka', (await g.p.locator('main').innerText()).includes('1920'));
  // katalog jest pamiętany 10 min w sessionStorage (patrz katalog.cjs) – ten gość oglądał go, gdy drzewo było jeszcze prywatne
  await g.p.evaluate(() => sessionStorage.clear());
  await g.p.goto(B + '/drzewa/');
  await g.p.getByText('Rodzina Nowak').first().waitFor({ timeout: 10000 });
  ok('publiczne drzewo pojawia się w katalogu', true);
  await g.p.goto(`${B}/d/?id=${idDrzewa}&w=galaz&g=cale&os=jan-nowak`);
  await g.p.locator('aside h2').waitFor();
  ok('gość w panelu osoby nie ma narzędzi edycji', (await g.p.locator('aside').getByRole('button', { name: /Edytuj|Dodaj/ }).count()) === 0);
  await g.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-e2-gosc.png' });

  // ── 7. kolaborant ──
  await kuba.p.goto(B + '/profil/');
  await kuba.p.getByRole('heading', { name: 'Współpracuję przy' }).waitFor({ timeout: 10000 });
  ok('kolaborant widzi drzewo w „Współpracuję przy”', true);
  await kuba.p.goto(lista('piotr-nowak'));
  await kuba.p.getByRole('button', { name: '👶 Dodaj dziecko' }).waitFor({ timeout: 10000 }).catch(async () => {
    console.log('KUBA url:', kuba.p.url());
    console.log('KUBA body:', (await kuba.p.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 700));
    await kuba.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-e3-kuba.png' });
    throw new Error('kolaborant nie widzi narzędzi edycji');
  });
  await dodajOsobePanelem(kuba.p, '👶 Dodaj dziecko', { Imię: 'Ola', Urodzenie: '2010' }, 'Dodaj dziecko', idDrzewa, 5);
  await ala.p.goto(B + `/d/?id=${idDrzewa}&w=osoby`);
  await ala.p.waitForSelector('text=Osób: 5');
  ok('kolaborant dodał osobę, właściciel widzi 5 osób', true);
  await kuba.p.goto(`${B}/d/?id=${idDrzewa}&w=ustawienia`);
  await kuba.p.getByText(/Ustawienia drzewa może zmieniać tylko jego właściciel/).waitFor();
  ok('kolaborant nie zmienia ustawień drzewa', true);
  await kuba.p.goto(B + '/admin/');
  await kuba.p.getByRole('heading', { name: 'Brak dostępu' }).waitFor();
  ok('zwykły użytkownik nie wchodzi do panelu administratora', true);

  // ── 8. administrator ──
  const szef = await nowaKarta(br);
  await rejestruj(szef.p, 'Szef', 'Serwisu', mail('szef'));
  await potwierdzEmail(mail('szef'));
  await nadajAdmina(await uidPo(mail('szef')));
  await szef.p.goto(B + '/admin/');
  await szef.p.getByRole('heading', { name: 'Administracja' }).waitFor({ timeout: 15000 });
  const wyborSekcji = await szef.p.getByRole('navigation', { name: 'Sekcje panelu administratora' }).getByRole('link').allInnerTexts();
  ok('panel admina zaczyna od wyboru sekcji (Użytkownicy, Drzewa), bez list', wyborSekcji.some((t) => t.includes('Użytkownicy')) && wyborSekcji.some((t) => /^Drzewa\b/.test(t.trim())) && (await szef.p.locator('table').count()) === 0);
  await szef.p.getByRole('navigation', { name: 'Sekcje panelu administratora' }).getByRole('link', { name: /Użytkownicy/ }).click();
  await szef.p.getByRole('heading', { name: /Użytkownicy \(\d+\)/ }).waitFor({ timeout: 15000 });
  ok('podstrona użytkowników to tabela z kolumnami', (await szef.p.locator('table th').allInnerTexts()).join('|').toLowerCase().includes('e-mail'));
  await szef.p.getByText(`Ala Nowak`).first().waitFor();
  ok('administrator widzi listę użytkowników', (await szef.p.getByText(mail('kuba')).count()) > 0);
  await szef.p.getByRole('navigation', { name: 'Sekcje panelu administratora' }).getByRole('link', { name: /^Drzewa$/ }).click();
  await szef.p.getByRole('heading', { name: /Drzewa użytkowników \(1\)/ }).waitFor();
  const numerDrzewa = (await dokument(`drzewa/${idDrzewa}`)).fields?.numer?.stringValue;
  ok('administrator widzi drzewa użytkowników w tabeli, razem z numerem (ID drzewa)', !!numerDrzewa && (await szef.p.locator('table tbody tr', { hasText: numerDrzewa }).count()) === 1, numerDrzewa);
  await szef.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-admin-drzewa.png' });
  await szef.p.getByLabel('Szukaj drzewa').fill('nie ma takiego');
  await szef.p.getByText('Brak drzew pasujących do wyszukiwania').waitFor();
  ok('wyszukiwanie w tabeli drzew filtruje wiersze', true);
  await szef.p.goto(lista('jan-nowak'));
  await szef.p.getByRole('button', { name: '✏️ Edytuj dane' }).waitFor({ timeout: 15000 });
  ok('administrator może edytować cudze drzewo', true);
  await szef.p.goto(B + '/admin/?s=uzytkownicy');
  await szef.p.getByText(mail('kuba')).waitFor();
  const wierszKuby = szef.p.locator('tr', { hasText: mail('kuba') });
  await wierszKuby.getByText(/Kolaborant: 1/).waitFor({ timeout: 15000 });
  await szef.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-admin-uzytkownicy.png' });
  ok('panel admina pokazuje rolę użytkownika w drzewach (kolaborant: 1)', true);
  await szef.p.locator('tr', { hasText: mail('ala') }).getByText(/Właściciel: 1/).waitFor();
  ok('panel admina pokazuje rolę właściciela (właściciel: 1)', true);
  await wierszKuby.getByRole('button', { name: 'Edytuj' }).click();
  await szef.p.getByLabel('Imię', { exact: true }).fill('Jakub');
  await szef.p.getByRole('button', { name: 'Zapisz', exact: true }).click();
  await szef.p.getByText(/Zmieniono dane użytkownika/).waitFor({ timeout: 15000 });
  await szef.p.locator('tr', { hasText: mail('kuba') }).getByText('Jakub Kowalski').waitFor();
  const uidKuby = await uidPo(mail('kuba'));
  ok('administrator zmienił imię użytkownika w profilu', (await dokument(`uzytkownicy/${uidKuby}`)).fields.imie.stringValue === 'Jakub');
  ok('zmiana imienia trafiła do nazwy kolaboranta w drzewie', JSON.stringify((await dokument(`drzewa/${idDrzewa}`)).fields.kolaboranciInfo).includes('Jakub Kowalski'));
  await szef.p.locator('tr', { hasText: mail('kuba') }).getByRole('button', { name: 'Usuń użytkownika' }).click();
  await szef.p.getByText(/Usunięto użytkownika/).waitFor({ timeout: 15000 });
  await szef.p.locator('tr', { hasText: mail('kuba') }).waitFor({ state: 'detached', timeout: 15000 });
  ok('administrator usunął użytkownika (Kuba), wiersz znika z tabeli', true);
  await kuba.p.goto(B + '/profil/');
  await kuba.p.getByRole('heading', { name: 'Konto usunięte' }).waitFor({ timeout: 15000 });
  ok('usunięty użytkownik widzi „Konto usunięte” i nie ma dostępu', true);
  const kub = await dokument(`drzewa/${idDrzewa}`);
  ok('usunięty kolaborant zniknął z drzewa', !JSON.stringify(kub.fields.kolaboranci).includes('stringValue'));
  await szef.p.goto(B + '/admin/?s=drzewa');
  await szef.p.locator('tr', { hasText: 'Rodzina Nowak' }).getByRole('button', { name: 'Usuń' }).click();
  await szef.p.getByText(/Użytkownicy nie utworzyli jeszcze żadnych drzew/).waitFor({ timeout: 15000 });
  ok('administrator usunął drzewo użytkownika', (await (await fetch(`${FS}/v1/projects/${P}/databases/(default)/documents/drzewa/${idDrzewa}`, { headers: { Authorization: 'Bearer owner' } })).status) === 404);

  // ── 9. usunięcie własnego konta ──
  await ala.p.goto(B + '/profil/');
  await ala.p.getByRole('heading', { name: 'Twój profil' }).waitFor();
  console.log('błędy strony:', bledy.length ? bledy : 'brak');
  const nieudane = wyniki.filter((w) => !w[0]);
  console.log(`\nWYNIK: ${wyniki.length - nieudane.length}/${wyniki.length} sprawdzeń OK`);
  await br.close();
  process.exit(nieudane.length ? 1 : 0);
})().catch(async (e) => { console.error('PRZERWANO:', e.message.split('\n').slice(0, 6).join('\n')); console.log('błędy strony:', bledy); process.exit(2); });
