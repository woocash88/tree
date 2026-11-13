// Dodawanie bliskich ze strony osoby (przyciski „+”), limity, ID drzewa obok nazwy, pogrubiona linia na diagramie.
const { chromium } = require('playwright');
const { B, ok, wyniki, bledy, wyczysc, potwierdzEmail, dokument, nowaKarta, rejestruj, czekajNaOsoby } = require('./helpery.cjs');

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

  // ── ID drzewa obok nazwy ──
  await ala.p.goto(`${B}/d/?id=${id}`);
  await ala.p.getByRole('heading', { name: 'Rodzina Test', level: 1 }).waitFor();
  ok('ID drzewa widoczne obok nazwy na stronie drzewa', (await ala.p.locator('main code', { hasText: id }).count()) === 1);
  ok('ID drzewa w pasku roli (właściciel)', (await ala.p.locator('div.bg-najazd code', { hasText: id }).count()) === 1);
  await ala.p.goto(B + '/profil/');
  await ala.p.getByRole('heading', { name: 'Rodzina Test' }).waitFor();
  ok('ID drzewa na karcie drzewa w profilu', (await ala.p.locator('li code', { hasText: id }).count()) === 1);
  await ala.p.goto(`${B}/d/?id=${id}&w=ustawienia`);
  await ala.p.getByRole('heading', { name: 'Ustawienia drzewa' }).waitFor();
  ok('ID drzewa w ustawieniach razem z opisem zaproszenia', (await ala.p.locator('form code', { hasText: id }).count()) === 1 && (await ala.p.getByText(/podaj mu ten identyfikator/).count()) === 1);

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
  ok('gość widzi ID publicznego drzewa obok nazwy', (await g.p.locator('main code', { hasText: id }).count()) === 1);

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
