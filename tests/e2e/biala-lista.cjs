// Biała lista: właściciel udostępnia prywatne drzewo do przeglądania po adresie e-mail (bez edycji i bez pełnych danych).
const { chromium } = require('playwright');
const { B, ok, wyniki, bledy, wyczysc, dokument, nowaKarta, zalozKonto, wpiszDate, czekajNaOsoby } = require('./helpery.cjs');

(async () => {
  const br = await chromium.launch();
  await wyczysc();
  const t = Date.now();
  const mail = (n) => `${n}-${t}@example.org`;

  const ala = await zalozKonto(br, 'Ala', 'Wlasciciel', mail('ala'));
  const wit = await zalozKonto(br, 'Wit', 'Widz', mail('wit'));
  const obcy = await zalozKonto(br, 'Olek', 'Obcy', mail('obcy'));

  // prywatne drzewo z jedną osobą żyjącą (polityka „ukryj”)
  await ala.p.goto(B + '/profil/');
  await ala.p.getByRole('button', { name: '+ Utwórz nowe drzewo' }).click();
  await ala.p.getByLabel(/^Nazwa/).fill('Rodzina Prywatna');
  await ala.p.getByRole('button', { name: 'Utwórz drzewo' }).click();
  await ala.p.waitForURL('**/d/?id=*');
  const id = new URL(ala.p.url()).searchParams.get('id');
  await ala.p.getByText('To drzewo jest jeszcze puste').waitFor();
  await ala.p.getByLabel('Imię').first().fill('Jan');
  await ala.p.getByLabel('Nazwisko').first().fill('Nowak');
  await wpiszDate(ala.p, 'urodzenia', '4.03.1950');
  await ala.p.getByRole('button', { name: 'Dodaj osobę' }).click();
  await czekajNaOsoby(id, 1);

  const drzewo = `${B}/d/?id=${id}`;
  await obcy.p.goto(drzewo);
  await obcy.p.getByRole('heading', { name: 'Nie ma takiego drzewa' }).waitFor();
  await wit.p.goto(drzewo);
  await wit.p.getByRole('heading', { name: 'Nie ma takiego drzewa' }).waitFor();
  ok('przed udostępnieniem prywatne drzewo jest niewidoczne dla obcych', true);

  // właściciel dodaje Wita po adresie e-mail
  await ala.p.goto(`${drzewo}&w=ustawienia`);
  await ala.p.getByRole('heading', { name: 'Dostęp do przeglądania (biała lista)' }).waitFor();
  ok('ustawienia drzewa mają sekcję białej listy z opisem', (await ala.p.getByText(/nie może go edytować/).count()) === 1);
  await ala.p.getByLabel(/Adres e-mail użytkownika \(max 50\)/).fill(mail('nieistniejacy'));
  await ala.p.getByRole('button', { name: 'Daj dostęp do przeglądania' }).click();
  await ala.p.getByText(/Nie ma zarejestrowanego użytkownika/).waitFor();
  ok('nieznany adres e-mail na białej liście: czytelny błąd', true);
  await ala.p.getByLabel(/Adres e-mail użytkownika \(max 50\)/).fill(mail('wit').toUpperCase());
  await ala.p.getByRole('button', { name: 'Daj dostęp do przeglądania' }).click();
  await ala.p.getByText('Dodano dostęp do przeglądania.').waitFor();
  await ala.p.getByRole('listitem').filter({ hasText: 'Wit Widz' }).waitFor();
  ok('właściciel dodał użytkownika do białej listy po adresie e-mail (wielkość liter bez znaczenia)', true);
  await ala.p.getByLabel(/Adres e-mail użytkownika \(max 50\)/).fill(mail('ala'));
  await ala.p.getByRole('button', { name: 'Daj dostęp do przeglądania' }).click();
  await ala.p.getByText(/To Ty jesteś właścicielem/).waitFor();
  ok('właściciel nie doda siebie do białej listy', true);

  // widz: widzi, nie edytuje, nie widzi dat osób żyjących
  await wit.p.goto(drzewo);
  await wit.p.getByRole('heading', { name: 'Rodzina Prywatna', level: 1 }).waitFor();
  ok('osoba z białej listy otwiera prywatne drzewo', true);
  ok('pasek roli: „Dostęp do przeglądania”', (await wit.p.getByText('Dostęp do przeglądania', { exact: false }).count()) > 0);
  await wit.p.goto(`${drzewo}&w=osoba&os=jan-nowak`);
  await wit.p.getByRole('heading', { name: 'Jan Nowak', level: 1 }).waitFor();
  ok('widz nie ma przycisków edycji ani dodawania', (await wit.p.locator('main button', { hasText: /Dodaj|Edytuj/ }).count()) === 0);
  ok('widz nie widzi dat osoby żyjącej (kopia publiczna)', !/1950|4\.03/.test(await wit.p.locator('main').innerText()));
  await wit.p.goto(`${drzewo}&w=ustawienia`);
  await wit.p.getByText(/Masz dostęp do przeglądania tego drzewa/).waitFor();
  ok('widz nie zmienia ustawień drzewa', (await wit.p.getByRole('button', { name: 'Zapisz ustawienia' }).count()) === 0);
  await wit.p.goto(B + '/profil/');
  await wit.p.getByRole('heading', { name: 'Udostępnione mi do przeglądania' }).waitFor();
  ok('drzewo jest w profilu w sekcji „Udostępnione mi do przeglądania”', (await wit.p.getByRole('link', { name: 'Rodzina Prywatna' }).count()) === 1);

  // obcy nadal nie ma dostępu; baza nie oddaje widzowi pełnych danych
  await obcy.p.goto(drzewo);
  await obcy.p.getByRole('heading', { name: 'Nie ma takiego drzewa' }).waitFor();
  ok('osoba spoza białej listy nadal nie widzi drzewa', true);

  // zdjęcie dostępu przez właściciela
  await ala.p.goto(`${drzewo}&w=ustawienia`);
  await ala.p.getByRole('listitem').filter({ hasText: 'Wit Widz' }).getByRole('button', { name: 'Odbierz dostęp' }).click();
  await ala.p.getByText('Odebrano dostęp do przeglądania.').waitFor();
  await wit.p.goto(drzewo);
  await wit.p.getByRole('heading', { name: 'Nie ma takiego drzewa' }).waitFor();
  ok('po odebraniu dostępu użytkownik znów nie widzi drzewa', true);

  // rezygnacja przez samego użytkownika
  await ala.p.getByLabel(/Adres e-mail użytkownika \(max 50\)/).fill(mail('wit'));
  await ala.p.getByRole('button', { name: 'Daj dostęp do przeglądania' }).click();
  await ala.p.getByText('Dodano dostęp do przeglądania.').waitFor();
  await wit.p.goto(B + '/profil/');
  await wit.p.getByRole('button', { name: 'Zrezygnuj z dostępu' }).click();
  await wit.p.getByRole('heading', { name: 'Udostępnione mi do przeglądania' }).waitFor({ state: 'detached' });
  const meta = await dokument(`drzewa/${id}`);
  ok('rezygnacja z dostępu: osoba znika z listy w profilu i w bazie', !JSON.stringify(meta.fields.widzowie ?? {}).includes('stringValue'));

  console.log('błędy strony:', bledy.length ? bledy : 'brak');
  const nieudane = wyniki.filter((w) => !w[0]);
  console.log(`\nWYNIK: ${wyniki.length - nieudane.length}/${wyniki.length} sprawdzeń OK`);
  await br.close();
  process.exit(nieudane.length || bledy.length ? 1 : 0);
})().catch((e) => { console.error('PRZERWANO:', e.message.split('\n').slice(0, 8).join('\n')); console.log('błędy strony:', bledy); process.exit(2); });
