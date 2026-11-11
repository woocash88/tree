import type { Galaz } from "./schemat";

/** Wirtualna „gałąź” obejmująca wszystkie osoby drzewa. Zastępuje wspólny pień jako osobną kategorię. */
export const ID_CALEGO = "cale";
export const CALE_DRZEWO: Galaz = { id: ID_CALEGO, nazwa: "Całe drzewo", kolor: "#64748b", opis: "Wszystkie osoby drzewa w jednym widoku." };

/** Id widoku (adresu) dla gałęzi: pień wspólny nie ma własnego widoku – prowadzi do „Całego drzewa”. */
export const idWidoku = (g: Pick<Galaz, "id" | "wspolna">): string => (g.wspolna ? ID_CALEGO : g.id);

/** Gałęzie do wyboru w widoku: „Całe drzewo” i wszystkie zwykłe gałęzie (bez pnia wspólnego). */
export const galezieWidoku = (galezie: Galaz[]): Galaz[] => [CALE_DRZEWO, ...galezie.filter((g) => !g.wspolna)];

export const znajdzGalaz = (galezie: Galaz[], id: string): Galaz => (id === ID_CALEGO ? CALE_DRZEWO : galezie.find((g) => g.id === id)!);
