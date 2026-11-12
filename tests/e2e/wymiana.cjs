const { chromium } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { B, FS, P, ok, wyniki, bledy, wyczysc, potwierdzEmail, dokument, nowaKarta, rejestruj, czekajNaOsoby } = require('./helpery.cjs');

const REST = `${FS}/v1/projects/${P}/databases/(default)/documents`;
const KATALOG = path.resolve(__dirname, '../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'przodkowie-wymiana-'));
const ileOsob = async (id, doc = 'pelne') => (await dokument(`drzewa/${id}/dane/${doc}`)).fields?.osoby?.arrayValue?.values?.length ?? 0;

async function zarejestrujPotwierdz(br, imie, nazwisko, email) {
  const k = await nowaKarta(br);
  await rejestruj(k.p, imie, nazwisko, email);
  await potwierdzEmail(email);
  await k.p.goto(B + '/profil/');
  await k.p.getByRole('heading', { name: 'Twój profil' }).waitFor();
  await k.p.getByRole('heading', { name: 'Potwierdź adres e-mail' }).waitFor({ state: 'detached', timeout: 25000 });
  return k;
}
async function nowePoImporcie(p, nazwa, plik) {
  await p.goto(B + '/profil/');
  await p.getByRole('button', { name: '+ Utwórz nowe drzewo' }).click();
  await p.getByLabel(/Wypełnij z pliku/).setInputFiles(plik);
  await p.getByText(/zostanie zaimportowanych do nowego drzewa/).waitFor();
  await p.getByLabel(/^Nazwa/).fill(nazwa);
  await p.getByRole('button', { name: 'Utwórz drzewo' }).click();
  await p.waitForURL('**/d/?id=*');
  return new URL(p.url()).searchParams.get('id');
}
async function pobierz(p, nazwaPrzycisku, plik) {
  const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: nazwaPrzycisku }).click()]);
  await d.saveAs(plik);
  return d.suggestedFilename();
}

(async () => {
  const br = await chromium.launch();
  await wyczysc();
  const t = Date.now();
  const mail = (n) => `${n}-${t}@example.org`;
  const lul = JSON.parse(fs.readFileSync(path.join(KATALOG, 'data/drzewa/lulkiewicz/rodzina.json'), 'utf8'));

  // ── import do nowego drzewa z pliku JSON (427 osób) ──
  const jsonPlik = path.join(tmp, 'zrodlo.json');
  fs.writeFileSync(jsonPlik, JSON.stringify({ format: 'przodkowie-drzewo', wersja: 1, drzewo: { nazwa: 'Z pliku', widocznosc: 'publiczne' }, galezie: lul.galezie, osoby: lul.osoby, malzenstwa: lul.malzenstwa }));
  const ala = await zarejestrujPotwierdz(br, 'Ala', 'Eksport', mail('ala'));
  const id1 = await nowePoImporcie(ala.p, 'Import JSON', jsonPlik);
  await czekajNaOsoby(id1, 427);
  const meta1 = await dokument(`drzewa/${id1}`);
  ok('import JSON przy tworzeniu drzewa: 427 osób w bazie', true);
  ok('widoczność z pliku nie jest przejmowana (nowe drzewo jest prywatne)', meta1.fields.widocznosc.stringValue === 'prywatne');
  ok('dane publiczne po imporcie są okrojone (brak dat osób żyjących)', !(JSON.stringify(await dokument(`drzewa/${id1}/dane/publiczne`)).includes('1968-03-26')) && JSON.stringify(await dokument(`drzewa/${id1}/dane/pelne`)).includes('1968-03-26'));

  // ── eksport JSON i GEDCOM ──
  await ala.p.goto(`${B}/d/?id=${id1}&w=ustawienia`);
  await ala.p.getByRole('heading', { name: 'Eksport i import' }).waitFor();
  const json2 = path.join(tmp, 'eksport.json');
  const nazwaJson = await pobierz(ala.p, 'Pobierz kopię zapasową (JSON)', json2);
  const eksport = JSON.parse(fs.readFileSync(json2, 'utf8'));
  ok('eksport JSON: nazwa pliku z datą i pełne dane', /^przodkowie-import-json-\d{4}-\d{2}-\d{2}\.json$/.test(nazwaJson) && eksport.osoby.length === 427 && eksport.format === 'przodkowie-drzewo');
  ok('eksport JSON jest identyczny z danymi źródłowymi', JSON.stringify(eksport.osoby) === JSON.stringify(lul.osoby) && JSON.stringify(eksport.malzenstwa) === JSON.stringify(lul.malzenstwa));
  const ged = path.join(tmp, 'eksport.ged');
  const nazwaGed = await pobierz(ala.p, 'Pobierz GEDCOM (.ged)', ged);
  const gedTekst = fs.readFileSync(ged, 'utf8');
  ok('eksport GEDCOM: plik .ged z 427 osobami w UTF-8', nazwaGed.endsWith('.ged') && (gedTekst.match(/ INDI\r?\n/g) ?? []).length === 427 && gedTekst.includes('1 CHAR UTF-8'));

  // ── import GEDCOM do nowego drzewa ──
  const id2 = await nowePoImporcie(ala.p, 'Import GEDCOM', ged);
  await czekajNaOsoby(id2, 427);
  const malz2 = (await dokument(`drzewa/${id2}/dane/pelne`)).fields.malzenstwa.arrayValue.values.length;
  ok('import GEDCOM: 427 osób i te same małżeństwa', malz2 === lul.malzenstwa.length, `${malz2} vs ${lul.malzenstwa.length}`);

  // ── zastąpienie zawartości drzewa plikiem (z kopią zapasową) ──
  const maly = path.join(tmp, 'maly.json');
  fs.writeFileSync(maly, JSON.stringify({ format: 'przodkowie-drzewo', wersja: 1, galezie: [{ id: 'glowna', nazwa: 'Główna gałąź', kolor: '#3540d1', opis: '' }], osoby: [
    { id: 'jan', imie: 'Jan', nazwisko: 'Nowy', plec: 'M', urodzenie: { dokladnosc: 'nieznana' }, ojciecId: null, matkaId: null, galazId: 'glowna' },
    { id: 'ola', imie: 'Ola', nazwisko: 'Nowy', plec: 'K', urodzenie: { dokladnosc: 'nieznana' }, ojciecId: 'jan', matkaId: null, galazId: 'glowna' }], malzenstwa: [] }));
  await ala.p.goto(`${B}/d/?id=${id1}&w=ustawienia`);
  await ala.p.getByLabel(/Plik .json z tego serwisu/).setInputFiles(maly);
  await ala.p.getByText(/2 osób, 0 małżeństw/).waitFor();
  ok('podgląd importu pokazuje liczbę osób i ostrzeżenie o zastąpieniu', (await ala.p.getByText(/zastąpi całą obecną zawartość drzewa \(427 osób\)/).count()) === 1);
  const [kopia] = await Promise.all([ala.p.waitForEvent('download'), ala.p.getByRole('button', { name: 'Zastąp zawartość drzewa' }).click()]);
  const kopiaPlik = path.join(tmp, 'kopia.json');
  await kopia.saveAs(kopiaPlik);
  ok('przed zastąpieniem pobrana jest kopia zapasowa obecnego drzewa', JSON.parse(fs.readFileSync(kopiaPlik, 'utf8')).osoby.length === 427);
  await ala.p.getByText(/Zaimportowano 2 osób i 0 małżeństw/).waitFor();
  await czekajNaOsoby(id1, 2);
  ok('zawartość drzewa zastąpiona danymi z pliku', (await ileOsob(id1, 'publiczne')) === 2);

  // ── błędne pliki ──
  const smiec = path.join(tmp, 'smiec.json');
  fs.writeFileSync(smiec, '{"cos": 1}');
  await ala.p.getByLabel(/Plik .json z tego serwisu/).setInputFiles(smiec);
  await ala.p.locator('section[aria-label="Eksport i import drzewa"] [role=alert]').waitFor();
  ok('plik w złym formacie jest odrzucany czytelnym komunikatem', (await ala.p.locator('section[aria-label="Eksport i import drzewa"] [role=alert]').innerText()).includes('nie jest plik drzewa'));
  const zly = path.join(tmp, 'zly.ged');
  fs.writeFileSync(zly, '0 HEAD\n0 TRLR\n');
  await ala.p.getByLabel(/Plik .json z tego serwisu/).setInputFiles(zly);
  await ala.p.getByText(/nie znaleziono żadnych osób/).waitFor();
  ok('GEDCOM bez osób jest odrzucany', true);

  // ── kolaborant nie widzi eksportu (tylko zarządzający) ──
  const kolab = await zarejestrujPotwierdz(br, 'Kola', 'Borant', mail('kola'));
  await kolab.p.goto(`${B}/d/?id=${id1}&w=ustawienia`);
  await kolab.p.getByText(/Nie ma takiego drzewa/).waitFor({ timeout: 15000 });
  ok('obcy użytkownik nie ma dostępu do ustawień ani eksportu cudzego drzewa', (await kolab.p.getByRole('button', { name: /Pobierz/ }).count()) === 0);

  // ── przeniesienie drzewa z repozytorium do bazy (skrypt używany przez workflow) ──
  const luk = await zarejestrujPotwierdz(br, 'Łukasz', 'Stanisławski', mail('lukasz'));
  const srodowisko = { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_PROJECT_ID: P, GCLOUD_PROJECT: P };
  const uruchom = (...args) => execFileSync('npx', ['tsx', 'scripts/przenies-do-bazy.ts', ...args], { cwd: KATALOG, env: srodowisko, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  let blad = '';
  try { uruchom('--slug', 'lulkiewicz', '--imie', 'Nikt', '--nazwisko', 'Taki'); } catch (e) { blad = String(e.stderr); }
  ok('skrypt: nieznany właściciel daje błąd bez wypisywania listy użytkowników', blad.includes('Nie znaleziono użytkownika') && !blad.includes('Stanisławski') && !blad.includes('@'), blad);
  const wynik = uruchom('--slug', 'lulkiewicz', '--imie', 'Lukasz', '--nazwisko', 'STANISLAWSKI');
  const idLul = /\/d\/\?id=([A-Za-z0-9]+)/.exec(wynik)?.[1];
  ok('skrypt: znajduje właściciela po imieniu i nazwisku (bez polskich znaków i wielkości liter) i zapisuje drzewo', !!idLul && wynik.includes('427 osób'), wynik);
  const lm = await dokument(`drzewa/${idLul}`);
  ok('drzewo Lulkiewiczów należy do Łukasza i jest publiczne z ukrywaniem osób żyjących', lm.fields.wlascicielNazwa.stringValue === 'Łukasz Stanisławski' && lm.fields.widocznosc.stringValue === 'publiczne' && lm.fields.politykaDatZyjacych.stringValue === 'ukryj');
  ok('opis zachowuje informację o źródle danych', lm.fields.opis.stringValue.includes('genealogia.okiem.pl'));
  ok('dane pełne mają 427 osób i daty żyjących, publiczne ich nie mają', (await ileOsob(idLul)) === 427 && JSON.stringify(await dokument(`drzewa/${idLul}/dane/pelne`)).includes('1968-03-26') && !JSON.stringify(await dokument(`drzewa/${idLul}/dane/publiczne`)).includes('1968-03-26'));
  const ponownie = uruchom('--slug', 'lulkiewicz', '--imie', 'Łukasz', '--nazwisko', 'Stanisławski');
  ok('skrypt jest idempotentny: drugie uruchomienie niczego nie dubluje', ponownie.includes('jest już w bazie') && (await (await fetch(`${REST}/drzewa`, { headers: { Authorization: 'Bearer owner' } })).json()).documents.filter((d) => d.fields.nazwa.stringValue === 'Rodzina Lulkiewiczów').length === 1);

  await luk.p.goto(B + '/profil/');
  await luk.p.getByText('Rodzina Lulkiewiczów').first().waitFor({ timeout: 15000 });
  ok('właściciel widzi przeniesione drzewo w swoim profilu', true);
  const gosc = await nowaKarta(br);
  await gosc.p.goto(B + '/drzewa/');
  await gosc.p.getByText('Rodzina Lulkiewiczów').first().waitFor({ timeout: 15000 });
  await gosc.p.goto(`${B}/d/?id=${idLul}&w=osoba&os=ryszard-gregor`);
  await gosc.p.getByRole('heading', { name: 'Ryszard Gregor' }).waitFor();
  ok('gość widzi przeniesione drzewo w katalogu, ale bez dat osób żyjących', !(await gosc.p.locator('main').innerText()).includes('1968'));

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('błędy strony:', bledy.length ? bledy : 'brak');
  const nieudane = wyniki.filter((w) => !w[0]);
  console.log(`\nWYNIK: ${wyniki.length - nieudane.length}/${wyniki.length} sprawdzeń OK`);
  await br.close();
  process.exit(nieudane.length ? 1 : 0);
})().catch((e) => { console.error('PRZERWANO:', e.message.split('\n').slice(0, 8).join('\n')); console.log('błędy strony:', bledy); process.exit(2); });
