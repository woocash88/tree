/**
 * Inicjalizacja Firebase w przeglądarce. Pakiety Firebase ładują się dopiero, gdy są potrzebne (import dynamiczny),
 * więc statyczne strony drzew nie płacą za nie rozmiarem. Konfiguracja pochodzi ze zmiennych NEXT_PUBLIC_FIREBASE_*
 * (to są publiczne identyfikatory projektu, nie sekrety); bez nich konta są wyłączone, a strona działa jak dotąd.
 */
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const KONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
/**
 * Klucz witryny reCAPTCHA v3 dla Firebase App Check (opcjonalny). Z kluczem każde żądanie do bazy niesie token potwierdzający,
 * że pochodzi z tej strony – po włączeniu „Enforce” w konsoli Firebase baza odrzuca żądania spoza niej (skrypty, boty).
 * Uwaga: reCAPTCHA ładuje skrypt Google u każdego odwiedzającego, dlatego jest opt-in.
 */
export const KLUCZ_APP_CHECK = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_KEY || "";
// "enterprise" (klucz z Google Cloud / reCAPTCHA Enterprise) albo "v3" (klucz klasyczny).
const TYP_APP_CHECK = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_TYP === "v3" ? "v3" : "enterprise";
/** Tryb testów lokalnych na emulatorach Firebase (npm run test:e2e). */
const EMULATOR = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "1";

export const firebaseSkonfigurowany: boolean = EMULATOR || !!(KONFIG.apiKey && KONFIG.projectId && KONFIG.appId);

export type Firebase = { auth: Auth; db: Firestore };
let obietnica: Promise<Firebase> | null = null;

export function pobierzFirebase(): Promise<Firebase> {
  if (!firebaseSkonfigurowany) return Promise.reject(new Error("Konta użytkowników nie są jeszcze skonfigurowane w tym serwisie."));
  obietnica ??= (async () => {
    const [{ initializeApp, getApps }, { getAuth, connectAuthEmulator }, { getFirestore, connectFirestoreEmulator }] = await Promise.all([import("firebase/app"), import("firebase/auth"), import("firebase/firestore")]);
    const projectId = KONFIG.projectId ?? "przodkowie-test";
    const app = getApps()[0] ?? initializeApp({ apiKey: KONFIG.apiKey ?? "klucz-emulatora", authDomain: KONFIG.authDomain ?? `${projectId}.firebaseapp.com`, projectId, appId: KONFIG.appId ?? "1:0:web:0" });
    if (KLUCZ_APP_CHECK && !EMULATOR) {
      // App Check musi być zainicjowany przed pierwszym użyciem Firestore i Auth.
      const { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } = await import("firebase/app-check");
      const provider = TYP_APP_CHECK === "v3" ? new ReCaptchaV3Provider(KLUCZ_APP_CHECK) : new ReCaptchaEnterpriseProvider(KLUCZ_APP_CHECK);
      initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true });
    }
    const auth = getAuth(app);
    const db = getFirestore(app);
    if (EMULATOR) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      // Tylko wersja testowa (NEXT_PUBLIC_FIREBASE_EMULATOR=1): logowanie sztucznym poświadczeniem Google,
      // bo okno logowania Google pobiera skrypty z internetu, niedostępnego w testach. W produkcji ten kod nie istnieje.
      const { GoogleAuthProvider, signInWithCredential } = await import("firebase/auth");
      (window as unknown as Record<string, unknown>).__testGoogle = (email: string, name: string) =>
        signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: `g-${email}`, email, email_verified: true, name })));
    }
    return { auth, db };
  })();
  return obietnica;
}
