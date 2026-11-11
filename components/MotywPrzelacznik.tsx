"use client";

/**
 * Przełącznik motywu jasny/ciemny. Wybór zapamiętujemy w localStorage (w try/catch – w trybie
 * prywatnym lub z zablokowanymi danymi strony przeglądarka może rzucić wyjątek). Początkowy motyw
 * ustawia mały skrypt w <head> (app/layout.tsx), żeby uniknąć błysku złego motywu.
 */
export function MotywPrzelacznik() {
  const przelacz = () => {
    const html = document.documentElement;
    const ciemny = html.dataset.theme ? html.dataset.theme === "ciemny" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nowy = ciemny ? "jasny" : "ciemny";
    html.dataset.theme = nowy;
    try {
      localStorage.setItem("motyw", nowy);
    } catch {
      /* brak dostępu do localStorage – motyw obowiązuje do końca wizyty */
    }
  };
  return (
    <button type="button" onClick={przelacz} className="przycisk size-10 !min-h-10 !p-0" aria-label="Przełącz motyw jasny/ciemny" title="Przełącz motyw jasny/ciemny">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="ikona-slonce size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="ikona-ksiezyc size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
      </svg>
    </button>
  );
}
