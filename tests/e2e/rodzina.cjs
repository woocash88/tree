// Dodawanie bliskich ze strony osoby (przyciski „+”), limity, ID drzewa obok nazwy, pogrubiona linia na diagramie.
const { chromium } = require('playwright');
const { B, AUTH, FS, P, ok, wyniki, bledy, wyczysc, potwierdzEmail, dokument, nowaKarta, rejestruj, czekajNaOsoby } = require('./helpery.cjs');

(async () => {
  const br = await chromium.launch();
  await wyczysc();
  const t = Date.now();
  const mail = `ala-${t}@example.org`;

  const ala = await nowaKarta(br);
  await rejestruj(ala.p, 'Ala', 'Test', mail);
  await ala.p.goto(B + '/profil/');
  await ala.p.getByRole('heading', { name: 'Potwierdź adres e-mail' }).waitFor();
  await potwierdzEmail(mail);
  await ala.p.getByRole('button', { name: /Kliknąłem w link/ }).click();
  await ala.p.getByRole('heading', { name: 'Potwierdź adres e-mail' }).waitFor({ state: 'detached' });
  await ala.p.getByRole('button', { name: '+ Utwórz nowe drzewo' }).click();
  await ala.p.getByLabel(/^Nazwa/).fill('Rodzina Test');
  await ala.p.getByRole('button', { name: 'Utwórz drzewo' }).click();
  await ala.p.waitForURL('**/d/?id=*');
  const id = new URL(ala.p.url()).searchParams.get('id');
  await ala.p.getByText('To drzewo jest jeszcze puste').waitFor();
  await ala.p.getByLabel('Imię').first().fill('Jan');
  await ala.p.getByLabel('Nazwisko').first().fill('Test');
  await ala.p.getByLabel('Urodzenie').first().fill('1850');
  await ala.p.getByLabel('Śmierć (puste = brak informacji)').first().fill('1920');
  await ala.p.getByRole('button', { name: 'Dodaj osobę' }).click();
  await czekajNaOsoby(id, 1);

  // ── numer drzewa (5 cyfr) obok nazwy ──
  let numer = '';
  for (let i = 0; i < 40 && !numer; i++) { numer = (await dokument(`drzewa/${id}`)).fields?.numer?.stringValue ?? ''; if (!numer) await new Promise((r) => setTimeout(r, 250)); }
  ok('nowe drzewo dostało 5-cyfrowy numer', /^[1-9]\d{4}$/.test(numer), numer);
  ok('dokument numeru wskazuje drzewo', (await dokument(`numery/${numer}`)).fields?.drzewoId?.stringValue === id);
  await ala.p.goto(`${B}/d/?id=${id}`);
  await ala.p.getByRole('heading', { name: 'Rodzina Test', level: 1 }).waitFor();
  await ala.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-strona-drzewa.png', fullPage: true });
  ok('„ID drzewa: <numer>” widoczne obok nazwy na stronie drzewa', (await ala.p.locator('main code', { hasText: numer }).count()) === 1 && (await ala.p.getByText('ID drzewa:').count()) >= 1);
  ok('numer drzewa w pasku roli (właściciel)', (await ala.p.locator('div.bg-najazd code', { hasText: numer }).count()) === 1);
  await ala.p.goto(B + '/profil/');
  await ala.p.getByRole('heading', { name: 'Rodzina Test' }).waitFor();
  await ala.p.locator('section[aria-label="Adres e-mail i logowanie"]').screenshot({ path: require('os').tmpdir() + '/przodkowie-profil-email.png' });
  ok('numer drzewa na karcie drzewa w profilu', (await ala.p.locator('li code', { hasText: numer }).count()) === 1);
  await ala.p.goto(`${B}/d/?id=${id}&w=ustawienia`);
  await ala.p.getByRole('heading', { name: 'Ustawienia drzewa' }).waitFor();
  ok('numer drzewa w ustawieniach razem z opisem zaproszenia', (await ala.p.locator('form code', { hasText: numer }).count()) === 1 && (await ala.p.getByText(/podaj mu ten numer/).count()) === 1);

  // ── przyciski „+” na stronie osoby ──
  const osoba = (os) => `${B}/d/?id=${id}&w=osoba&os=${os}`;
  const dodaj = async (przycisk, pola, wyslij, oczekiwane) => {
    await ala.p.locator('main').getByRole('button', { name: przycisk, exact: true }).click();
    const d = ala.p.getByRole('dialog');
    for (const [etykieta, wartosc] of Object.entries(pola)) await d.getByLabel(etykieta).first().fill(wartosc);
    await d.getByRole('button', { name: wyslij, exact: true }).click();
    await czekajNaOsoby(id, oczekiwane);
  };
  await ala.p.goto(osoba('jan-test-1850'));
  await ala.p.getByRole('heading', { name: 'Jan Test', level: 1 }).waitFor();
  const przyciski = await ala.p.locator('main button', { hasText: /^\+?\s*Dodaj/ }).allInnerTexts();
  ok('strona osoby ma przyciski: ojciec, matka, rodzeństwo, małżonek, dziecko', ['Dodaj ojca', 'Dodaj matkę', 'Dodaj rodzeństwo', 'Dodaj małżonka', 'Dodaj dziecko'].every((n) => przyciski.some((p) => p.includes(n))), przyciski.join('|'));
  ok('rodzeństwo bez rodzica: przycisk zablokowany z wyjaśnieniem', (await ala.p.getByRole('button', { name: 'Dodaj rodzeństwo' }).isDisabled()) && (await ala.p.getByText('Najpierw dodaj rodzica tej osoby.').count()) === 1);

  await ala.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-osoba-pusta.png', fullPage: true });
  await dodaj('Dodaj ojca', { Imię: 'Stefan', Urodzenie: '1820' }, 'Dodaj ojca', 2);
  await ala.p.getByRole('heading', { name: 'Rodzice', level: 2 }).waitFor();
  ok('po dodaniu ojca przycisk „Dodaj ojca” znika, a „Dodaj matkę” zostaje', (await ala.p.locator('main').getByRole('button', { name: 'Dodaj ojca', exact: true }).count()) === 0 && (await ala.p.locator('main').getByRole('button', { name: 'Dodaj matkę', exact: true }).count()) === 1);
  ok('rodzeństwo jest odblokowane', await ala.p.getByRole('button', { name: 'Dodaj rodzeństwo' }).isEnabled());

  await dodaj('Dodaj rodzeństwo', { Imię: 'Marek' }, 'Dodaj rodzeństwo', 3);
  await ala.p.getByRole('heading', { name: 'Rodzeństwo (1)' }).waitFor();
  const marek = (await dokument(`drzewa/${id}/dane/pelne`)).fields.osoby.arrayValue.values.map((v) => v.mapValue.fields).find((f) => f.imie.stringValue === 'Marek');
  ok('rodzeństwo ma tego samego ojca i to samo nazwisko (z ojca)', marek.ojciecId.stringValue.startsWith('stefan') && marek.nazwisko.stringValue === 'Test', JSON.stringify(marek.ojciecId));
  ok('rodzeństwo widoczne na stronie osoby', (await ala.p.getByRole('link', { name: /Marek/ }).count()) > 0);

  // małżonkowie: limit 4
  for (let i = 1; i <= 4; i++) {
    await dodaj('Dodaj małżonka', { Imię: `Zona${i}` }, 'Dodaj małżonka', 3 + i);
  }
  await ala.p.getByText('Osiągnięto limit małżonków: 4.').waitFor();
  ok('po czterech małżonkach przycisk znika, jest informacja o limicie', (await ala.p.locator('main').getByRole('button', { name: 'Dodaj małżonka', exact: true }).count()) === 0);

  // dzieci: limit 15 (drugi rodzic zostaje „nieznany”)
  for (let i = 1; i <= 15; i++) {
    await dodaj('Dodaj dziecko', { Imię: `Dziecko${i}` }, 'Dodaj dziecko', 7 + i);
    if (i === 2) await ala.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-osoba-plus.png', fullPage: true });
  }
  await ala.p.getByText('Osiągnięto limit dzieci: 15.').waitFor();
  ok('po piętnaściorgu dzieci przycisk znika, jest informacja o limicie', (await ala.p.locator('main').getByRole('button', { name: 'Dodaj dziecko', exact: true }).count()) === 0);
  await ala.p.getByRole('heading', { name: 'Dzieci (15)' }).waitFor();
  ok('lista dzieci pokazuje 15 osób', true);

  // ── drzewo publiczne: gość nie widzi przycisków edycji, widzi ID ──
  await ala.p.goto(`${B}/d/?id=${id}&w=ustawienia`);
  await ala.p.getByLabel(/^Publiczne/).check();
  await ala.p.getByRole('button', { name: 'Zapisz ustawienia' }).click();
  await ala.p.getByText('Zapisano ustawienia.').waitFor();
  const g = await nowaKarta(br);
  await g.p.goto(osoba('jan-test-1850'));
  await g.p.getByRole('heading', { name: 'Jan Test', level: 1 }).waitFor();
  ok('gość nie widzi przycisków dodawania bliskich', (await g.p.locator('main button', { hasText: /Dodaj/ }).count()) === 0);
  await g.p.goto(`${B}/d/?id=${id}`);
  await g.p.getByRole('heading', { name: 'Rodzina Test', level: 1 }).waitFor();
  ok('gość widzi numer publicznego drzewa obok nazwy', (await g.p.locator('main code', { hasText: numer }).count()) === 1);

  const nazwiskaMeta = (await dokument(`drzewa/${id}`)).fields?.nazwiska?.arrayValue?.values?.map((v) => v.stringValue) ?? [];
  ok('zapis osób odświeża listę nazwisk w drzewie (do wyszukiwania)', nazwiskaMeta.includes('Test'), JSON.stringify(nazwiskaMeta));

  // lista rodziców: tylko poprzednie pokolenie i nie młodsi (Dziecko1 ma ojca Jana z 1850 r.)
  await ala.p.goto(osoba('dziecko1-test'));
  await ala.p.getByRole('button', { name: '✏️ Edytuj dane' }).click();
  const opcjeOjca = () => ala.p.getByRole('dialog').locator('fieldset select').nth(0).locator('option').allInnerTexts();
  const ograniczone = await opcjeOjca();
  ok('lista ojców: tylko poprzednie pokolenie (jest Jan, nie ma Stefana ani rodzeństwa dziecka)', ograniczone.some((t) => t.includes('Jan Test')) && !ograniczone.some((t) => /Stefan|Dziecko2/.test(t)), ograniczone.join(' | '));
  await ala.p.getByRole('dialog').getByLabel(/Pokaż wszystkie osoby, także z innych pokoleń/).check();
  const wszystkie = await opcjeOjca();
  ok('opcja „pokaż wszystkie osoby” przywraca pozostałe pokolenia (Stefan), nadal bez rodzeństwa-dziecka z potomków', wszystkie.some((t) => t.includes('Stefan')) && wszystkie.length > ograniczone.length);
  await ala.p.keyboard.press('Escape');

  // ── edycja osoby ze strony osoby, w tym zmiana rodzica ──
  await ala.p.goto(osoba('marek-test'));
  await ala.p.getByRole('heading', { name: 'Marek Test', level: 1 }).waitFor();
  await ala.p.getByRole('button', { name: '✏️ Edytuj dane' }).click();
  const okno = ala.p.getByRole('dialog');
  await okno.getByLabel('Imię', { exact: true }).fill('Marcin');
  ok('domyślnie Zona1 (to samo pokolenie co Marek) nie jest proponowana jako matka', !(await okno.locator('fieldset select').nth(1).locator('option').allInnerTexts()).some((t) => t.includes('Zona1')));
  await okno.getByLabel(/Pokaż wszystkie osoby, także z innych pokoleń/).check();
  await okno.locator('fieldset select').nth(1).selectOption({ label: 'Zona1 NN' });
  await okno.screenshot({ path: require('os').tmpdir() + '/przodkowie-edycja-okno.png' });
  await okno.getByRole('button', { name: 'Zapisz', exact: true }).click();
  await ala.p.getByRole('heading', { name: 'Marcin Test', level: 1 }).waitFor();
  for (let i = 0; i < 40; i++) { const f = (await dokument(`drzewa/${id}/dane/pelne`)).fields.osoby.arrayValue.values.map((v) => v.mapValue.fields).find((x) => x.imie.stringValue === 'Marcin'); if (f) { ok('edycja ze strony osoby: zmienione imię i matka zapisane w bazie', f.matkaId.stringValue.startsWith('zona1') && f.ojciecId.stringValue.startsWith('stefan'), JSON.stringify(f.matkaId)); break; } if (i === 39) ok('edycja ze strony osoby: zapis w bazie', false); await new Promise((r) => setTimeout(r, 250)); }
  await ala.p.getByRole('heading', { name: 'Rodzice', level: 2 }).waitFor();
  ok('po zmianie rodzica strona osoby pokazuje nowego rodzica', (await ala.p.getByText('Zona1 NN').count()) > 0);
  await ala.p.getByRole('button', { name: '✏️ Edytuj dane' }).click();
  const potomek = await ala.p.getByRole('dialog').locator('fieldset select').nth(0).locator('option').allInnerTexts();
  ok('lista rodziców nie zawiera samej osoby', !potomek.some((t) => t.includes('Marcin')));
  await ala.p.keyboard.press('Escape');
  await ala.p.goto(osoba('stefan-test-1820'));
  await ala.p.getByRole('button', { name: '✏️ Edytuj dane' }).click();
  const ojcowieStefana = await ala.p.getByRole('dialog').locator('fieldset select').nth(0).locator('option').allInnerTexts();
  ok('lista rodziców nie zawiera potomków edytowanej osoby (Jan, Marcin)', !ojcowieStefana.some((t) => /Jan Test|Marcin/.test(t)));
  await ala.p.keyboard.press('Escape');

  // ── numer dla starszego drzewa (bez numeru) i dołączanie po numerze ──
  const stare = await (await fetch(`${FS}/v1/projects/${P}/databases/(default)/documents/drzewa/stare1234567890abcdef`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries((await dokument(`drzewa/${id}`)).fields).filter(([k]) => k !== 'numer' && k !== 'nazwiska')) }) })).json();
  ok('przygotowano stare drzewo bez numeru', !stare.fields.numer);
  await ala.p.goto(`${B}/d/?id=stare1234567890abcdef`);
  await ala.p.getByRole('heading', { name: 'Rodzina Test' }).first().waitFor({ timeout: 15000 });
  let nowyNumer = '';
  for (let i = 0; i < 40 && !nowyNumer; i++) { nowyNumer = (await dokument('drzewa/stare1234567890abcdef')).fields?.numer?.stringValue ?? ''; if (!nowyNumer) await new Promise((r) => setTimeout(r, 250)); }
  ok('właściciel starszego drzewa: numer nadany automatycznie po otwarciu', /^[1-9]\d{4}$/.test(nowyNumer) && nowyNumer !== numer, nowyNumer);
  let maNazwiska = false;
  for (let i = 0; i < 40 && !maNazwiska; i++) { maNazwiska = !!(await dokument('drzewa/stare1234567890abcdef')).fields?.nazwiska; if (!maNazwiska) await new Promise((r) => setTimeout(r, 250)); }
  ok('starsze drzewo dostało listę nazwisk automatycznie po otwarciu', maNazwiska);

  const kuba = await nowaKarta(br);
  const mailKuba = `kuba-${t}@example.org`;
  await rejestruj(kuba.p, 'Kuba', 'Kolega', mailKuba);
  await kuba.p.goto(B + '/profil/');
  await kuba.p.getByRole('heading', { name: 'Potwierdź adres e-mail' }).waitFor();
  await potwierdzEmail(mailKuba);
  await kuba.p.getByRole('button', { name: /Kliknąłem w link/ }).click();
  await kuba.p.getByRole('heading', { name: 'Potwierdź adres e-mail' }).waitFor({ state: 'detached' });
  await kuba.p.getByLabel('Numer drzewa lub link do drzewa').fill('99999');
  await kuba.p.getByRole('button', { name: 'Wyślij prośbę' }).click();
  await kuba.p.getByText(/Nie ma drzewa o numerze 99999/).waitFor();
  ok('nieistniejący numer: czytelny błąd', true);
  await kuba.p.getByLabel('Numer drzewa lub link do drzewa').fill(`ID drzewa: ${numer}`);
  await kuba.p.getByRole('button', { name: 'Wyślij prośbę' }).click();
  await kuba.p.getByText('Prośba została wysłana').waitFor();
  ok('dołączanie po numerze drzewa wysyła prośbę do właściciela', (await dokument(`prosby/${id}_${(await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${P}/accounts:batchGet?maxResults=100`, { headers: { Authorization: 'Bearer owner' } })).json()).users.find((u) => u.email === mailKuba).localId}`)).fields?.drzewoId?.stringValue === id);

  // ── diagram: wybrana linia pogrubiona dwukrotnie (2,5 → 5) ──
  await ala.p.goto(`${B}/d/?id=${id}&w=diagram&g=cale&os=jan-test-1850`);
  await ala.p.locator('.react-flow__edge-path').first().waitFor({ timeout: 20000 });
  await ala.p.waitForTimeout(500);
  const grubosci = await ala.p.locator('.react-flow__edge-path').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).strokeWidth)));
  ok('na diagramie linia wybranej osoby ma grubość 5 (zwykłe linie ≈1,2)', grubosci.includes(5) && grubosci.some((x) => x < 2), JSON.stringify(grubosci));

  console.log('\nbłędy strony:', bledy.length ? bledy : 'brak');
  const dobre = wyniki.filter((w) => w[0]).length;
  console.log(`WYNIK: ${dobre}/${wyniki.length} sprawdzeń OK`);
  await br.close();
  process.exit(dobre === wyniki.length && !bledy.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
