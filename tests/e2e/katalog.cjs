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
async function dodajDrzewo(id, nazwa, osob = 3, utworzono = '2026-11-12T10:00:00Z') {
  const meta = { nazwa, opis: '', region: '', widocznosc: 'publiczne', politykaDatZyjacych: 'ukryj', wlascicielId: 'wlasciciel', wlascicielNazwa: 'Właściciel', kolaboranci: [], kolaboranciInfo: {}, zakresLat: { od: 1900, do: 1950 }, statystyki: { osob, pokolen: 2, galezi: 1 }, utworzono, zaktualizowano: '2026-11-12' };
  await fetch(`${REST}/drzewa/${id}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: wartosc(meta).mapValue.fields }) });
}

(async () => {
  const br = await chromium.launch();
  await wyczysc();
  // 15 publicznych drzew i jedno puste (niewidoczne w katalogu)
  for (let i = 1; i <= 15; i++) await dodajDrzewo(`seed${String(i).padStart(2, '0')}`, `Rodzina ${String(i).padStart(2, '0')}`, 3 + i, `2026-11-12T10:${String(i).padStart(2, '0')}:00Z`);
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
  await g.p.getByRole('heading', { name: 'Ostatnio dodane drzewa' }).waitFor({ timeout: 15000 });
  const poGlownej = zapytania.length;
  ok('strona główna: jedno zapytanie o najnowsze drzewa (limit 12, sortowanie po utworzono malejąco)', poGlownej === 1 && limity()[0] === '12' && /utworzono/.test(decodeURIComponent((zapytania[0] ?? '').replace(/\+/g, ' '))) && /DESCENDING/.test(decodeURIComponent((zapytania[0] ?? '').replace(/\+/g, ' '))), `zapytań: ${poGlownej}, treść: ${(zapytania[0] ?? '').slice(0, 400)}`);
  const karty = await g.p.locator('section[aria-labelledby=ostatnio-dodane] li h3').allInnerTexts();
  const numery = karty.map((k) => Number(/(\d+)/.exec(k)?.[1]));
  await g.p.screenshot({ path: require('os').tmpdir() + '/przodkowie-strona-glowna.png', fullPage: true });
  ok('ostatnio dodane: 6 najnowszych drzew, od najnowszego', karty.length === 6 && numery.join(',') === '15,14,13,12,11,10', karty.join(', '));
  ok('karty drzew mają status „Publiczne”', (await g.p.locator('section[aria-labelledby=ostatnio-dodane] li').getByText('Publiczne', { exact: true }).count()) === 6);

  await g.p.waitForTimeout(1500);
  ok('samo wejście na stronę nie pobiera pełnej listy (wyszukiwarka jest leniwa)', zapytania.length === poGlownej);
  await g.p.getByRole('searchbox', { name: /Szukaj drzewa/ }).click();
  await g.p.getByRole('searchbox', { name: /Szukaj drzewa/ }).fill('rodzina 07');
  await g.p.getByRole('link', { name: /Rodzina 07/ }).first().waitFor({ timeout: 15000 });
  ok('kliknięcie w wyszukiwarkę pobiera pełną listę (limit 100) raz i znajduje drzewo', zapytania.length === poGlownej + 1 && limity()[1] === '100', `limity: ${limity()}`);

  await g.p.getByRole('link', { name: 'Przeglądaj publiczne drzewa' }).click();
  await g.p.waitForURL('**/drzewa/');
  await g.p.getByText('Rodzina 15').first().waitFor({ timeout: 15000 });
  await g.p.waitForTimeout(800);
  ok('katalog korzysta z pamięci podręcznej – bez nowego zapytania', zapytania.length === poGlownej + 1, `zapytań: ${zapytania.length}`);
  ok('katalog nie pokazuje pustych drzew, a pozostałe są wszystkie', (await g.p.getByText('Puste drzewo').count()) === 0 && (await g.p.locator('main ul li').count()) === 15);

  await g.p.reload();
  await g.p.getByText('Rodzina 15').first().waitFor({ timeout: 15000 });
  await g.p.waitForTimeout(800);
  ok('po odświeżeniu strony lista wraca z sessionStorage (bez zapytania)', zapytania.length === poGlownej + 1, `zapytań: ${zapytania.length}`);

  await g.p.goto(B + '/');
  await g.p.getByRole('heading', { name: 'Ostatnio dodane drzewa' }).waitFor();
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
