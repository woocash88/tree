/**
 * Wspólne funkcje testów end-to-end (emulatory Firebase Auth i Firestore + Playwright).
 * Uruchamianie: npm run test:e2e (opis w README).
 */
const { chromium } = require('playwright');
const B = process.env.E2E_URL || 'http://localhost:4180';
const AUTH = 'http://127.0.0.1:9099', FS = 'http://127.0.0.1:8080', P = 'przodkowie-test';
const wyniki = [];
const ok = (nazwa, warunek, szczegol = '') => { wyniki.push([!!warunek, nazwa]); console.log(`${warunek ? '✔' : '✘'} ${nazwa}${warunek ? '' : '  ← ' + szczegol}`); };
const bledy = [];

async function wyczysc() {
  await fetch(`${AUTH}/emulator/v1/projects/${P}/accounts`, { method: 'DELETE' });
  await fetch(`${FS}/emulator/v1/projects/${P}/databases/(default)/documents`, { method: 'DELETE' });
}
async function potwierdzEmail(email) {
  const r = await (await fetch(`${AUTH}/emulator/v1/projects/${P}/oobCodes`)).json();
  const kod = r.oobCodes.filter((c) => c.requestType === 'VERIFY_EMAIL' && c.email === email).pop();
  if (!kod) throw new Error('brak kodu weryfikacyjnego dla ' + email);
  await fetch(kod.oobLink);
}
async function uidPo(email) {
  const r = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${P}/accounts:batchGet?maxResults=100`, { headers: { Authorization: 'Bearer owner' } })).json();
  return r.users.find((u) => u.email === email).localId;
}
async function nadajAdmina(uid) {
  await fetch(`${FS}/v1/projects/${P}/databases/(default)/documents/admini/${uid}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { od: { stringValue: 'test' } } }) });
}
async function dokument(sciezka) {
  const r = await fetch(`${FS}/v1/projects/${P}/databases/(default)/documents/${sciezka}`, { headers: { Authorization: 'Bearer owner' } });
  return r.json();
}
async function czekajNaOsoby(id, n) {
  for (let i = 0; i < 60; i++) {
    const d = await dokument(`drzewa/${id}/dane/pelne`);
    const ile = d.fields?.osoby?.arrayValue?.values?.length ?? 0;
    if (ile === n) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`w bazie nie pojawiło się ${n} osób`);
}
async function nowaKarta(br, viewport = { width: 1280, height: 900 }) {
  const ctx = await br.newContext({ viewport });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => bledy.push('PAGEERROR ' + e.message));
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text()) && bledy.push('CONSOLE ' + m.text()));
  p.on('dialog', (d) => d.accept());
  return { ctx, p };
}
async function rejestruj(p, imie, nazwisko, email, haslo = 'haslo12345') {
  await p.goto(B + '/rejestracja/');
  await p.getByLabel('Imię', { exact: true }).fill(imie);
  await p.getByLabel('Nazwisko', { exact: true }).fill(nazwisko);
  await p.getByLabel('Adres e-mail').fill(email);
  await p.getByLabel('Hasło (min. 8 znaków)').fill(haslo);
  await p.getByLabel('Powtórz hasło').fill(haslo);
  await p.getByRole('checkbox').check();
  await p.getByRole('button', { name: 'Załóż konto' }).click();
  await p.getByRole('heading', { name: 'Sprawdź skrzynkę' }).waitFor();
}
async function zaloguj(p, email, haslo = 'haslo12345') {
  await p.goto(B + '/logowanie/');
  await p.getByLabel('Adres e-mail').fill(email);
  await p.getByLabel('Hasło', { exact: true }).fill(haslo);
  await p.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
  await p.waitForURL('**/profil/');
}
async function dodajOsobePanelem(p, przycisk, pola, wyslij, id, oczekiwane) {
  await p.getByRole('button', { name: przycisk }).click();
  for (const [etykieta, wartosc] of Object.entries(pola)) await p.getByLabel(etykieta).first().fill(wartosc);
  await p.getByRole('button', { name: wyslij, exact: true }).click();
  await czekajNaOsoby(id, oczekiwane);
}


module.exports = { czekajNaOsoby, B, AUTH, FS, P, ok, wyniki, bledy, wyczysc, potwierdzEmail, uidPo, nadajAdmina, dokument, nowaKarta, rejestruj, zaloguj, dodajOsobePanelem };
