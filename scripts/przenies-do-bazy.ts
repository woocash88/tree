/**
 * Przenosi drzewo z repozytorium (data/drzewa/<slug>/) do bazy Firestore jako drzewo wskazanego użytkownika.
 * Działa z uprawnieniami konta serwisowego (Firebase Admin SDK), więc uruchamia się go z GitHub Actions
 * (workflow „Przenieś drzewo do bazy”), a nie z przeglądarki:
 *
 *   npx tsx scripts/przenies-do-bazy.ts --slug lulkiewicz --imie Łukasz --nazwisko Stanisławski [--uid UID] [--zastap]
 *
 * - właściciela wskazuje się imieniem i nazwiskiem z profilu (musi się zarejestrować i być jedyną taką osobą)
 *   albo bezpośrednio przez --uid (UID z konsoli Firebase → Authentication → Users),
 * - dane trafiają do dokumentów dane/pelne (komplet) i dane/publiczne (okrojone wg polityki dat osób żyjących),
 * - drzewo jest tworzone raz: kolejne uruchomienie nic nie zmienia, chyba że podano --zastap (nadpisuje dane),
 * - w logu nie ma adresów e-mail (logi Actions bywają publiczne).
 *
 * Do testów lokalnych działa z emulatorami (FIRESTORE_EMULATOR_HOST).
 */
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { wczytajDrzewo } from "../lib/drzewa-pliki";
import { daneDlaGosci, doFirestore, sprawdzDane, statystykiDanych, zakresLatDanych } from "../lib/baza/logika";
import type { DaneDb, MetaDb, Profil } from "../lib/baza/typy";
import { normalizuj } from "../lib/format";

function argumenty(): Record<string, string> {
  const wynik: Record<string, string> = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) continue;
    const klucz = a[i].slice(2);
    wynik[klucz] = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : "true";
  }
  return wynik;
}

async function main() {
  const arg = argumenty();
  const slug = arg.slug;
  if (!slug) throw new Error("Podaj --slug <drzewo z data/drzewa/>.");
  const { meta: plikMeta, rodzina } = wczytajDrzewo(slug);
  const dane: DaneDb = { galezie: rodzina.galezie, osoby: rodzina.osoby, malzenstwa: rodzina.malzenstwa };
  sprawdzDane(dane);

  const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || (emulator ? "przodkowie-test" : undefined);
  if (!projectId) throw new Error("Brak identyfikatora projektu (zmienna FIREBASE_PROJECT_ID).");
  if (!getApps().length) initializeApp(emulator ? { projectId } : { projectId, credential: applicationDefault() });
  const db = getFirestore();

  // ── właściciel ──
  let uid = arg.uid;
  let profil: Profil | undefined;
  if (uid) {
    const snap = await db.doc(`uzytkownicy/${uid}`).get();
    if (!snap.exists) throw new Error(`Nie ma użytkownika o podanym UID (brak profilu).`);
    profil = snap.data() as Profil;
  } else {
    if (!arg.imie || !arg.nazwisko) throw new Error("Podaj --imie i --nazwisko właściciela albo --uid.");
    const wszyscy = await db.collection("uzytkownicy").get();
    const klucz = (i: string, n: string) => `${normalizuj(i)} ${normalizuj(n)}`;
    const pasujace = wszyscy.docs.filter((d) => {
      const p = d.data() as Profil;
      return klucz(p.imie, p.nazwisko) === klucz(arg.imie, arg.nazwisko);
    });
    if (pasujace.length === 0) {
      // Nie wypisujemy listy użytkowników – logi Actions bywają publiczne.
      throw new Error(`Nie znaleziono użytkownika „${arg.imie} ${arg.nazwisko}” wśród ${wszyscy.size} zarejestrowanych. Zarejestruj się w serwisie (z tym imieniem i nazwiskiem w profilu) albo podaj --uid z konsoli Firebase.`);
    }
    if (pasujace.length > 1) {
      throw new Error(`Pod nazwą „${arg.imie} ${arg.nazwisko}” jest ${pasujace.length} użytkowników – podaj --uid. UID-y: ${pasujace.map((d) => d.id).join(", ")}.`);
    }
    uid = pasujace[0].id;
    profil = pasujace[0].data() as Profil;
  }
  console.log(`Właściciel: ${profil.imie} ${profil.nazwisko} (UID ${uid}).`);

  // ── czy już przeniesione ──
  const istniejace = await db.collection("drzewa").where("wlascicielId", "==", uid).where("nazwa", "==", plikMeta.nazwa).get();
  if (!istniejace.empty && arg.zastap !== "true") {
    console.log(`Drzewo „${plikMeta.nazwa}” jest już w bazie (id ${istniejace.docs[0].id}) – nic nie zmieniam. Użyj --zastap, żeby nadpisać jego dane.`);
    return;
  }

  // ── zapis ──
  const publiczne = daneDlaGosci(dane, plikMeta.politykaDatZyjacych);
  const zrodlo = plikMeta.zrodlo ? ` Źródło danych: ${plikMeta.zrodlo.nazwa} (${plikMeta.zrodlo.url}).` : "";
  const teraz = new Date();
  const meta: MetaDb = {
    nazwa: plikMeta.nazwa,
    opis: `${plikMeta.opis}${zrodlo}`.slice(0, 1000),
    region: plikMeta.region,
    widocznosc: plikMeta.widocznosc,
    politykaDatZyjacych: plikMeta.politykaDatZyjacych,
    wlascicielId: uid,
    wlascicielNazwa: `${profil.imie} ${profil.nazwisko}`,
    kolaboranci: [],
    kolaboranciInfo: {},
    zakresLat: zakresLatDanych(publiczne),
    statystyki: statystykiDanych(dane),
    utworzono: teraz.toISOString(),
    zaktualizowano: teraz.toISOString().slice(0, 10),
  };
  const ref = istniejace.empty ? db.collection("drzewa").doc() : istniejace.docs[0].ref;
  if (istniejace.empty) await ref.set(doFirestore(meta));
  else await ref.update({ zakresLat: meta.zakresLat, statystyki: meta.statystyki, zaktualizowano: meta.zaktualizowano });
  await ref.collection("dane").doc("pelne").set(doFirestore(dane));
  await ref.collection("dane").doc("publiczne").set(doFirestore(publiczne));
  console.log(`Gotowe: drzewo „${meta.nazwa}” (${dane.osoby.length} osób, ${dane.malzenstwa.length} małżeństw) zapisano w bazie, id ${ref.id}, widoczność: ${meta.widocznosc}, osoby żyjące: ${meta.politykaDatZyjacych}.`);
  console.log(`Adres: /d/?id=${ref.id}`);
}

main().catch((e) => {
  console.error(`BŁĄD: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
