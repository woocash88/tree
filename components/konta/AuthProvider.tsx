"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { firebaseSkonfigurowany, pobierzFirebase } from "@/lib/baza/firebase";
import { odswiezUzytkownika, wczytajProfil, zapewnijAdres } from "@/lib/baza/konta";
import type { Profil } from "@/lib/baza/typy";

export type StanKonta = {
  /** wylaczone – brak konfiguracji Firebase; ladowanie – sprawdzamy sesję; gosc – niezalogowany. */
  status: "wylaczone" | "ladowanie" | "gosc" | "zalogowany";
  uid: string | null;
  email: string | null;
  zweryfikowany: boolean;
  profil: Profil | null;
  czyAdmin: boolean;
  zablokowany: boolean;
  /** Ponownie wczytuje użytkownika i profil (np. po potwierdzeniu adresu e-mail). */
  odswiez: () => Promise<void>;
};

const bazowy: Omit<StanKonta, "odswiez"> = { status: "ladowanie", uid: null, email: null, zweryfikowany: false, profil: null, czyAdmin: false, zablokowany: false };
const Kontekst = createContext<StanKonta>({ ...bazowy, status: "wylaczone", odswiez: async () => {} });

export const useKonto = () => useContext(Kontekst);
/** Czy zalogowany użytkownik jest administratorem serwisu (dokument admini/{uid}). */
export const useCzyAdmin = () => useContext(Kontekst).czyAdmin;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [stan, setStan] = useState<Omit<StanKonta, "odswiez">>(firebaseSkonfigurowany ? bazowy : { ...bazowy, status: "wylaczone" });
  const anuluj = useRef(false);

  const wczytaj = useCallback(async (u: import("firebase/auth").User | null) => {
    if (!u) {
      if (!anuluj.current) setStan({ ...bazowy, status: "gosc" });
      return;
    }
    // Adres potwierdzono, ale token logowania (z którego korzystają reguły bazy) może jeszcze mieć starą informację
    // (np. link kliknięty przed wejściem na stronę) – wymuszamy jego odświeżenie, inaczej zapisy byłyby odrzucane.
    try {
      if (u.emailVerified && (await u.getIdTokenResult()).claims.email_verified !== true) await u.getIdToken(true);
    } catch {
      /* brak sieci – odświeżenie nastąpi przy kolejnej próbie */
    }
    const { db } = await pobierzFirebase();
    const F = await import("firebase/firestore");
    let czyAdmin = false;
    let zablokowany = false;
    let profil: Profil | null = null;
    try {
      const [a, b] = await Promise.all([F.getDoc(F.doc(db, "admini", u.uid)), F.getDoc(F.doc(db, "blokady", u.uid))]);
      czyAdmin = a.exists();
      zablokowany = b.exists();
      if (!zablokowany) {
        profil = await wczytajProfil(u);
        if (profil) await zapewnijAdres(u, profil);
      }
    } catch (e) {
      // Błąd sieci lub reguł: pokazujemy użytkownika bez profilu, strony same zgłoszą problem.
      console.error("Nie udało się wczytać konta:", e);
    }
    if (!anuluj.current) setStan({ status: "zalogowany", uid: u.uid, email: u.email, zweryfikowany: u.emailVerified, profil, czyAdmin, zablokowany });
  }, []);

  useEffect(() => {
    if (!firebaseSkonfigurowany) return;
    anuluj.current = false;
    let wypisz = () => {};
    (async () => {
      const [{ auth }, A] = await Promise.all([pobierzFirebase(), import("firebase/auth")]);
      wypisz = A.onAuthStateChanged(auth, (u) => void wczytaj(u));
    })().catch(() => setStan({ ...bazowy, status: "gosc" }));
    return () => {
      anuluj.current = true;
      wypisz();
    };
  }, [wczytaj]);

  const odswiez = useCallback(async () => {
    const { auth } = await pobierzFirebase();
    if (auth.currentUser) await odswiezUzytkownika();
    await wczytaj(auth.currentUser);
  }, [wczytaj]);

  // Użytkownik kliknął link potwierdzający w innej karcie: sprawdzamy to sami (co kilka sekund i po powrocie na kartę).
  const czekaNaWeryfikacje = stan.status === "zalogowany" && !stan.zweryfikowany && !stan.zablokowany;
  useEffect(() => {
    if (!czekaNaWeryfikacje) return;
    const sprawdz = () => void odswiez().catch(() => {});
    const timer = setInterval(sprawdz, 4000);
    window.addEventListener("focus", sprawdz);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", sprawdz);
    };
  }, [czekaNaWeryfikacje, odswiez]);

  const wartosc = useMemo(() => ({ ...stan, odswiez }), [stan, odswiez]);
  return <Kontekst.Provider value={wartosc}>{children}</Kontekst.Provider>;
}
