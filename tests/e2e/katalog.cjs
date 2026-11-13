const { chromium } = require('playwright');
const { B, FS, P, ok, wyniki, bledy, wyczysc, nowaKarta } = require('./helpery.cjs');

const REST = `${FS}/v1/projects/${P}/databases/(default)/documents`;
const wartosc = (v) => {
  if (v === null) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(wartosc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, wartosc(x)])) } };
};
async function dodajDrzewo(id, nazwa, osob = 3, utworzono = '2026-11-12T10:00:00Z', nazwiska = []) {
  const meta = { nazwa, opis: '', region: '', widocznosc: 'publiczne', politykaDatZyjacych: 'ukryj', wlascicielId: 'wlasciciel', wlascicielNazwa: 'Właściciel', kolaboranci: [], kolaboranciInfo: {}, zakresLat: { od: 1900, do: 1950 }, nazwiska, statystyki: { osob, pokolen: 2, galezi: 1 }, utworzono, zaktualizowano: '2026-11-12' };
  await fetch(`${REST}/drzewa/${id}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: wartosc(meta).mapValue.fields }) });
}

(async () => {
  const br = await chromium.launch();
  await wyczysc();
  // 15 publicznych drzew i jedno puste (niewidoczne w katalogu)
  for (let i = 1; i <= 15; i++) await dodajDrzewo(`seed${String(i).padStart(2, '0')}`, `Rodzina ${String(i).padStart(2, '0')}`, 3 + i, `2026-11-12T10:${String(i).padStart(2, '0')}:00Z`, i === 7 ? ['Stanisławski', 'Olejnik'] : i === 9 ? ['Stanisławska'] : ['Kowalski']);
  await dodajDrzewo('puste', 'Puste drzewo', 0);

  const g = await nowaKarta(br);
  const zapytania = [];
  g.p.on('request', (r) => {
    if (!r.url().includes('127.0.0.1:8080') || r.method() !== 'POST') return;
    const dane = r.postData() ?? '';
    if (/runQuery|:runQuery|"structuredQuery"|structuredQuery/.test(r.url() + dane)) zapytania.push(dane);
  });
  // Zapytania idą kanałem WebChannel jako dane formularza zakodowane w URL – dekodujemy je, żeby odczytać limit.
  const limity = () => zapytania.map((z) => { const t = decodeURIComponent(z.replace(/\+/g, ' ')); return /"limit":\s*(\d+)/.exec(t)?.[1] ?? /"limit":\s*\{\s*"value":\s*(\d+)/.exec(t)?.[1] ?? '?'; });

  await g.p.goto(B + '/');
  await g.p.getByRole('heading', { name: 'Odnajdź swoich przodków.', level: 1 }).waitFor({ timeout: 15000 });
  await g.p.waitForTimeout(2000);
  await g.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-glowna-komputer.png', fullPage: true });
  const tel = await nowaKarta(br, { width: 390, height: 844 });
  await tel.p.goto(B + '/');
  await tel.p.getByRole('heading', { name: 'Odnajdź swoich przodków.', level: 1 }).waitFor();
  await tel.p.waitForTimeout(800);
  await tel.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-glowna-telefon.png', fullPage: true });
  ok('telefon: brak poziomego przewijania strony głównej', await tel.p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  ok('telefon: jest link „Przeglądaj publiczne drzewa”', await tel.p.getByRole('link', { name: 'Przeglądaj publiczne drzewa' }).isVisible());
  const ciemny = await nowaKarta(br);
  await ciemny.p.emulateMedia({ colorScheme: 'dark' });
  await ciemny.p.goto(B + '/');
  await ciemny.p.getByRole('heading', { name: 'Odnajdź swoich przodków.', level: 1 }).waitFor();
  await ciemny.p.waitForTimeout(500);
  await ciemny.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-glowna-ciemna.png', fullPage: true });
  const jasnoscTla = await ciemny.p.evaluate(() => { const c = getComputedStyle(document.querySelector('.glowna')).backgroundColor.match(/\d+/g).map(Number); return (c[0] + c[1] + c[2]) / 3; });
  ok('ciemny motyw: tło strony głównej jest ciemne', jasnoscTla < 60, String(jasnoscTla));
  const poGlownej = zapytania.length;
  ok('strona główna nie pobiera żadnych drzew (zero zapytań)', poGlownej === 0, `zapytań: ${poGlownej}, treść: ${(zapytania[0] ?? '').slice(0, 300)}`);
  ok('na stronie głównej nie ma listy drzew, jest link „Przegląd drzew”', (await g.p.getByRole('heading', { name: /Ostatnio dodane|Polecane/ }).count()) === 0 && (await g.p.getByRole('link', { name: 'Przegląd drzew' }).count()) === 1);
  await g.p.getByRole('searchbox', { name: /Szukaj drzewa/ }).click();
  await g.p.getByRole('searchbox', { name: /Szukaj drzewa/ }).fill('rodzina 07');
  await g.p.getByRole('link', { name: /Rodzina 07/ }).first().waitFor({ timeout: 15000 });
  ok('kliknięcie w wyszukiwarkę pobiera pełną listę (limit 100) raz i znajduje drzewo', zapytania.length === poGlownej + 1 && limity()[0] === '100', `limity: ${limity()}`);

  await g.p.getByRole('searchbox', { name: /Szukaj drzewa/ }).fill('stanislaw');
  await g.p.getByText(/Tak, takie nazwisko już jest – w 2 drzewach/).waitFor({ timeout: 15000 });
  ok('wyszukiwarka na głównej: nazwisko bez polskich znaków znajduje drzewa i mówi, że takie nazwisko już jest', (await g.p.getByText('Nazwisko: Stanisławski').count()) === 1);
  await g.p.getByRole('link', { name: 'Przegląd drzew' }).click();
  await g.p.waitForURL('**/drzewa/');
  await g.p.getByText('Rodzina 15').first().waitFor({ timeout: 15000 });
  await g.p.waitForTimeout(800);
  ok('katalog korzysta z pamięci podręcznej – bez nowego zapytania', zapytania.length === poGlownej + 1, `zapytań: ${zapytania.length}`);
  await g.p.getByRole('searchbox', { name: /Szukaj drzew/ }).or(g.p.getByLabel('Nazwisko, nazwa drzewa lub region')).first().fill('Stanisławsk');
  await g.p.getByText(/Tak, takie nazwisko już jest/).waitFor({ timeout: 10000 });
  ok('katalog: wpisanie nazwiska pokazuje, że takie nazwisko już istnieje, i drzewa, w których występuje', (await g.p.locator('main ul li').count()) === 2 && (await g.p.getByText('Nazwisko w drzewie:').count()) === 2);
  await g.p.getByLabel('Nazwisko, nazwa drzewa lub region').fill('Zielińskowski');
  await g.p.getByText(/Nie znaleziono nazwiska „Zielińskowski”/).waitFor({ timeout: 10000 });
  ok('katalog: nieistniejące nazwisko – wyraźna informacja, że nie ma go w publicznych drzewach', true);
  await g.p.getByLabel('Nazwisko, nazwa drzewa lub region').fill('');
  ok('katalog nie pokazuje pustych drzew, a pozostałe są wszystkie', (await g.p.getByText('Puste drzewo').count()) === 0 && (await g.p.locator('main ul li').count()) === 15);

  await g.p.reload();
  await g.p.getByText('Rodzina 15').first().waitFor({ timeout: 15000 });
  await g.p.waitForTimeout(800);
  ok('po odświeżeniu strony lista wraca z sessionStorage (bez zapytania)', zapytania.length === poGlownej + 1, `zapytań: ${zapytania.length}`);

  await g.p.goto(B + '/');
  await g.p.getByRole('heading', { name: 'Odnajdź swoich przodków.', level: 1 }).waitFor();
  await g.p.waitForTimeout(800);
  ok('powrót na stronę główną też nie odpytuje bazy', zapytania.length === poGlownej + 1, `zapytań: ${zapytania.length}`);

  // unieważnianie: nowe publiczne drzewo musi pojawić się w katalogu mimo pamięci podręcznej
  const { potwierdzEmail, rejestruj } = require('./helpery.cjs');
  const u = await nowaKarta(br);
  const email = `kat-${Date.now()}@example.org`;
  await rejestruj(u.p, 'Kasia', 'Katalog', email);
  await potwierdzEmail(email);
  await u.p.goto(B + '/profil/');
  await u.p.getByRole('heading', { name: 'Potwierdź adres e-mail' }).waitFor({ state: 'detached', timeout: 25000 });
  await u.p.goto(B + '/drzewa/');
  await u.p.getByText('Rodzina 15').first().waitFor({ timeout: 15000 });
  await u.p.goto(B + '/profil/');
  await u.p.getByRole('button', { name: '+ Utwórz nowe drzewo' }).click();
  await u.p.getByLabel(/^Nazwa/).fill('Nowe publiczne drzewo');
  await u.p.getByLabel('Kto widzi drzewo').selectOption('publiczne');
  await u.p.getByRole('button', { name: 'Utwórz drzewo' }).click();
  await u.p.waitForURL('**/d/?id=*');
  const id = new URL(u.p.url()).searchParams.get('id');
  await u.p.getByLabel('Imię').first().fill('Jan'); await u.p.getByLabel('Nazwisko').first().fill('Nowy');
  await u.p.getByRole('button', { name: 'Dodaj osobę' }).click();
  for (let i = 0; i < 40; i++) { const d = await (await fetch(`${REST}/drzewa/${id}`, { headers: { Authorization: 'Bearer owner' } })).json(); if (d.fields?.statystyki?.mapValue?.fields?.osob?.integerValue === '1') break; await new Promise((r) => setTimeout(r, 250)); }
  await u.p.goto(B + '/drzewa/');
  await u.p.getByText('Nowe publiczne drzewo').first().waitFor({ timeout: 15000 });
  ok('nowe publiczne drzewo pojawia się w katalogu mimo pamięci podręcznej', true);

  console.log('błędy strony:', bledy.length ? bledy : 'brak');
  const nieudane = wyniki.filter((w) => !w[0]);
  console.log(`\nWYNIK: ${wyniki.length - nieudane.length}/${wyniki.length} sprawdzeń OK`);
  await br.close();
  process.exit(nieudane.length ? 1 : 0);
})().catch((e) => { console.error('PRZERWANO:', e.message.split('\n').slice(0, 8).join('\n')); console.log('błędy strony:', bledy); process.exit(2); });
