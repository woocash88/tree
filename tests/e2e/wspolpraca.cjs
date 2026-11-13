const { chromium } = require('playwright');
const { B, AUTH, FS, P, ok, wyniki, bledy, wyczysc, potwierdzEmail, uidPo, dokument, nowaKarta, rejestruj, zaloguj, czekajNaOsoby } = require('./helpery.cjs');

const REST = `${FS}/v1/projects/${P}/databases/(default)/documents`;
const wartosc = async (sciezka) => (await fetch(`${REST}/${sciezka}`, { headers: { Authorization: 'Bearer owner' } })).json();
const istnieje = async (sciezka) => (await fetch(`${REST}/${sciezka}`, { headers: { Authorization: 'Bearer owner' } })).status === 200;
async function potwierdzNaProfilu(p) {
  await p.goto(B + '/profil/');
  await p.getByRole('heading', { name: 'Twój profil' }).waitFor();
  await p.getByRole('heading', { name: 'Potwierdź adres e-mail' }).waitFor({ state: 'detached', timeout: 25000 });
}
async function zarejestrujPotwierdz(br, imie, nazwisko, email) {
  const k = await nowaKarta(br);
  await rejestruj(k.p, imie, nazwisko, email);
  await potwierdzEmail(email);
  await potwierdzNaProfilu(k.p);
  return k;
}

(async () => {
  const br = await chromium.launch();
  await wyczysc();
  const t = Date.now();
  const mail = (n) => `${n}-${t}@example.org`;

  // ── Ala: właścicielka drzewa ──
  const ala = await zarejestrujPotwierdz(br, 'Ala', 'Nowak', mail('ala'));
  await ala.p.getByRole('button', { name: '+ Utwórz nowe drzewo' }).click();
  await ala.p.getByLabel(/^Nazwa/).fill('Drzewo Ali');
  await ala.p.getByRole('button', { name: 'Utwórz drzewo' }).click();
  await ala.p.waitForURL('**/d/?id=*');
  const id = new URL(ala.p.url()).searchParams.get('id');
  await ala.p.getByLabel('Imię').first().fill('Jan'); await ala.p.getByLabel('Nazwisko').first().fill('Nowak');
  await ala.p.getByRole('button', { name: 'Dodaj osobę' }).click();
  await czekajNaOsoby(id, 1);

  // ── Basia: zwykły użytkownik edytuje własny profil ──
  const basia = await zarejestrujPotwierdz(br, 'Basia', 'Kowalska', mail('basia'));
  await basia.p.getByLabel('Imię', { exact: true }).fill('Barbara');
  await basia.p.getByLabel('Nazwisko', { exact: true }).fill('Kowalska-Nowak');
  await basia.p.getByRole('button', { name: 'Zapisz dane' }).click();
  await basia.p.getByText('Zapisano.', { exact: true }).waitFor();
  const uidB = await uidPo(mail('basia'));
  const prof = await wartosc(`uzytkownicy/${uidB}`);
  ok('zwykły użytkownik zapisuje swoje imię i nazwisko w profilu', prof.fields.imie.stringValue === 'Barbara' && prof.fields.nazwisko.stringValue === 'Kowalska-Nowak');
  await basia.p.reload(); await basia.p.getByRole('heading', { name: 'Twój profil' }).waitFor();
  ok('po odświeżeniu profil pokazuje zmienione dane', (await basia.p.getByLabel('Imię', { exact: true }).inputValue()) === 'Barbara');
  const adr = await wartosc(`adresy/${mail('basia')}`);
  ok('rejestr adresów dostał nowe imię (widać je przy zapraszaniu)', adr.fields?.nazwa?.stringValue === 'Barbara Kowalska-Nowak', JSON.stringify(adr).slice(0, 200));

  // ── prośba o dołączenie ──
  await basia.p.getByLabel('Numer drzewa lub link do drzewa').fill('to-nie-link');
  await basia.p.getByRole('button', { name: 'Wyślij prośbę' }).click();
  ok('błędny link do drzewa jest odrzucany z podpowiedzią', (await basia.p.locator('form [role=alert], section [role=alert]').first().innerText()).includes('Wpisz numer drzewa'));
  await basia.p.getByLabel('Numer drzewa lub link do drzewa').fill(`${B}/d/?id=${id}`);
  await basia.p.getByRole('button', { name: 'Wyślij prośbę' }).click();
  await basia.p.getByText('Prośba została wysłana').waitFor();
  await basia.p.getByText('Wysłane prośby').waitFor();
  ok('prośba wysłana po linku, widoczna na liście oczekujących', (await basia.p.getByRole('button', { name: 'Wycofaj' }).count()) === 1);
  await basia.p.getByLabel('Numer drzewa lub link do drzewa').fill('nieistniejace123456789');
  await basia.p.getByRole('button', { name: 'Wyślij prośbę' }).click();
  await basia.p.getByText(/drzewo nie istnieje/).waitFor();
  ok('prośba o nieistniejące drzewo daje czytelny komunikat', true);

  // ── Ala zatwierdza ──
  await ala.p.goto(B + '/profil/');
  await ala.p.getByText('Prośby o dołączenie: 1').waitFor({ timeout: 15000 });
  ok('właścicielka widzi w profilu liczbę próśb o dołączenie', true);
  await ala.p.goto(`${B}/d/?id=${id}&w=ustawienia`);
  await ala.p.getByRole('heading', { name: /Prośby o dołączenie \(1\)/ }).waitFor();
  await ala.p.getByRole('button', { name: 'Zatwierdź' }).click();
  await ala.p.getByText(/Dodano kolaboranta: Barbara/).waitFor();
  ok('właścicielka zatwierdza prośbę – Barbara zostaje kolaborantką', true);
  await basia.p.goto(B + '/profil/');
  await basia.p.getByRole('heading', { name: 'Współpracuję przy' }).waitFor({ timeout: 15000 });
  ok('kolaborantka widzi drzewo w „Współpracuję przy”', true);
  await basia.p.goto(`${B}/d/?id=${id}&w=galaz&g=cale&os=jan-nowak`);
  await basia.p.getByRole('button', { name: '👶 Dodaj dziecko' }).waitFor({ timeout: 15000 });
  ok('kolaborantka może edytować osoby w drzewie', true);

  // ── Cezary: prośba z widoku prywatnego drzewa, odrzucenie ──
  const cez = await zarejestrujPotwierdz(br, 'Cezary', 'Obcy', mail('cezary'));
  await cez.p.goto(`${B}/d/?id=${id}`);
  await cez.p.getByRole('heading', { name: 'Nie ma takiego drzewa' }).waitFor();
  await cez.p.getByRole('button', { name: 'Poproś o dostęp jako kolaborant' }).click();
  await cez.p.getByText('Prośba wysłana').waitFor();
  ok('obcy użytkownik prosi o dostęp z widoku prywatnego drzewa', true);
  await ala.p.goto(`${B}/d/?id=${id}&w=ustawienia`);
  await ala.p.getByRole('heading', { name: /Prośby o dołączenie \(1\)/ }).waitFor();
  await ala.p.getByRole('button', { name: 'Odrzuć' }).click();
  await ala.p.getByText('Odrzucono prośbę.').waitFor();
  ok('odrzucenie usuwa prośbę, Cezary nie ma dostępu', !(await istnieje(`prosby/${id}_${await uidPo(mail('cezary'))}`)));

  // ── przekazanie własności i usunięcie konta ──
  await ala.p.reload();
  await ala.p.getByRole('heading', { name: 'Przekaż własność drzewa' }).waitFor({ timeout: 10000 }).catch(async () => {
    console.log('ALA body:', (await ala.p.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 800));
    throw new Error('brak sekcji przekazania własności');
  });
  await ala.p.getByLabel('Nowy właściciel').selectOption({ label: 'Barbara Kowalska-Nowak' });
  await ala.p.getByRole('button', { name: 'Przekaż własność' }).click();
  await ala.p.getByText(/Drzewo przekazano użytkownikowi/).waitFor({ timeout: 10000 }).catch(async () => {
    console.log('ALA komunikaty:', await ala.p.locator('[role=alert], [role=status]').allInnerTexts());
    throw new Error('przekazanie własności nie powiodło się');
  });
  const meta = await dokument(`drzewa/${id}`);
  const uidA = await uidPo(mail('ala'));
  ok('własność przekazana Barbarze, Ala zostaje kolaborantką', meta.fields.wlascicielId.stringValue === uidB && JSON.stringify(meta.fields.kolaboranci).includes(uidA) && !JSON.stringify(meta.fields.kolaboranci).includes(uidB));
  await ala.p.getByText(/Ustawienia drzewa może zmieniać tylko jego właściciel/).waitFor();
  ok('były właściciel nie zmienia już ustawień drzewa', true);
  await ala.p.goto(B + '/profil/');
  await ala.p.getByText('Nie masz własnych drzew, więc nic poza kontem nie zostanie usunięte.').waitFor();
  await ala.p.getByRole('button', { name: 'Usuń moje konto…' }).click();
  await ala.p.getByLabel('Potwierdź hasłem').fill('haslo12345');
  await ala.p.getByRole('button', { name: 'Usuń konto na stałe' }).click();
  await ala.p.waitForURL(B + '/', { timeout: 20000 });
  const poUsunieciu = await dokument(`drzewa/${id}`);
  ok('po usunięciu konta byłej właścicielki drzewo zostaje', poUsunieciu.fields?.nazwa?.stringValue === 'Drzewo Ali' && poUsunieciu.fields.wlascicielId.stringValue === uidB);
  ok('usunięta kolaborantka zniknęła z drzewa', !JSON.stringify(poUsunieciu.fields.kolaboranci).includes(uidA));
  await czekajNaOsoby(id, 1);
  ok('dane drzewa (osoby) zostały po usunięciu konta', true);

  // ── opuszczenie drzewa przez kolaboranta ──
  await cez.p.goto(`${B}/d/?id=${id}`);
  await cez.p.getByRole('button', { name: 'Poproś o dostęp jako kolaborant' }).click();
  await cez.p.getByText('Prośba wysłana').waitFor();
  await basia.p.goto(`${B}/d/?id=${id}&w=ustawienia`);
  await basia.p.getByRole('heading', { name: 'Ustawienia drzewa' }).waitFor();
  await basia.p.getByRole('button', { name: 'Zatwierdź' }).click();
  await basia.p.getByText(/Dodano kolaboranta: Cezary/).waitFor();
  await cez.p.goto(B + '/profil/');
  await cez.p.getByRole('button', { name: 'Opuść drzewo' }).click();
  await cez.p.getByRole('heading', { name: 'Współpracuję przy' }).waitFor({ state: 'detached' });
  const poOpuszczeniu = await dokument(`drzewa/${id}`);
  ok('kolaborant opuszcza drzewo na własną prośbę', !JSON.stringify(poOpuszczeniu.fields.kolaboranci).includes(await uidPo(mail('cezary'))));

  // ── zmiana adresu e-mail (konto z hasłem) ──
  const dor = await zarejestrujPotwierdz(br, 'Dorota', 'Zmienna', mail('dorota'));
  ok('konto z hasłem widzi formularz zmiany adresu', (await dor.p.getByRole('button', { name: 'Wyślij link na nowy adres' }).count()) === 1);
  await dor.p.getByLabel('Nowy adres e-mail').fill(mail('dorota-nowy'));
  await dor.p.getByLabel('Obecne hasło (dla bezpieczeństwa)').fill('zle-haslo-1');
  await dor.p.getByRole('button', { name: 'Wyślij link na nowy adres' }).click();
  await dor.p.locator('section [role=alert]').first().waitFor();
  ok('zmiana adresu wymaga poprawnego hasła', (await dor.p.locator('section [role=alert]').first().innerText()).includes('Nieprawidłowy'));
  await dor.p.getByLabel('Obecne hasło (dla bezpieczeństwa)').fill('haslo12345');
  await dor.p.getByRole('button', { name: 'Wyślij link na nowy adres' }).click();
  await dor.p.getByText(/Wysłaliśmy link potwierdzający na adres/).waitFor();
  const kody = await (await fetch(`${AUTH}/emulator/v1/projects/${P}/oobCodes`)).json();
  const kod = kody.oobCodes.filter((c) => c.requestType === 'VERIFY_AND_CHANGE_EMAIL' && c.newEmail === mail('dorota-nowy')).pop();
  ok('na nowy adres wysłano link potwierdzający zmianę', !!kod);
  await fetch(kod.oobLink);
  const dor2 = await nowaKarta(br);
  await zaloguj(dor2.p, mail('dorota-nowy'));
  await dor2.p.getByRole('heading', { name: 'Twój profil' }).waitFor();
  await dor2.p.waitForTimeout(2500);
  const uidD = await uidPo(mail('dorota-nowy'));
  const pd = await wartosc(`uzytkownicy/${uidD}`);
  ok('po zmianie adresu logowanie nowym adresem działa, a profil ma nowy adres', pd.fields.email.stringValue === mail('dorota-nowy'));
  ok('rejestr adresów: nowy wpis jest, stary usunięty', (await istnieje(`adresy/${mail('dorota-nowy')}`)) && !(await istnieje(`adresy/${mail('dorota')}`)));
  const dor3 = await nowaKarta(br);
  await dor3.p.goto(B + '/logowanie/');
  await dor3.p.getByLabel('Adres e-mail').fill(mail('dorota')); await dor3.p.getByLabel('Hasło', { exact: true }).fill('haslo12345');
  await dor3.p.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
  await dor3.p.locator('form [role=alert]').waitFor();
  ok('stary adres przestaje działać', true);

  // ── konto Google: dodanie logowania hasłem; to samo konto po e-mailu ──
  const gm = mail('gosia');
  const gg = await nowaKarta(br);
  await gg.p.goto(B + '/rejestracja/');
  await gg.p.waitForFunction(() => typeof window.__testGoogle === 'function');
  await gg.p.evaluate((e) => window.__testGoogle(e, 'Gosia Googlowa'), gm);
  await gg.p.goto(B + '/profil/');
  await gg.p.getByRole('heading', { name: 'Twój profil' }).waitFor();
  ok('konto Google: adres pochodzi z Google, brak formularza zmiany adresu', (await gg.p.getByRole('button', { name: 'Wyślij link na nowy adres' }).count()) === 0 && (await gg.p.getByText(/pochodzi z Twojego konta Google/).count()) === 1);
  await gg.p.getByLabel('Nowe hasło (min. 8 znaków)').fill('haslo-google-1');
  await gg.p.getByRole('button', { name: 'Dodaj logowanie hasłem' }).click();
  await gg.p.getByText(/Dodano logowanie hasłem/).waitFor({ timeout: 10000 }).catch(async () => {
    console.log('GOOGLE komunikaty:', await gg.p.locator('section [role=alert], section [role=status]').allInnerTexts());
    throw new Error('nie udało się dodać logowania hasłem do konta Google');
  });
  const uidG = await uidPo(gm);
  const gl = await nowaKarta(br);
  await zaloguj(gl.p, gm, 'haslo-google-1');
  await gl.p.getByRole('heading', { name: 'Twój profil' }).waitFor();
  ok('po dodaniu hasła do konta Google logowanie e-mailem prowadzi do tego samego konta', (await uidPo(gm)) === uidG && (await gl.p.getByLabel('Imię', { exact: true }).inputValue()) === 'Gosia');

  console.log('błędy strony:', bledy.length ? bledy : 'brak');
  const nieudane = wyniki.filter((w) => !w[0]);
  console.log(`\nWYNIK: ${wyniki.length - nieudane.length}/${wyniki.length} sprawdzeń OK`);
  await br.close();
  process.exit(nieudane.length ? 1 : 0);
})().catch((e) => { console.error('PRZERWANO:', e.message.split('\n').slice(0, 8).join('\n')); console.log('błędy strony:', bledy); process.exit(2); });
