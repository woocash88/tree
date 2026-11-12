/**
 * Tryb administratora. Serwis jest statyczny (bez serwera), więc „logowanie” odbywa się w przeglądarce:
 * hasło jest porównywane ze skrótem PBKDF2 zapisanym w data/admin.json (npm run ustaw-haslo).
 *
 * To NIE jest zabezpieczenie danych – skrót i cały kod są w publicznych plikach strony. Tryb administratora
 * tylko odsłania narzędzia edycji. Zmiany i tak zapisują się lokalnie w przeglądarce, a do serwisu trafiają
 * dopiero przez repozytorium (plik JSON + skrypt + commit), więc faktyczną kontrolą dostępu jest prawo zapisu
 * do repozytorium.
 */
import konfiguracja from "../data/admin.json";

export type KonfiguracjaAdmina = { sol: string; iteracje: number; skrot: string };
const KONFIGURACJA = konfiguracja as KonfiguracjaAdmina;

/** Skrót, z którym porównujemy hasło; pusty = tryb administratora wyłączony. */
export const SKROT_ADMINA = KONFIGURACJA.skrot;

const hex = (bajty: ArrayBuffer) => [...new Uint8Array(bajty)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** PBKDF2-SHA256 przez WebCrypto (przeglądarka i Node 20+). Wymaga bezpiecznego kontekstu: https albo localhost. */
export async function skrotHasla(haslo: string, sol: string, iteracje: number): Promise<string> {
  const koder = new TextEncoder();
  const klucz = await crypto.subtle.importKey("raw", koder.encode(haslo), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: koder.encode(sol), iterations: iteracje }, klucz, 256));
}

export async function sprawdzHaslo(haslo: string, k: KonfiguracjaAdmina = KONFIGURACJA): Promise<boolean> {
  if (!k.skrot || !haslo) return false;
  return (await skrotHasla(haslo, k.sol, k.iteracje)) === k.skrot;
}
