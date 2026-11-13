/**
 * Które osoby można zaproponować jako rodzica w formularzu edycji. Moduł czysty (bez Reacta i Firebase).
 *
 * Domyślnie lista zawiera tylko osoby, które mogą być rodzicem „z życia”:
 *  - nie jest to sama osoba ani jej potomek, ojcem nie jest kobieta, a matką mężczyzna,
 *  - rodzic jest z poprzedniego pokolenia (pokolenie edytowanej osoby minus jeden),
 *  - rodzic nie jest młodszy od dziecka: przy znanych datach urodzenia różnica to co najmniej 12 lat; gdy daty trzeba
 *    oszacować (z rodziców lub dzieci), odrzucamy tylko oczywiste przypadki (rodzic urodzony wyraźnie później),
 *  - rodzic nie zmarł wcześniej, niż dziecko się urodziło (ojciec – z zapasem roku).
 * To tylko podpowiedź w formularzu: logika zapisu (lib/baza/logika.ts) pilnuje wyłącznie spójności powiązań.
 */
import { potomkowie } from "./baza/logika";

export type OsobaRodowod = {
  id: string;
  plec: "M" | "K" | "nieznana";
  pokolenie: number;
  rokUr: number | null;
  rokSm: number | null;
  ojciecId: string | null;
  matkaId: string | null;
};

export const SREDNI_WIEK_RODZICA = 28;
export const MIN_WIEK_RODZICA = 12;
/** Tolerancja przy datach szacowanych: odrzucamy rodzica dopiero, gdy wyszedłby młodszy od dziecka o więcej niż tyle lat. */
const TOLERANCJA_SZACUNKU = 10;
const MAKS_GLEBOKOSC = 8;

export type Rok = { rok: number; dokladny: boolean };

/**
 * Rok urodzenia: znany albo oszacowany z rodziców (+28 lat) lub dzieci (−28 lat); null, gdy w rodzinie nie ma żadnej daty.
 * Szacunki rozchodzą się falami od osób z datą (każda fala dopisuje osoby sąsiadujące z już oszacowanymi), więc koszt jest liniowy.
 */
export function estymatorRoku(wszyscy: OsobaRodowod[]): (id: string) => Rok | null {
  const dzieci = new Map<string, string[]>();
  for (const o of wszyscy) for (const r of [o.ojciecId, o.matkaId]) if (r) dzieci.set(r, [...(dzieci.get(r) ?? []), o.id]);
  const wynik = new Map<string, Rok>();
  for (const o of wszyscy) if (o.rokUr !== null) wynik.set(o.id, { rok: o.rokUr, dokladny: true });
  const srednia = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

  for (let fala = 0; fala < MAKS_GLEBOKOSC; fala++) {
    const nowe = new Map<string, Rok>();
    for (const o of wszyscy) {
      if (wynik.has(o.id)) continue;
      const zRodzicow = [o.ojciecId, o.matkaId].map((r) => (r ? wynik.get(r) : undefined)).filter((x): x is Rok => !!x).map((x) => x.rok + SREDNI_WIEK_RODZICA);
      const zDzieci = (dzieci.get(o.id) ?? []).map((c) => wynik.get(c)).filter((x): x is Rok => !!x).map((x) => x.rok - SREDNI_WIEK_RODZICA);
      const lista = zRodzicow.length ? zRodzicow : zDzieci;
      if (lista.length) nowe.set(o.id, { rok: srednia(lista), dokladny: false });
    }
    if (!nowe.size) break;
    for (const [id, r] of nowe) wynik.set(id, r);
  }
  return (id) => wynik.get(id) ?? null;
}

/** Czy osoba `kandydat` wygląda wiarygodnie jako rodzic osoby `osoba` (pokolenie i daty). */
export function wiarygodnyRodzic(osoba: OsobaRodowod, kandydat: OsobaRodowod, rola: "ojciec" | "matka", rok: (id: string) => Rok | null): boolean {
  if (kandydat.pokolenie !== osoba.pokolenie - 1) return false;
  const dziecko = rok(osoba.id);
  const rodzic = rok(kandydat.id);
  if (dziecko && rodzic) {
    const roznica = dziecko.rok - rodzic.rok;
    if (dziecko.dokladny && rodzic.dokladny ? roznica < MIN_WIEK_RODZICA : roznica < -TOLERANCJA_SZACUNKU) return false;
  }
  if (dziecko?.dokladny && kandydat.rokSm !== null && kandydat.rokSm < dziecko.rok - (rola === "ojciec" ? 1 : 0)) return false;
  return true;
}

/**
 * Kandydaci na rodzica (w kolejności wejściowej). `wszystkieBezOgraniczen` pokazuje całą listę poza samą osobą i jej potomkami
 * oraz płcią (na wypadek błędnych pokoleń lub dat w danych); aktualny rodzic zawsze zostaje na liście.
 */
export function mozliwiRodzice<T extends OsobaRodowod>(osoba: OsobaRodowod, wszyscy: T[], rola: "ojciec" | "matka", wszystkieBezOgraniczen = false): T[] {
  const zakazani = potomkowie({ osoby: wszyscy }, osoba.id);
  const obecny = rola === "ojciec" ? osoba.ojciecId : osoba.matkaId;
  const rok = estymatorRoku(wszyscy);
  return wszyscy.filter((k) => {
    if (k.id === osoba.id || zakazani.has(k.id)) return false;
    if (k.id === obecny) return true;
    if (rola === "ojciec" ? k.plec === "K" : k.plec === "M") return false;
    return wszystkieBezOgraniczen || wiarygodnyRodzic(osoba, k, rola, rok);
  });
}
