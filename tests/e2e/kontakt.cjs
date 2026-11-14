// Formularz kontaktowy: wysyłka (zapis w bazie), walidacja, pułapka na boty, przerwa między wiadomościami, panel administratora.
const { chromium } = require('playwright');
const { B, FS, P, ok, wyniki, bledy, wyczysc, nowaKarta, zalozKonto, uidPo, nadajAdmina } = require('./helpery.cjs');

const wiadomosci = async () => {
  const r = await (await fetch(`${FS}/v1/projects/${P}/databases/(default)/documents/wiadomosci`, { headers: { Authorization: 'Bearer owner' } })).json();
  return (r.documents ?? []).map((d) => Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, v.stringValue])));
};

(async () => {
  const br = await chromium.launch();
  await wyczysc();
  const t = Date.now();
  const mail = (n) => `${n}-${t}@example.org`;

  // ── gość: link w stopce, walidacja, wysyłka ──
  const g = await nowaKarta(br);
  await g.p.goto(B + '/');
  await g.p.locator('footer').getByRole('link', { name: 'Kontakt' }).click();
  await g.p.waitForURL('**/kontakt/');
  await g.p.getByRole('heading', { name: 'Kontakt', level: 1 }).waitFor();
  ok('stopka każdej strony ma link „Kontakt” do formularza', true);
  const formularz = g.p.getByRole('form', { name: 'Formularz kontaktowy' });
  await formularz.getByLabel('Imię lub nazwa').fill('Gość Testowy');
  await formularz.getByLabel(/Twój adres e-mail/).fill('gosc@example.org');
  await formularz.getByLabel('Temat').selectOption('blad');
  await formularz.getByLabel('Wiadomość').fill('krótko');
  await formularz.getByRole('button', { name: 'Wyślij wiadomość' }).click();
  await g.p.getByText('Zaznacz zgodę na przetwarzanie danych').waitFor();
  ok('bez zgody wiadomość nie jest wysyłana', (await wiadomosci()).length === 0);
  await formularz.getByRole('checkbox').check();
  await formularz.getByRole('button', { name: 'Wyślij wiadomość' }).click();
  await g.p.getByText(/zbyt krótka/).waitFor();
  ok('zbyt krótka wiadomość: czytelny błąd, nic nie wysłano', (await wiadomosci()).length === 0);
  await formularz.getByLabel('Wiadomość').fill('Znalazłem błąd na stronie osoby, opis poniżej.\nDruga linia wiadomości.');
  await formularz.getByRole('button', { name: 'Wyślij wiadomość' }).click();
  await g.p.getByRole('heading', { name: 'Dziękujemy, wiadomość wysłana' }).waitFor();
  const po1 = await wiadomosci();
  ok('wiadomość gościa zapisana w bazie ze wszystkimi polami', po1.length === 1 && po1[0].imie === 'Gość Testowy' && po1[0].email === 'gosc@example.org' && po1[0].temat === 'blad' && /Druga linia/.test(po1[0].tresc) && po1[0].uid === undefined, JSON.stringify(po1));

  // ── przerwa między wiadomościami i pułapka na boty ──
  await g.p.getByRole('button', { name: 'Napisz kolejną wiadomość' }).click();
  await formularz.getByLabel('Wiadomość').fill('Druga wiadomość wysłana zaraz po pierwszej.');
  await formularz.getByRole('checkbox').check();
  await formularz.getByRole('button', { name: 'Wyślij wiadomość' }).click();
  await g.p.getByText(/Przed chwilą wysłano już wiadomość/).waitFor();
  ok('druga wiadomość zaraz po pierwszej jest wstrzymana (ochrona przed zalewem)', (await wiadomosci()).length === 1);
  const bot = await nowaKarta(br);
  await bot.p.goto(B + '/kontakt/');
  const f2 = bot.p.getByRole('form', { name: 'Formularz kontaktowy' });
  await f2.getByLabel('Imię lub nazwa').fill('Bot');
  await f2.getByLabel(/Twój adres e-mail/).fill('bot@example.org');
  await f2.getByLabel('Wiadomość').fill('Kup tanie okulary, wejdź na stronę spamera.');
  await f2.getByRole('checkbox').check();
  await bot.p.locator('form[aria-label="Formularz kontaktowy"] input[name="strona-www"]').evaluate((el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'http://spam'); el.dispatchEvent(new Event('input', { bubbles: true })); });
  await f2.getByRole('button', { name: 'Wyślij wiadomość' }).click();
  await bot.p.getByRole('heading', { name: 'Dziękujemy, wiadomość wysłana' }).waitFor();
  ok('pole-pułapka: bot widzi „sukces”, ale nic nie trafia do bazy', (await wiadomosci()).length === 1);

  // ── zalogowany: podpowiedzi z profilu, powiązanie z kontem ──
  const ala = await zalozKonto(br, 'Ala', 'Kontaktowa', mail('ala'));
  await ala.p.goto(B + '/kontakt/');
  const f3 = ala.p.getByRole('form', { name: 'Formularz kontaktowy' });
  await f3.getByLabel('Imię lub nazwa').waitFor();
  await ala.p.waitForFunction(() => document.querySelector('input[type=email]').value !== '');
  ok('zalogowany: imię i adres podpowiedziane z profilu', (await f3.getByLabel('Imię lub nazwa').inputValue()) === 'Ala Kontaktowa' && (await f3.getByLabel(/Twój adres e-mail/).inputValue()) === mail('ala'));
  await f3.getByLabel('Temat').selectOption('dane');
  await f3.getByLabel('Wiadomość').fill('Proszę o informację, jakie dane o mnie przechowujecie.');
  await f3.getByRole('checkbox').check();
  await f3.getByRole('button', { name: 'Wyślij wiadomość' }).click();
  await ala.p.getByRole('heading', { name: 'Dziękujemy, wiadomość wysłana' }).waitFor();
  const po2 = await wiadomosci();
  ok('wiadomość zalogowanego ma jego uid', po2.length === 2 && po2.some((w) => w.uid && w.temat === 'dane'));

  // ── administrator: zakładka „Wiadomości” ──
  const szef = await zalozKonto(br, 'Szef', 'Serwisu', mail('szef'));
  await nadajAdmina(await uidPo(mail('szef')));
  await szef.p.goto(B + '/admin/');
  await szef.p.getByRole('navigation', { name: 'Sekcje panelu administratora' }).getByRole('link', { name: /Wiadomości/ }).click();
  await szef.p.getByRole('heading', { name: 'Wiadomości (2)' }).waitFor({ timeout: 15000 });
  await szef.p.getByText('Znalazłem błąd na stronie osoby').waitFor();
  ok('administrator widzi wiadomości z formularza, z adresem do odpowiedzi', (await szef.p.getByRole('link', { name: 'gosc@example.org' }).getAttribute('href'))?.startsWith('mailto:gosc@example.org'));
  await szef.p.getByLabel('Szukaj wiadomości').fill('dane o mnie');
  await szef.p.getByText('Proszę o informację').waitFor();
  ok('administrator wyszukuje wiadomości po treści', (await szef.p.getByText('Znalazłem błąd na stronie osoby').count()) === 0);
  await szef.p.getByLabel('Szukaj wiadomości').fill('');
  await szef.p.locator('li', { hasText: 'Gość Testowy' }).getByRole('button', { name: 'Usuń wiadomość' }).click();
  await szef.p.getByRole('heading', { name: 'Wiadomości (1)' }).waitFor({ timeout: 15000 });
  ok('administrator usuwa wiadomość', (await wiadomosci()).length === 1);
  await ala.p.goto(B + '/admin/?s=wiadomosci');
  await ala.p.getByRole('heading', { name: 'Brak dostępu' }).waitFor();
  ok('zwykły użytkownik nie czyta wiadomości (panel admina niedostępny)', true);

  console.log('błędy strony:', bledy.length ? bledy : 'brak');
  const nieudane = wyniki.filter((w) => !w[0]);
  console.log(`\nWYNIK: ${wyniki.length - nieudane.length}/${wyniki.length} sprawdzeń OK`);
  await br.close();
  process.exit(nieudane.length || bledy.length ? 1 : 0);
})().catch((e) => { console.error('PRZERWANO:', e.message.split('\n').slice(0, 8).join('\n')); console.log('błędy strony:', bledy); process.exit(2); });
