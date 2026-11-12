const { chromium } = require('playwright');
const { B, FS, P, ok, wyniki, bledy, wyczysc, potwierdzEmail, dokument, nowaKarta, rejestruj, zaloguj } = require('./helpery.cjs');
(async () => {
  const br = await chromium.launch();
  await wyczysc();
  const t = Date.now();

  // ── Google (okno emulatora) ──
  const g = await nowaKarta(br);
  await g.p.goto(B + '/rejestracja/');
  await g.p.getByRole('button', { name: 'Zarejestruj się przez Google' }).waitFor();
  ok('przycisk „Zarejestruj się przez Google” jest na stronie', true);
  // okno Google nie działa w testach (skrypty z internetu) – używamy testowego poświadczenia Google
  await g.p.waitForFunction(() => typeof window.__testGoogle === 'function');
  await g.p.evaluate(() => window.__testGoogle(`gosia-${Date.now()}@example.org`, 'Gosia Googlowa'));
  await g.p.goto(B + '/profil/');
  await g.p.getByRole('heading', { name: 'Twój profil' }).waitFor();
  ok('konto Google: profil zakładany z imienia i nazwiska konta', (await g.p.getByLabel('Imię', { exact: true }).inputValue()) === 'Gosia' && (await g.p.getByLabel('Nazwisko', { exact: true }).inputValue()) === 'Googlowa');
  ok('konto Google jest od razu zweryfikowane (można tworzyć drzewa)', await g.p.getByRole('button', { name: '+ Utwórz nowe drzewo' }).isEnabled());
  await g.p.getByRole('button', { name: '+ Utwórz nowe drzewo' }).click();
  await g.p.getByLabel(/^Nazwa/).fill('Drzewo Google');
  await g.p.getByRole('button', { name: 'Utwórz drzewo' }).click();
  await g.p.waitForURL('**/d/?id=*');
  ok('użytkownik Google tworzy drzewo', true);

  // ── rejestracja: walidacja formularza ──
  const w = await nowaKarta(br);
  await w.p.goto(B + '/rejestracja/');
  await w.p.getByLabel('Imię', { exact: true }).fill('Ewa'); await w.p.getByLabel('Nazwisko', { exact: true }).fill('Zielona');
  await w.p.getByLabel('Adres e-mail').fill(`ewa-${t}@example.org`);
  await w.p.getByLabel('Hasło (min. 8 znaków)').fill('haslo12345'); await w.p.getByLabel('Powtórz hasło').fill('inne-haslo-99');
  await w.p.getByRole('checkbox').check();
  await w.p.getByRole('button', { name: 'Załóż konto' }).click();
  ok('niezgodne hasła są odrzucone z komunikatem', (await w.p.locator('form [role=alert]').innerText()).includes('nie są takie same'));
  await w.p.getByLabel('Powtórz hasło').fill('haslo12345'); await w.p.getByRole('checkbox').uncheck();
  await w.p.getByRole('button', { name: 'Załóż konto' }).click();
  ok('brak zgody na politykę prywatności blokuje rejestrację', (await w.p.locator('form [role=alert]').innerText()).includes('polityk'));
  await rejestruj(w.p, 'Ewa', 'Zielona', `ewa-${t}@example.org`).catch(() => {});
  await w.p.goto(B + '/rejestracja/');
  await w.p.waitForURL('**/profil/', { timeout: 10000 }).catch(() => {});
  // duplikat e-maila
  const d = await nowaKarta(br);
  await d.p.goto(B + '/rejestracja/');
  await d.p.getByLabel('Imię', { exact: true }).fill('Ewa'); await d.p.getByLabel('Nazwisko', { exact: true }).fill('Druga');
  await d.p.getByLabel('Adres e-mail').fill(`ewa-${t}@example.org`);
  await d.p.getByLabel('Hasło (min. 8 znaków)').fill('haslo12345'); await d.p.getByLabel('Powtórz hasło').fill('haslo12345');
  await d.p.getByRole('checkbox').check();
  await d.p.getByRole('button', { name: 'Załóż konto' }).click();
  await d.p.locator('form [role=alert]').waitFor();
  ok('rejestracja na zajęty adres daje czytelny komunikat', (await d.p.locator('form [role=alert]').innerText()).includes('już istnieje'));

  // ── logowanie: złe i dobre hasło, wylogowanie ──
  const l = await nowaKarta(br);
  await l.p.goto(B + '/logowanie/');
  await l.p.getByLabel('Adres e-mail').fill(`ewa-${t}@example.org`); await l.p.getByLabel('Hasło', { exact: true }).fill('zle-haslo-1');
  await l.p.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
  await l.p.locator('form [role=alert]').waitFor();
  ok('złe hasło: komunikat bez zdradzania, czy konto istnieje', (await l.p.locator('form [role=alert]').innerText()).includes('Nieprawidłowy adres e-mail lub hasło'));
  await zaloguj(l.p, `ewa-${t}@example.org`);
  await l.p.getByRole('button', { name: /Ewa/ }).click();
  await l.p.getByRole('menuitem', { name: 'Wyloguj' }).click();
  await l.p.getByRole('link', { name: 'Zaloguj się' }).first().waitFor();
  ok('wylogowanie przywraca przyciski logowania i rejestracji', (await l.p.getByRole('link', { name: 'Zarejestruj się' }).count()) > 0);
  await l.p.goto(B + '/profil/'); await l.p.waitForURL('**/logowanie/');
  ok('profil bez logowania przekierowuje do logowania', true);

  // ── usunięcie własnego konta wraz z drzewami ──
  const u = await nowaKarta(br);
  await rejestruj(u.p, 'Zenon', 'Usuwany', `zenon-${t}@example.org`);
  await potwierdzEmail(`zenon-${t}@example.org`);
  await u.p.goto(B + '/profil/');
  await u.p.getByRole('button', { name: '+ Utwórz nowe drzewo' }).waitFor();
  await u.p.getByRole('heading', { name: 'Potwierdź adres e-mail' }).waitFor({ state: 'detached', timeout: 20000 });
  await u.p.getByRole('button', { name: '+ Utwórz nowe drzewo' }).click();
  await u.p.getByLabel(/^Nazwa/).fill('Drzewo Zenona');
  await u.p.getByRole('button', { name: 'Utwórz drzewo' }).click();
  await u.p.waitForURL('**/d/?id=*');
  const idZ = new URL(u.p.url()).searchParams.get('id');
  ok('drzewo przed usunięciem konta istnieje', (await dokument(`drzewa/${idZ}`)).fields?.nazwa?.stringValue === 'Drzewo Zenona');
  await u.p.goto(B + '/profil/');
  await u.p.getByRole('button', { name: 'Usuń moje konto…' }).click();
  await u.p.getByLabel('Potwierdź hasłem').fill('zle-haslo-1');
  await u.p.getByRole('button', { name: 'Usuń konto na stałe' }).click();
  await u.p.locator('form [role=alert]').waitFor();
  ok('usunięcie konta wymaga poprawnego hasła', (await u.p.locator('form [role=alert]').innerText()).includes('Nieprawidłowy'));
  await u.p.getByLabel('Potwierdź hasłem').fill('haslo12345');
  await u.p.getByRole('button', { name: 'Usuń konto na stałe' }).click();
  await u.p.waitForURL(B + '/', { timeout: 20000 });
  ok('po usunięciu konta użytkownik wraca na stronę główną jako gość', true);
  ok('drzewo użytkownika zostało usunięte z bazy', (await fetch(`${FS}/v1/projects/${P}/databases/(default)/documents/drzewa/${idZ}`, { headers: { Authorization: 'Bearer owner' } })).status === 404);
  const prof = await (await fetch(`${FS}/v1/projects/${P}/databases/(default)/documents/uzytkownicy`, { headers: { Authorization: 'Bearer owner' } })).json();
  ok('profil i wpis adresu usunięte', !JSON.stringify(prof).includes('Zenon'));
  const adr = await (await fetch(`${FS}/v1/projects/${P}/databases/(default)/documents/adresy`, { headers: { Authorization: 'Bearer owner' } })).json();
  ok('wpis w rejestrze adresów usunięty', !JSON.stringify(adr).includes('zenon'));
  await l.p.goto(B + '/logowanie/');
  await l.p.getByLabel('Adres e-mail').fill(`zenon-${t}@example.org`); await l.p.getByLabel('Hasło', { exact: true }).fill('haslo12345');
  await l.p.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
  await l.p.locator('form [role=alert]').waitFor();
  ok('usunięte konto nie pozwala się zalogować', (await l.p.locator('form [role=alert]').innerText()).includes('Nieprawidłowy'));

  console.log('błędy strony:', bledy.length ? bledy : 'brak');
  const nieudane = wyniki.filter((x) => !x[0]);
  console.log(`\nWYNIK: ${wyniki.length - nieudane.length}/${wyniki.length} sprawdzeń OK`);
  await br.close();
  process.exit(nieudane.length ? 1 : 0);
})().catch((e) => { console.error('PRZERWANO:', e.message.split('\n').slice(0, 8).join('\n')); process.exit(2); });
