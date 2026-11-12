/** Operacje na danych drzew w Firestore (tylko przeglądarka). Wszystkie zapisy danych idą przez transakcję. */
import { adresId } from "./konta-adres";
import { pobierzFirebase } from "./firebase";
import { daneDlaGosci, doFirestore, pusteDane, sprawdzDane, statystykiDanych, zakresLatDanych } from "./logika";
import type { Dostep, DaneDb, MetaDb, Profil, Prosba, Widocznosc } from "./typy";
import { MAKS_KOLABORANTOW } from "./typy";
import type { PolitykaDat } from "../schemat-drzewa";

async function fs() {
  const { db } = await pobierzFirebase();
  const F = await import("firebase/firestore");
  return { db, F };
}

const dzis = () => new Date().toISOString().slice(0, 10);

export type WpisDrzewa = { id: string; meta: MetaDb };

export type WynikWczytania =
  | { stan: "ok"; id: string; meta: MetaDb; dostep: Dostep; dane: DaneDb }
  | { stan: "brak" }
  | { stan: "zakaz" };

export function ustalDostep(meta: MetaDb, uid: string | null, czyAdmin: boolean): Dostep {
  if (uid && meta.wlascicielId === uid) return "wlasciciel";
  if (uid && meta.kolaboranci.includes(uid)) return "kolaborant";
  return czyAdmin ? "admin" : "gosc";
}

/** Wczytuje drzewo: pełne dane dla zarządzających, okrojone (po polityce dat) dla pozostałych. */
export async function wczytajDrzewo(id: string, uid: string | null, czyAdmin: boolean): Promise<WynikWczytania> {
  const { db, F } = await fs();
  let metaSnap;
  try {
    metaSnap = await F.getDoc(F.doc(db, "drzewa", id));
  } catch (e) {
    if ((e as { code?: string }).code === "permission-denied") return { stan: "zakaz" };
    throw e;
  }
  if (!metaSnap.exists()) return { stan: "brak" };
  const meta = metaSnap.data() as MetaDb;
  const dostep = ustalDostep(meta, uid, czyAdmin);
  const daneSnap = await F.getDoc(F.doc(db, "drzewa", id, "dane", dostep === "gosc" ? "publiczne" : "pelne"));
  return { stan: "ok", id, meta, dostep, dane: daneSnap.exists() ? (daneSnap.data() as DaneDb) : pusteDane() };
}

export type NoweDrzewo = { nazwa: string; opis: string; region: string; widocznosc: Widocznosc; politykaDatZyjacych: PolitykaDat };

export async function utworzDrzewo(dane: NoweDrzewo, uid: string, wlascicielNazwa: string): Promise<string> {
  const { db, F } = await fs();
  const ref = F.doc(F.collection(db, "drzewa"));
  const teraz = new Date().toISOString();
  const meta: MetaDb = {
    nazwa: dane.nazwa.trim(),
    opis: dane.opis.trim(),
    region: dane.region.trim(),
    widocznosc: dane.widocznosc,
    politykaDatZyjacych: dane.politykaDatZyjacych,
    wlascicielId: uid,
    wlascicielNazwa,
    kolaboranci: [],
    kolaboranciInfo: {},
    zakresLat: null,
    statystyki: { osob: 0, pokolen: 0, galezi: 1 },
    utworzono: teraz,
    zaktualizowano: teraz.slice(0, 10),
  };
  await F.setDoc(ref, meta);
  // Dane zapisujemy po utworzeniu drzewa – reguły sprawdzają członkostwo w istniejącym dokumencie drzewa.
  await F.setDoc(F.doc(db, "drzewa", ref.id, "dane", "pelne"), pusteDane());
  await F.setDoc(F.doc(db, "drzewa", ref.id, "dane", "publiczne"), pusteDane());
  return ref.id;
}

/**
 * Zapis zmiany danych drzewa w transakcji: ta sama funkcja, którą widok zastosował od razu, jest ponownie
 * zastosowana do najnowszych danych z serwera, więc równoległe edycje kolaborantów się nie gubią.
 */
export async function zapiszDane(id: string, zmiana: (d: DaneDb) => DaneDb): Promise<void> {
  const { db, F } = await fs();
  await F.runTransaction(db, async (tx) => {
    const mRef = F.doc(db, "drzewa", id);
    const pelneRef = F.doc(db, "drzewa", id, "dane", "pelne");
    const publRef = F.doc(db, "drzewa", id, "dane", "publiczne");
    const mSnap = await tx.get(mRef);
    if (!mSnap.exists()) throw new Error("To drzewo już nie istnieje.");
    const pSnap = await tx.get(pelneRef);
    const meta = mSnap.data() as MetaDb;
    const nowe = zmiana(pSnap.exists() ? (pSnap.data() as DaneDb) : pusteDane());
    sprawdzDane(nowe);
    const publiczne = daneDlaGosci(nowe, meta.politykaDatZyjacych);
    tx.set(pelneRef, doFirestore(nowe));
    tx.set(publRef, doFirestore(publiczne));
    tx.update(mRef, { statystyki: statystykiDanych(nowe), zakresLat: zakresLatDanych(publiczne), zaktualizowano: dzis() });
  });
}

export type UstawieniaDrzewa = Pick<MetaDb, "nazwa" | "opis" | "region" | "widocznosc" | "politykaDatZyjacych">;

/** Zmiana ustawień (tylko właściciel/administrator). Przy zmianie polityki dat kopia publiczna jest przeliczana od nowa. */
export async function zapiszUstawienia(id: string, u: UstawieniaDrzewa): Promise<void> {
  const { db, F } = await fs();
  await F.runTransaction(db, async (tx) => {
    const mRef = F.doc(db, "drzewa", id);
    const pelneRef = F.doc(db, "drzewa", id, "dane", "pelne");
    const mSnap = await tx.get(mRef);
    const pSnap = await tx.get(pelneRef);
    if (!mSnap.exists()) throw new Error("To drzewo już nie istnieje.");
    const pelne = pSnap.exists() ? (pSnap.data() as DaneDb) : pusteDane();
    const publiczne = daneDlaGosci(pelne, u.politykaDatZyjacych);
    tx.set(F.doc(db, "drzewa", id, "dane", "publiczne"), doFirestore(publiczne));
    tx.update(mRef, { nazwa: u.nazwa.trim(), opis: u.opis.trim(), region: u.region.trim(), widocznosc: u.widocznosc, politykaDatZyjacych: u.politykaDatZyjacych, zakresLat: zakresLatDanych(publiczne), zaktualizowano: dzis() });
  });
}

export async function dodajKolaboranta(id: string, email: string, wlascicielId: string, juz: number): Promise<{ uid: string; nazwa: string }> {
  const { db, F } = await fs();
  if (juz >= MAKS_KOLABORANTOW) throw new Error(`Drzewo może mieć najwyżej ${MAKS_KOLABORANTOW} kolaborantów.`);
  let snap;
  try {
    snap = await F.getDoc(F.doc(db, "adresy", adresId(email)));
  } catch {
    throw new Error("Nie można sprawdzić adresu. Upewnij się, że Twój adres e-mail jest potwierdzony.");
  }
  if (!snap.exists()) throw new Error("Nie ma zarejestrowanego użytkownika z potwierdzonym adresem e-mail, który wpisałeś. Poproś tę osobę o rejestrację w serwisie i potwierdzenie adresu.");
  const { uid, nazwa } = snap.data() as { uid: string; nazwa: string };
  if (uid === wlascicielId) throw new Error("To Ty jesteś właścicielem tego drzewa.");
  await F.updateDoc(F.doc(db, "drzewa", id), { kolaboranci: F.arrayUnion(uid), [`kolaboranciInfo.${uid}`]: { nazwa }, zaktualizowano: dzis() });
  return { uid, nazwa };
}

export async function usunKolaboranta(id: string, uid: string): Promise<void> {
  const { db, F } = await fs();
  await F.updateDoc(F.doc(db, "drzewa", id), { kolaboranci: F.arrayRemove(uid), [`kolaboranciInfo.${uid}`]: F.deleteField() });
}

export async function usunDrzewo(id: string): Promise<void> {
  const { db, F } = await fs();
  // Najpierw dane i prośby o dołączenie, potem dokument drzewa – reguły sprawdzają uprawnienia w dokumencie drzewa.
  await F.deleteDoc(F.doc(db, "drzewa", id, "dane", "pelne"));
  await F.deleteDoc(F.doc(db, "drzewa", id, "dane", "publiczne"));
  for (const p of await listaProsbDrzewa(id)) await F.deleteDoc(F.doc(db, "prosby", p.id));
  await F.deleteDoc(F.doc(db, "drzewa", id));
}

// ───────────────────────────── współpraca i własność ─────────────────────────────

const naProsby = (snap: { docs: { id: string; data: () => unknown }[] }): Prosba[] =>
  snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Prosba, "id">) })).sort((a, b) => a.utworzono.localeCompare(b.utworzono));

/** Zgłasza prośbę o dołączenie do drzewa jako kolaborant (dla drzewa prywatnego też – wystarczy znać jego identyfikator). */
export async function wyslijProsbe(drzewoId: string, uid: string, nazwa: string): Promise<void> {
  const { db, F } = await fs();
  try {
    await F.setDoc(F.doc(db, "prosby", `${drzewoId}_${uid}`), { drzewoId, uid, nazwa, utworzono: new Date().toISOString() });
  } catch (e) {
    if ((e as { code?: string }).code === "permission-denied") {
      throw new Error("Nie można wysłać prośby: drzewo nie istnieje, jesteś już jego właścicielem albo kolaborantem, albo Twój adres e-mail nie jest potwierdzony.");
    }
    throw e;
  }
}

export async function listaProsbDrzewa(drzewoId: string): Promise<Prosba[]> {
  const { db, F } = await fs();
  return naProsby(await F.getDocs(F.query(F.collection(db, "prosby"), F.where("drzewoId", "==", drzewoId))));
}

export async function listaMoichProsb(uid: string): Promise<Prosba[]> {
  const { db, F } = await fs();
  return naProsby(await F.getDocs(F.query(F.collection(db, "prosby"), F.where("uid", "==", uid))));
}

export async function usunProsbe(id: string): Promise<void> {
  const { db, F } = await fs();
  await F.deleteDoc(F.doc(db, "prosby", id));
}

/** Zatwierdza prośbę (właściciel): dopisuje użytkownika jako kolaboranta i usuwa prośbę. */
export async function zatwierdzProsbe(prosba: Prosba, juzKolaborantow: number): Promise<void> {
  if (juzKolaborantow >= MAKS_KOLABORANTOW) throw new Error(`Drzewo może mieć najwyżej ${MAKS_KOLABORANTOW} kolaborantów.`);
  const { db, F } = await fs();
  await F.updateDoc(F.doc(db, "drzewa", prosba.drzewoId), { kolaboranci: F.arrayUnion(prosba.uid), [`kolaboranciInfo.${prosba.uid}`]: { nazwa: prosba.nazwa }, zaktualizowano: dzis() });
  await F.deleteDoc(F.doc(db, "prosby", prosba.id));
}

/** Nazwa drzewa, jeśli użytkownik może je odczytać (drzewo publiczne albo własne); inaczej null. */
export async function nazwaDrzewa(drzewoId: string): Promise<string | null> {
  const { db, F } = await fs();
  try {
    const snap = await F.getDoc(F.doc(db, "drzewa", drzewoId));
    return snap.exists() ? (snap.data() as MetaDb).nazwa : null;
  } catch {
    return null;
  }
}

/** Kolaborant opuszcza drzewo. */
export const opuscDrzewo = usunKolaboranta;

/**
 * Przekazuje własność drzewa jednemu z jego kolaborantów. Dotychczasowy właściciel zostaje kolaborantem
 * (może wtedy później opuścić drzewo albo usunąć konto bez utraty drzewa).
 */
export async function przekazWlasnosc(drzewoId: string, meta: MetaDb, nowyWlascicielId: string): Promise<void> {
  const nowy = meta.kolaboranciInfo[nowyWlascicielId];
  if (!meta.kolaboranci.includes(nowyWlascicielId) || !nowy) throw new Error("Drzewo można przekazać tylko użytkownikowi, który jest jego kolaborantem.");
  const { db, F } = await fs();
  await F.updateDoc(F.doc(db, "drzewa", drzewoId), {
    wlascicielId: nowyWlascicielId,
    wlascicielNazwa: nowy.nazwa,
    kolaboranci: [...meta.kolaboranci.filter((u) => u !== nowyWlascicielId), meta.wlascicielId],
    [`kolaboranciInfo.${nowyWlascicielId}`]: F.deleteField(),
    [`kolaboranciInfo.${meta.wlascicielId}`]: { nazwa: meta.wlascicielNazwa },
    zaktualizowano: dzis(),
  });
}

const naWpisy = (snap: { docs: { id: string; data: () => unknown }[] }): WpisDrzewa[] => snap.docs.map((d) => ({ id: d.id, meta: d.data() as MetaDb }));

export async function listaPublicznych(): Promise<WpisDrzewa[]> {
  const { db, F } = await fs();
  return naWpisy(await F.getDocs(F.query(F.collection(db, "drzewa"), F.where("widocznosc", "==", "publiczne"), F.limit(300))));
}

export async function listaMoich(uid: string): Promise<{ wlasne: WpisDrzewa[]; wspolne: WpisDrzewa[] }> {
  const { db, F } = await fs();
  const [w, k] = await Promise.all([
    F.getDocs(F.query(F.collection(db, "drzewa"), F.where("wlascicielId", "==", uid))),
    F.getDocs(F.query(F.collection(db, "drzewa"), F.where("kolaboranci", "array-contains", uid))),
  ]);
  const porzadek = (a: WpisDrzewa, b: WpisDrzewa) => a.meta.nazwa.localeCompare(b.meta.nazwa, "pl");
  return { wlasne: naWpisy(w).sort(porzadek), wspolne: naWpisy(k).sort(porzadek) };
}

// ───────────────────────────── administrator ─────────────────────────────

export async function listaWszystkich(): Promise<WpisDrzewa[]> {
  const { db, F } = await fs();
  return naWpisy(await F.getDocs(F.collection(db, "drzewa"))).sort((a, b) => a.meta.nazwa.localeCompare(b.meta.nazwa, "pl"));
}

export type WpisUzytkownika = Profil & { uid: string };

export async function listaUzytkownikow(): Promise<WpisUzytkownika[]> {
  const { db, F } = await fs();
  const snap = await F.getDocs(F.collection(db, "uzytkownicy"));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Profil) })).sort((a, b) => `${a.nazwisko} ${a.imie}`.localeCompare(`${b.nazwisko} ${b.imie}`, "pl"));
}

/**
 * Usuwa dane użytkownika: jego drzewa, udział w cudzych drzewach, profil i wpis adresu. Administrator dodatkowo
 * blokuje konto (zablokuj = true), bo samego konta logowania nie da się usunąć bez serwera – patrz README.
 */
export async function usunDaneUzytkownika(uid: string, email: string, { zablokuj }: { zablokuj: boolean }): Promise<{ drzew: number }> {
  const { db, F } = await fs();
  const { wlasne, wspolne } = await listaMoich(uid);
  for (const d of wlasne) await usunDrzewo(d.id);
  for (const d of wspolne) await usunKolaboranta(d.id, uid);
  for (const p of await listaMoichProsb(uid)) await F.deleteDoc(F.doc(db, "prosby", p.id));
  if (email) await F.deleteDoc(F.doc(db, "adresy", adresId(email)));
  await F.deleteDoc(F.doc(db, "uzytkownicy", uid));
  if (zablokuj) await F.setDoc(F.doc(db, "blokady", uid), { email, od: new Date().toISOString() });
  return { drzew: wlasne.length };
}

export async function odblokujUzytkownika(uid: string): Promise<void> {
  const { db, F } = await fs();
  await F.deleteDoc(F.doc(db, "blokady", uid));
}
