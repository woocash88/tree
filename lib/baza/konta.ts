/** Konta użytkowników: rejestracja, logowanie (e-mail i Google), profil, usuwanie konta. Tylko przeglądarka. */
import type { User } from "firebase/auth";
import { pobierzFirebase } from "./firebase";
import { usunDaneUzytkownika } from "./api";
import type { Profil } from "./typy";

export { adresId } from "./konta-adres";
import { adresId } from "./konta-adres";

let rejestracjaWToku = false;
let kontoUsuwane = false;
/** Prawda od chwili rozpoczęcia usuwania własnego konta – strony nie przekierowują wtedy do logowania. */
export const czyKontoUsuwane = () => kontoUsuwane;
export const zakonczUsuwanieKonta = () => {
  kontoUsuwane = false;
};
export const czyRejestracjaWToku = () => rejestracjaWToku;

const KOMUNIKATY: Record<string, string> = {
  "auth/email-already-in-use": "Konto z tym adresem e-mail już istnieje. Zaloguj się albo użyj opcji „Nie pamiętam hasła”.",
  "auth/invalid-email": "Niepoprawny adres e-mail.",
  "auth/weak-password": "Hasło jest zbyt słabe – użyj co najmniej 8 znaków.",
  "auth/invalid-credential": "Nieprawidłowy adres e-mail lub hasło.",
  "auth/wrong-password": "Nieprawidłowy adres e-mail lub hasło.",
  "auth/user-not-found": "Nieprawidłowy adres e-mail lub hasło.",
  "auth/too-many-requests": "Zbyt wiele prób. Spróbuj ponownie za kilka minut.",
  "auth/popup-closed-by-user": "Okno logowania Google zostało zamknięte.",
  "auth/cancelled-popup-request": "Okno logowania Google zostało zamknięte.",
  "auth/popup-blocked": "Przeglądarka zablokowała okno logowania Google. Zezwól na wyskakujące okna dla tej strony.",
  "auth/network-request-failed": "Brak połączenia z internetem albo z serwerem.",
  "auth/requires-recent-login": "Ze względów bezpieczeństwa zaloguj się ponownie i spróbuj jeszcze raz.",
  "auth/operation-not-allowed": "Ten sposób logowania nie jest włączony w projekcie Firebase (Authentication → Metoda logowania).",
  "auth/unauthorized-domain": "Ta domena nie jest dozwolona w projekcie Firebase (Authentication → Ustawienia → Autoryzowane domeny).",
  "auth/internal-error": "Błąd wewnętrzny logowania. Zwykle pomaga włączenie logowania Google w konsoli Firebase albo wyłączenie blokady wyskakujących okien i ciasteczek innych firm.",
  "auth/account-exists-with-different-credential": "Konto z tym adresem e-mail istnieje, ale zostało założone innym sposobem logowania (np. hasłem). Zaloguj się nim.",
  "auth/web-storage-unsupported": "Przeglądarka blokuje pamięć strony, której potrzebuje logowanie. Wyłącz tryb prywatny albo zezwól na dane stron.",
  "auth/invalid-api-key": "Nieprawidłowy klucz API Firebase w konfiguracji strony (zmienna FIREBASE_API_KEY).",
  "auth/app-not-authorized": "Ta aplikacja nie jest autoryzowana w projekcie Firebase.",
  "permission-denied": "Brak uprawnień do tej operacji.",
  unavailable: "Serwer jest chwilowo niedostępny. Spróbuj ponownie.",
};

/** Czytelny, polski komunikat dla błędów Firebase i własnych. */
export function komunikatBledu(e: unknown): string {
  const kod = (e as { code?: string })?.code;
  if (kod && KOMUNIKATY[kod]) return KOMUNIKATY[kod];
  if (e instanceof Error && !kod) return e.message;
  // Nieznany błąd: pokazujemy jego kod, żeby dało się go zdiagnozować.
  return `Coś poszło nie tak${kod ? ` (${kod})` : ""}. Spróbuj ponownie.`;
}

export type DaneRejestracji = { imie: string; nazwisko: string; email: string; haslo: string };

export async function zarejestruj({ imie, nazwisko, email, haslo }: DaneRejestracji): Promise<void> {
  const { auth, db } = await pobierzFirebase();
  const A = await import("firebase/auth");
  const F = await import("firebase/firestore");
  rejestracjaWToku = true;
  try {
    const { user } = await A.createUserWithEmailAndPassword(auth, email.trim(), haslo);
    await A.updateProfile(user, { displayName: `${imie.trim()} ${nazwisko.trim()}` });
    await F.setDoc(F.doc(db, "uzytkownicy", user.uid), { imie: imie.trim(), nazwisko: nazwisko.trim(), email: user.email, utworzono: new Date().toISOString() });
    await A.sendEmailVerification(user);
  } finally {
    rejestracjaWToku = false;
  }
}

export async function zalogujEmail(email: string, haslo: string): Promise<void> {
  const { auth } = await pobierzFirebase();
  const A = await import("firebase/auth");
  await A.signInWithEmailAndPassword(auth, email.trim(), haslo);
}

export async function zalogujGoogle(): Promise<void> {
  const { auth } = await pobierzFirebase();
  const A = await import("firebase/auth");
  await A.signInWithPopup(auth, new A.GoogleAuthProvider());
}

export async function wyloguj(): Promise<void> {
  const { auth } = await pobierzFirebase();
  await (await import("firebase/auth")).signOut(auth);
}

export async function resetHasla(email: string): Promise<void> {
  const { auth } = await pobierzFirebase();
  await (await import("firebase/auth")).sendPasswordResetEmail(auth, email.trim());
}

export async function wyslijWeryfikacje(): Promise<void> {
  const { auth } = await pobierzFirebase();
  if (!auth.currentUser) throw new Error("Nie jesteś zalogowany.");
  await (await import("firebase/auth")).sendEmailVerification(auth.currentUser);
}

/** Po kliknięciu linku w e-mailu: odświeża użytkownika i token (reguły widzą wtedy email_verified = true). */
export async function odswiezUzytkownika(): Promise<boolean> {
  const { auth } = await pobierzFirebase();
  if (!auth.currentUser) return false;
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return auth.currentUser.emailVerified;
}

const podzielNazwe = (nazwa: string | null | undefined): { imie: string; nazwisko: string } => {
  const czesci = (nazwa ?? "").trim().split(/\s+/).filter(Boolean);
  return { imie: czesci[0] ?? "", nazwisko: czesci.slice(1).join(" ") };
};

/** Wczytuje profil; dla nowego konta Google zakłada go z nazwy konta (użytkownik może go poprawić w profilu). */
export async function wczytajProfil(user: User): Promise<Profil | null> {
  const { db } = await pobierzFirebase();
  const F = await import("firebase/firestore");
  const ref = F.doc(db, "uzytkownicy", user.uid);
  const snap = await F.getDoc(ref);
  if (snap.exists()) return snap.data() as Profil;
  if (czyRejestracjaWToku()) return null;
  const { imie, nazwisko } = podzielNazwe(user.displayName);
  const profil: Profil = { imie: imie || "Użytkownik", nazwisko: nazwisko || "—", email: user.email ?? "", utworzono: new Date().toISOString() };
  await F.setDoc(ref, profil);
  return profil;
}

/**
 * Publikuje adres w rejestrze kolaborantów (tylko dla potwierdzonych adresów), żeby można było zaprosić użytkownika.
 * Tuż po potwierdzeniu adresu Firestore przez chwilę może jeszcze używać starego tokenu (bez email_verified),
 * dlatego odmowę dostępu ponawiamy kilka razy z rosnącą przerwą.
 */
export async function zapewnijAdres(user: User, profil: Profil): Promise<void> {
  if (!user.emailVerified || !user.email) return;
  const { db } = await pobierzFirebase();
  const F = await import("firebase/firestore");
  const ref = F.doc(db, "adresy", adresId(user.email));
  const nazwa = `${profil.imie} ${profil.nazwisko}`.trim();
  for (let proba = 0; ; proba++) {
    try {
      const snap = await F.getDoc(ref);
      if (!snap.exists() || snap.data().nazwa !== nazwa) await F.setDoc(ref, { uid: user.uid, nazwa });
      return;
    } catch (e) {
      if ((e as { code?: string }).code !== "permission-denied" || proba >= 4) throw e;
      await new Promise((r) => setTimeout(r, 600 * (proba + 1)));
    }
  }
}

export async function zapiszProfil(uid: string, imie: string, nazwisko: string): Promise<void> {
  const { auth, db } = await pobierzFirebase();
  const F = await import("firebase/firestore");
  await F.updateDoc(F.doc(db, "uzytkownicy", uid), { imie: imie.trim(), nazwisko: nazwisko.trim() });
  if (auth.currentUser) await (await import("firebase/auth")).updateProfile(auth.currentUser, { displayName: `${imie.trim()} ${nazwisko.trim()}` });
}

/** Potwierdzenie tożsamości przed usunięciem konta (hasłem albo ponownym logowaniem Google). */
export async function potwierdzTozsamosc(haslo?: string): Promise<void> {
  const { auth } = await pobierzFirebase();
  const A = await import("firebase/auth");
  const user = auth.currentUser;
  if (!user) throw new Error("Nie jesteś zalogowany.");
  if (user.providerData.some((p) => p.providerId === "google.com")) await A.reauthenticateWithPopup(user, new A.GoogleAuthProvider());
  else await A.reauthenticateWithCredential(user, A.EmailAuthProvider.credential(user.email ?? "", haslo ?? ""));
}

/** Usuwa konto użytkownika razem z jego drzewami, profilem i wpisem w rejestrze adresów. */
export async function usunWlasneKonto(haslo?: string): Promise<void> {
  const { auth } = await pobierzFirebase();
  const user = auth.currentUser;
  if (!user) throw new Error("Nie jesteś zalogowany.");
  // Flaga od samego początku: zmiany stanu logowania w trakcie potwierdzania tożsamości nie mogą wywołać przekierowania.
  kontoUsuwane = true;
  try {
    await potwierdzTozsamosc(haslo);
    await usunDaneUzytkownika(user.uid, user.email ?? "", { zablokuj: false });
    await (await import("firebase/auth")).deleteUser(user);
  } catch (e) {
    kontoUsuwane = false;
    throw e;
  }
}
