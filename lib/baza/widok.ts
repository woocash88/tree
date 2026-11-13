/** Przekształcenia danych z bazy na kształty używane przez istniejące widoki (metadane drzewa, podsumowanie do katalogu). */
import type { PodsumowanieDrzewa } from "../dane-czyste";
import type { DrzewoMeta } from "../schemat-drzewa";
import { slugDb } from "../sciezki";
import type { MetaDb } from "./typy";

export function metaDlaWidokow(id: string, m: MetaDb, nadpiszPolitykePokaz = false): DrzewoMeta {
  const rok = Number(m.zaktualizowano.slice(0, 4)) || new Date().getFullYear();
  return {
    slug: slugDb(id),
    nazwa: m.nazwa,
    opis: m.opis,
    zakresLat: m.zakresLat ?? { od: rok, do: rok },
    region: m.region,
    autor: { nazwa: m.wlascicielNazwa },
    zaktualizowano: m.zaktualizowano,
    widocznosc: m.widocznosc,
    politykaDatZyjacych: nadpiszPolitykePokaz ? "pokaz" : m.politykaDatZyjacych,
  };
}

export function podsumowanieZBazy(id: string, m: MetaDb): PodsumowanieDrzewa {
  return { meta: metaDlaWidokow(id, m), osob: m.statystyki.osob, pokolen: m.statystyki.pokolen, galezi: m.statystyki.galezi, nazwiska: m.nazwiska ?? [] };
}
