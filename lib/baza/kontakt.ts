/**
 * Wysyłanie wiadomości z formularza kontaktowego (tylko przeglądarka). Dwa kanały:
 *  1. zapis w bazie (kolekcja „wiadomosci”, odczyt tylko w panelu administratora) – działa zawsze, gdy konta są skonfigurowane,
 *  2. e-mail do administratora przez usługę Web3Forms – tylko po ustawieniu klucza (NEXT_PUBLIC_KONTAKT_KLUCZ). Adres administratora
 *     jest przypisany do klucza po stronie usługi, więc nie występuje w kodzie strony.
 * Wiadomość uznajemy za wysłaną, gdy udał się przynajmniej jeden kanał.
 */
import { firebaseSkonfigurowany } from "./firebase";
import { zapiszWiadomosc, type TematWiadomosci, TEMATY_WIADOMOSCI } from "./api";

export const KLUCZ_KONTAKTU = process.env.NEXT_PUBLIC_KONTAKT_KLUCZ || "";
/** Formularz jest dostępny, gdy działa choć jeden kanał. */
export const KONTAKT_WLACZONY = firebaseSkonfigurowany || !!KLUCZ_KONTAKTU;

export const MAKS_TRESC_WIADOMOSCI = 4000;
const WZOR_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DaneKontaktu = { imie: string; email: string; temat: TematWiadomosci; tresc: string; uid?: string | null };

/** Sprawdza pola formularza; zwraca komunikat błędu albo pusty tekst. */
export function bladKontaktu(d: DaneKontaktu): string {
  if (!d.imie.trim()) return "Podaj imię lub nazwę, żebyśmy wiedzieli, jak się zwracać.";
  if (d.imie.trim().length > 100) return "Imię może mieć najwyżej 100 znaków.";
  if (!WZOR_EMAIL.test(d.email.trim())) return "Podaj poprawny adres e-mail, na który mamy odpowiedzieć.";
  if (!TEMATY_WIADOMOSCI.some((t) => t.id === d.temat)) return "Wybierz temat wiadomości.";
  if (d.tresc.trim().length < 10) return "Napisz kilka słów więcej – wiadomość jest zbyt krótka.";
  if (d.tresc.length > MAKS_TRESC_WIADOMOSCI) return `Wiadomość może mieć najwyżej ${MAKS_TRESC_WIADOMOSCI} znaków.`;
  return "";
}

async function wyslijMailem(d: DaneKontaktu): Promise<boolean> {
  if (!KLUCZ_KONTAKTU) return false;
  const temat = TEMATY_WIADOMOSCI.find((t) => t.id === d.temat)?.nazwa ?? d.temat;
  try {
    const odp = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ access_key: KLUCZ_KONTAKTU, subject: `Przodkowie – ${temat}`, from_name: d.imie.trim(), email: d.email.trim(), message: d.tresc.trim(), botcheck: "" }),
    });
    const wynik = (await odp.json().catch(() => ({}))) as { success?: boolean };
    return odp.ok && wynik.success !== false;
  } catch {
    return false;
  }
}

/** Wysyła wiadomość. Rzuca błąd, gdy nie udał się żaden kanał. */
export async function wyslijWiadomosc(d: DaneKontaktu): Promise<{ wBazie: boolean; mailem: boolean }> {
  const blad = bladKontaktu(d);
  if (blad) throw new Error(blad);
  const teraz = new Date().toISOString();
  const [wBazie, mailem] = await Promise.all([
    firebaseSkonfigurowany
      ? zapiszWiadomosc({ imie: d.imie.trim(), email: d.email.trim(), temat: d.temat, tresc: d.tresc.trim(), utworzono: teraz, ...(d.uid ? { uid: d.uid } : {}) }).then(() => true, () => false)
      : Promise.resolve(false),
    wyslijMailem(d),
  ]);
  if (!wBazie && !mailem) throw new Error("Nie udało się wysłać wiadomości. Sprawdź połączenie z internetem i spróbuj ponownie za chwilę.");
  return { wBazie, mailem };
}
