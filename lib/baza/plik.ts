/** Wczytanie pliku drzewa wybranego przez użytkownika (przeglądarka) i pobranie pliku na dysk. */
import { importujPlik, MAKS_ROZMIAR_PLIKU, type WynikImportu } from "./wymiana";

export async function wczytajPlikDrzewa(plik: File): Promise<WynikImportu> {
  if (plik.size > MAKS_ROZMIAR_PLIKU) throw new Error(`Plik jest za duży (${(plik.size / 1048576).toFixed(1)} MB, limit ${MAKS_ROZMIAR_PLIKU / 1048576} MB).`);
  return importujPlik(await plik.text());
}

export function pobierzPlik(nazwa: string, tresc: string, typ: string): void {
  const adres = URL.createObjectURL(new Blob([tresc], { type: `${typ};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = adres;
  a.download = nazwa;
  a.click();
  URL.revokeObjectURL(adres);
}
