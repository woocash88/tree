"use client";

import { useId, useState } from "react";
import { noweId, parsujDate, type NowaOsoba, type PatchOsoby } from "@/lib/edycje";
import { domyslnieZyjaca } from "@/lib/zyjace";
import { pelneImie } from "@/lib/format";
import type { OsobaPanelu } from "@/lib/panel";
import { mozliwiRodzice } from "@/lib/rodzice";
import { PoleDaty } from "./PoleDaty";
import type { ApiEdycji } from "./useEdycje";

const POLE = "pole mt-1 block w-full";

function Pole({ etykieta, podpowiedz, children }: { etykieta: string; podpowiedz?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-tekst-2">
      {etykieta}
      {children}
      {podpowiedz && <span className="mt-0.5 block text-xs">{podpowiedz}</span>}
    </label>
  );
}

/** Osoba, którą można wybrać na rodzica w formularzu edycji (wystarczą dane do rozpoznania i do wykluczenia potomków). */
export type KandydatRodzica = Pick<OsobaPanelu, "id" | "imie" | "nazwisko" | "plec" | "lata" | "ojciecId" | "matkaId" | "pokolenie" | "rokUr" | "rokSm">;

const MAKS_NA_LISCIE = 60;

/** Wybór rodzica: pole szukania zawęża listę (w dużych drzewach jest kilkaset osób); wybrana osoba zawsze zostaje na liście. */
function WyborRodzica({ etykieta, kandydaci, wartosc, naZmiane }: { etykieta: string; kandydaci: KandydatRodzica[]; wartosc: string; naZmiane: (id: string) => void }) {
  const [fraza, setFraza] = useState("");
  const f = fraza.trim().toLowerCase();
  const opis = (k: KandydatRodzica) => `${pelneImie(k)}${k.lata ? ` (${k.lata})` : ""}`;
  const pasujace = kandydaci.filter((k) => !f || opis(k).toLowerCase().includes(f));
  const widoczne = pasujace.slice(0, MAKS_NA_LISCIE);
  const wybrany = kandydaci.find((k) => k.id === wartosc);
  const lista = wybrany && !widoczne.includes(wybrany) ? [wybrany, ...widoczne] : widoczne;
  return (
    <div className="text-sm text-tekst-2">
      <label className="block">
        {etykieta}
        <select className={POLE} value={wartosc} onChange={(e) => naZmiane(e.target.value)}>
          <option value="">brak / nieznany</option>
          {lista.map((k) => (
            <option key={k.id} value={k.id}>
              {opis(k)}
            </option>
          ))}
        </select>
      </label>
      {kandydaci.length > 12 && (
        <input type="search" className={`${POLE} !min-h-9`} value={fraza} onChange={(e) => setFraza(e.target.value)} placeholder="Szukaj osoby (imię, nazwisko, rok)…" aria-label={`Szukaj: ${etykieta}`} autoComplete="off" />
      )}
      {pasujace.length > MAKS_NA_LISCIE && <span className="mt-0.5 block text-xs">Pokazano {MAKS_NA_LISCIE} z {pasujace.length} – wpisz fragment nazwiska, aby zawęzić.</span>}
      {pasujace.length === 0 && <span className="mt-0.5 block text-xs">Brak osób pasujących do wyszukiwania.</span>}
    </div>
  );
}

/** Edycja imienia, nazwisk, dat, notatki i (w drzewach z bazy) rodziców. Zmiany w drzewach z repozytorium zapisują się lokalnie w tej przeglądarce. */
export function FormularzEdycji({ osoba, api, naGotowe, osoby }: { osoba: OsobaPanelu; api: ApiEdycji; naGotowe: () => void; osoby?: KandydatRodzica[] }) {
  const id = useId();
  const [imie, setImie] = useState(osoba.imie);
  const [nazwisko, setNazwisko] = useState(osoba.nazwisko);
  const [rodowe, setRodowe] = useState(osoba.rodowe ?? "");
  const [ur, setUr] = useState(osoba.ur);
  const [zm, setZm] = useState(osoba.zm === "data nieznana" ? "?" : osoba.zm);
  const [notatka, setNotatka] = useState(osoba.notatka ?? "");
  const [plec, setPlec] = useState(osoba.plec);
  const [zyjaca, setZyjaca] = useState(!!osoba.zyjaca);
  const [ojciecId, setOjciecId] = useState(osoba.ojciecId ?? "");
  const [matkaId, setMatkaId] = useState(osoba.matkaId ?? "");
  const [blad, setBlad] = useState("");
  const [bezOgraniczen, setBezOgraniczen] = useState(false);
  const zmianaRodzicow = !!api.mozeZmieniacRodzicow && !!osoby;
  // Domyślnie tylko osoby z poprzedniego pokolenia, nie młodsze od edytowanej osoby (lib/rodzice.ts); można to wyłączyć.
  const kandydaci = (() => {
    if (!zmianaRodzicow) return { ojcowie: [], matki: [] };
    const posortowani = [...osoby!].sort((a, b) => `${a.nazwisko} ${a.imie}`.localeCompare(`${b.nazwisko} ${b.imie}`, "pl"));
    return { ojcowie: mozliwiRodzice(osoba, posortowani, "ojciec", bezOgraniczen), matki: mozliwiRodzice(osoba, posortowani, "matka", bezOgraniczen) };
  })();
  const zmieniona = !!api.edycje.osoby[osoba.id];

  const zapisz = (e: React.FormEvent) => {
    e.preventDefault();
    const u = parsujDate(ur);
    const s = parsujDate(zm);
    if (!u.ok) return setBlad(`Urodzenie: ${u.blad}`);
    if (!s.ok) return setBlad(`Śmierć: ${s.blad}`);
    if (!imie.trim() && !nazwisko.trim()) return setBlad("Podaj imię lub nazwisko.");
    if (zmianaRodzicow && ojciecId && ojciecId === matkaId) return setBlad("Ojciec i matka muszą być różnymi osobami.");
    const patch: PatchOsoby = {
      imie: imie.trim(),
      nazwisko: nazwisko.trim(),
      nazwiskoRodowe: rodowe.trim() || null,
      urodzenie: u.data ?? { dokladnosc: "nieznana" },
      smierc: s.data,
      notatka: notatka.trim() || null,
      plec,
      // Osoba z datą śmierci nie jest żyjąca.
      zyjaca: zyjaca && !s.data ? true : null,
      // Rodziców dopisujemy do zmiany tylko wtedy, gdy rzeczywiście je zmieniono.
      ...(zmianaRodzicow && ojciecId !== (osoba.ojciecId ?? "") ? { ojciecId: ojciecId || null } : {}),
      ...(zmianaRodzicow && matkaId !== (osoba.matkaId ?? "") ? { matkaId: matkaId || null } : {}),
    };
    api.zapiszOsobe(osoba.id, patch);
    naGotowe();
  };

  return (
    <form onSubmit={zapisz} className="mt-1 space-y-2.5" aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`} className="text-sm font-semibold">
        Edytuj dane osoby
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Pole etykieta="Imię">
          <input className={POLE} value={imie} onChange={(e) => setImie(e.target.value)} autoComplete="off" />
        </Pole>
        <Pole etykieta="Nazwisko">
          <input className={POLE} value={nazwisko} onChange={(e) => setNazwisko(e.target.value)} autoComplete="off" />
        </Pole>
      </div>
      <Pole etykieta="Nazwisko rodowe (z domu)">
        <input className={POLE} value={rodowe} onChange={(e) => setRodowe(e.target.value)} autoComplete="off" />
      </Pole>
      <PoleDaty etykieta="Urodzenie" rodzaj="urodzenia" poczatkowa={ur} naZmiane={setUr} />
      <PoleDaty etykieta="Śmierć" rodzaj="śmierci" poczatkowa={zm} naZmiane={setZm} smierc />
      <Pole etykieta="Płeć">
        <select className={POLE} value={plec} onChange={(e) => setPlec(e.target.value as typeof plec)}>
          <option value="nieznana">nie podano</option>
          <option value="M">mężczyzna</option>
          <option value="K">kobieta</option>
        </select>
      </Pole>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 size-4" checked={zyjaca} onChange={(e) => setZyjaca(e.target.checked)} />
        <span>
          Osoba żyjąca <span className="block text-xs text-tekst-2">Jej dane (daty, miejsca, notatka) są chronione zgodnie z ustawieniem prywatności drzewa.</span>
        </span>
      </label>
      <Pole etykieta="Notatka">
        <textarea className={`${POLE} !py-2`} rows={2} value={notatka} onChange={(e) => setNotatka(e.target.value)} />
      </Pole>
      {zmianaRodzicow && (
        <fieldset className="space-y-2.5 rounded-xl border border-kreska p-3">
          <legend className="px-1 text-sm font-semibold">Rodzice</legend>
          <WyborRodzica etykieta="Ojciec" kandydaci={kandydaci.ojcowie} wartosc={ojciecId} naZmiane={setOjciecId} />
          <WyborRodzica etykieta="Matka" kandydaci={kandydaci.matki} wartosc={matkaId} naZmiane={setMatkaId} />
          <p className="text-xs text-tekst-2">
            {bezOgraniczen
              ? "Na liście są wszystkie osoby poza edytowaną i jej potomkami (ojciec: bez kobiet, matka: bez mężczyzn)."
              : "Na liście są tylko osoby z poprzedniego pokolenia, które nie są młodsze od edytowanej osoby (według dat urodzenia, a gdy ich brak – według rodziny). Nie ma tu samej osoby ani jej potomków."}{" "}
            Gdy wybierzesz oboje rodziców, a nie są jeszcze małżeństwem, zostaną połączeni w małżeństwo.
          </p>
          <label className="flex items-start gap-2 text-xs text-tekst-2">
            <input type="checkbox" className="mt-0.5 size-4" checked={bezOgraniczen} onChange={(e) => setBezOgraniczen(e.target.checked)} />
            Pokaż wszystkie osoby, także z innych pokoleń (gdy w danych są błędne daty lub pokolenia)
          </label>
        </fieldset>
      )}
      {blad && (
        <p role="alert" className="text-sm font-medium text-blad">
          {blad}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="przycisk przycisk-glowny">
          Zapisz
        </button>
        <button type="button" className="przycisk" onClick={naGotowe}>
          Anuluj
        </button>
        {api.edycje.dodane.some((n) => n.id === osoba.id) && (
          <button
            type="button"
            className="przycisk"
            onClick={() => {
              if (window.confirm(`Usunąć dodaną osobę: ${pelneImie(osoba)}?`)) {
                api.usunDodana(osoba.id);
                naGotowe();
              }
            }}
          >
            Usuń tę osobę
          </button>
        )}
        {api.usunOsobe && (
          <button
            type="button"
            className="przycisk"
            onClick={() => {
              if (window.confirm(`Usunąć osobę ${pelneImie(osoba)} z drzewa?\n\nUsunięte zostaną też jej małżeństwa; dzieci zostają w drzewie bez tego rodzica.`)) {
                api.usunOsobe?.(osoba.id);
                naGotowe();
              }
            }}
          >
            Usuń osobę
          </button>
        )}
        {zmieniona && (
          <button
            type="button"
            className="przycisk"
            onClick={() => {
              api.cofnijOsobe(osoba.id);
              naGotowe();
            }}
          >
            Cofnij moje zmiany
          </button>
        )}
      </div>
    </form>
  );
}

/** Dodawanie dziecka wybranej osoby (opcjonalnie z jednym z jej małżonków jako drugim rodzicem). */
/** Dane osoby potrzebne formularzom dodawania bliskich (pasują i do OsobaPanelu, i do osoby ze strony osoby). */
export type OsobaFormularza = Pick<OsobaPanelu, "id" | "imie" | "nazwisko" | "plec" | "galazId">;

export function FormularzDziecka({ osoba, malzonkowie, wszystkieId, api, naDodane, naGotowe }: { osoba: OsobaFormularza; malzonkowie: OsobaFormularza[]; wszystkieId: ReadonlySet<string>; api: ApiEdycji; naDodane: (id: string) => void; naGotowe: () => void }) {
  const id = useId();
  // Nazwisko podpowiadamy po ojcu: po osobie, jeśli to mężczyzna, w przeciwnym razie po jej mężu.
  const [drugi, setDrugi] = useState(malzonkowie.length === 1 ? malzonkowie[0].id : "");
  const [imie, setImie] = useState("");
  const [nazwisko, setNazwisko] = useState(osoba.plec === "K" ? (malzonkowie.length === 1 ? malzonkowie[0].nazwisko : "") : osoba.nazwisko);
  const [plec, setPlec] = useState<"M" | "K" | "nieznana">("nieznana");
  const [ur, setUr] = useState("");
  const [blad, setBlad] = useState("");

  const dodaj = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imie.trim()) return setBlad("Podaj imię dziecka.");
    const u = parsujDate(ur);
    if (!u.ok) return setBlad(`Urodzenie: ${u.blad}`);
    const rodzic2 = drugi || null;
    const matkaJestOsoba = osoba.plec === "K";
    const rok = u.data?.wartosc ? Number(u.data.wartosc.slice(0, 4)) : null;
    const zyjaca = domyslnieZyjaca(u.data);
    const nowe = noweId(imie.trim(), nazwisko.trim(), zyjaca ? null : rok, wszystkieId);
    api.dodajOsobe({
      id: nowe,
      imie: imie.trim(),
      nazwisko: nazwisko.trim(),
      plec,
      urodzenie: u.data ?? { dokladnosc: "nieznana" },
      ojciecId: matkaJestOsoba ? rodzic2 : osoba.id,
      matkaId: matkaJestOsoba ? osoba.id : rodzic2,
      galazId: osoba.galazId,
      ...(zyjaca ? { zyjaca: true } : {}),
    });
    naDodane(nowe);
    naGotowe();
  };

  return (
    <form onSubmit={dodaj} className="mt-1 space-y-2.5" aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`} className="text-sm font-semibold">
        Dodaj dziecko: {pelneImie(osoba)}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Pole etykieta="Imię">
          <input className={POLE} value={imie} onChange={(e) => setImie(e.target.value)} autoComplete="off" autoFocus />
        </Pole>
        <Pole etykieta="Nazwisko">
          <input className={POLE} value={nazwisko} onChange={(e) => setNazwisko(e.target.value)} autoComplete="off" />
        </Pole>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Pole etykieta="Płeć">
          <select className={POLE} value={plec} onChange={(e) => setPlec(e.target.value as typeof plec)}>
            <option value="nieznana">nie podano</option>
            <option value="M">mężczyzna</option>
            <option value="K">kobieta</option>
          </select>
        </Pole>
        <Pole etykieta="Drugi rodzic">
          <select className={POLE} value={drugi} onChange={(e) => setDrugi(e.target.value)}>
            <option value="">nieznany</option>
            {malzonkowie.map((m) => (
              <option key={m.id} value={m.id}>
                {pelneImie(m)}
              </option>
            ))}
          </select>
        </Pole>
      </div>
      <PoleDaty etykieta="Urodzenie" rodzaj="urodzenia" poczatkowa={ur} naZmiane={setUr} />
      {blad && (
        <p role="alert" className="text-sm font-medium text-blad">
          {blad}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="przycisk przycisk-glowny">
          Dodaj dziecko
        </button>
        <button type="button" className="przycisk" onClick={naGotowe}>
          Anuluj
        </button>
      </div>
    </form>
  );
}

/** Pasek widoczny, gdy są lokalne zmiany: ostrzega, że to tylko ta przeglądarka, i pozwala je pobrać lub cofnąć. */
export function PasekEdycji({ api }: { api: ApiEdycji }) {
  if (!api.liczbaZmian) return null;
  return (
    <section className="mt-3 rounded-xl border border-kreska bg-najazd p-3 text-sm" aria-label="Lokalne zmiany">
      <p>
        <strong>Zmiany lokalne: {api.liczbaZmian}.</strong> Widzisz je tylko w tej przeglądarce. Pobierz plik, aby dopisać je do danych serwisu.
      </p>
      <p className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="przycisk przycisk-glowny !min-h-8" onClick={api.pobierz}>
          Pobierz zmiany (JSON)
        </button>
        <button
          type="button"
          className="przycisk !min-h-8"
          onClick={() => {
            if (window.confirm("Usunąć wszystkie lokalne zmiany w tym drzewie?")) api.wyczysc();
          }}
        >
          Cofnij wszystkie
        </button>
      </p>
    </section>
  );
}

export type UstawieniaNowejOsoby = {
  tytul: string;
  przycisk: string;
  domyslneNazwisko?: string;
  domyslnaPlec?: "M" | "K" | "nieznana";
  /** Płeć jest już ustalona (np. „ojciec”) – pole wyboru jest ukryte. */
  stalaPlec?: boolean;
  wszystkieId: ReadonlySet<string>;
  galazId: string;
  /** Zwraca dane nowej osoby; powiązania rodzinne (rodzice) ustawia wywołujący. */
  naZapis: (n: NowaOsoba) => void;
  naGotowe: () => void;
};

/** Ogólny formularz nowej osoby: małżonek, rodzic, pierwsza osoba w pustym drzewie. */
export function FormularzNowejOsoby({ tytul, przycisk, domyslneNazwisko = "", domyslnaPlec = "nieznana", stalaPlec = false, wszystkieId, galazId, naZapis, naGotowe }: UstawieniaNowejOsoby) {
  const id = useId();
  const [imie, setImie] = useState("");
  const [nazwisko, setNazwisko] = useState(domyslneNazwisko);
  const [rodowe, setRodowe] = useState("");
  const [plec, setPlec] = useState(domyslnaPlec);
  const [ur, setUr] = useState("");
  const [zm, setZm] = useState("");
  const [zyjaca, setZyjaca] = useState<boolean | null>(null);
  const [blad, setBlad] = useState("");
  const dataUrodzenia = parsujDate(ur);
  const zyjacaDomyslnie = domyslnieZyjaca(dataUrodzenia.ok ? dataUrodzenia.data : null);

  const zapisz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imie.trim() && !nazwisko.trim()) return setBlad("Podaj imię lub nazwisko.");
    const u = parsujDate(ur);
    const s = parsujDate(zm);
    if (!u.ok) return setBlad(`Urodzenie: ${u.blad}`);
    if (!s.ok) return setBlad(`Śmierć: ${s.blad}`);
    const jestZyjaca = !s.data && (zyjaca ?? zyjacaDomyslnie);
    const rok = u.data?.wartosc ? Number(u.data.wartosc.slice(0, 4)) : null;
    naZapis({
      // Identyfikator trafia do adresów stron – nie zawiera roku urodzenia osoby żyjącej.
      id: noweId(imie.trim(), nazwisko.trim(), jestZyjaca ? null : rok, wszystkieId),
      imie: imie.trim(),
      nazwisko: nazwisko.trim(),
      ...(rodowe.trim() ? { nazwiskoRodowe: rodowe.trim() } : {}),
      plec,
      urodzenie: u.data ?? { dokladnosc: "nieznana" },
      ...(s.data ? { smierc: s.data } : {}),
      ojciecId: null,
      matkaId: null,
      galazId,
      ...(jestZyjaca ? { zyjaca: true } : {}),
    });
    naGotowe();
  };

  return (
    <form onSubmit={zapisz} className="mt-1 space-y-2.5" aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`} className="text-sm font-semibold">
        {tytul}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Pole etykieta="Imię">
          <input className={POLE} value={imie} onChange={(e) => setImie(e.target.value)} autoComplete="off" autoFocus />
        </Pole>
        <Pole etykieta="Nazwisko">
          <input className={POLE} value={nazwisko} onChange={(e) => setNazwisko(e.target.value)} autoComplete="off" />
        </Pole>
      </div>
      <Pole etykieta="Nazwisko rodowe (z domu)">
        <input className={POLE} value={rodowe} onChange={(e) => setRodowe(e.target.value)} autoComplete="off" />
      </Pole>
      {!stalaPlec && (
        <Pole etykieta="Płeć">
          <select className={POLE} value={plec} onChange={(e) => setPlec(e.target.value as typeof plec)}>
            <option value="nieznana">nie podano</option>
            <option value="M">mężczyzna</option>
            <option value="K">kobieta</option>
          </select>
        </Pole>
      )}
      <PoleDaty etykieta="Urodzenie" rodzaj="urodzenia" poczatkowa={ur} naZmiane={setUr} />
      <PoleDaty etykieta="Śmierć" rodzaj="śmierci" poczatkowa={zm} naZmiane={setZm} smierc />
      {!zm.trim() && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 size-4" checked={zyjaca ?? zyjacaDomyslnie} onChange={(e) => setZyjaca(e.target.checked)} />
          <span>
            Osoba żyjąca <span className="block text-xs text-tekst-2">Jej dane są chronione zgodnie z ustawieniem prywatności drzewa.</span>
          </span>
        </label>
      )}
      {blad && (
        <p role="alert" className="text-sm font-medium text-blad">
          {blad}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="przycisk przycisk-glowny">
          {przycisk}
        </button>
        <button type="button" className="przycisk" onClick={naGotowe}>
          Anuluj
        </button>
      </div>
    </form>
  );
}
