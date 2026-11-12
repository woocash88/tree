"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane";
import { SKROT_ADMINA } from "@/lib/admin";
import { ileOsob, ilePokolen } from "@/lib/format";
import { POLITYKI_DAT, type DrzewoMeta, type PolitykaDat } from "@/lib/schemat-drzewa";
import { sciezkaDrzewa, sciezkaGalezi } from "@/lib/sciezki";
import { bledyMeta, zastosujZmianeMeta, type ZmianaDrzewa } from "@/lib/zmiany-drzew";
import { useCzyAdmin, wylogujAdmina, zalogujAdmina } from "./useAdmin";
import { useEdycje } from "./useEdycje";
import { useZmianyDrzew } from "./useZmianyDrzew";

const OPISY_POLITYK: Record<PolitykaDat, string> = {
  ukryj: "ukryj – tylko imię i nazwisko",
  "tylko-rok": "tylko rok urodzenia",
  pokaz: "pokaż wszystkie dane",
};

function Logowanie() {
  const id = useId();
  const [haslo, setHaslo] = useState("");
  const [blad, setBlad] = useState("");
  const [trwa, setTrwa] = useState(false);

  const zaloguj = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrwa(true);
    setBlad("");
    try {
      if (!(await zalogujAdmina(haslo))) setBlad("Nieprawidłowe hasło.");
    } catch {
      setBlad("Przeglądarka nie pozwoliła sprawdzić hasła. Otwórz stronę przez https (albo localhost).");
    }
    setTrwa(false);
  };

  if (!SKROT_ADMINA) {
    return (
      <div className="szklo mx-auto max-w-md p-6">
        <h1 className="text-2xl">Administracja</h1>
        <p className="mt-3 text-tekst-2">
          Tryb administratora nie jest skonfigurowany. Ustaw hasło poleceniem <code>npm run ustaw-haslo</code>, a potem zbuduj i wdróż stronę.
        </p>
      </div>
    );
  }
  return (
    <form onSubmit={zaloguj} className="szklo mx-auto max-w-md p-6" aria-labelledby={`${id}-t`}>
      <h1 id={`${id}-t`} className="text-2xl">
        Administracja
      </h1>
      <p className="mt-2 text-sm text-tekst-2">Podaj hasło administratora, aby włączyć narzędzia edycji osób i zarządzania drzewami.</p>
      <label htmlFor={`${id}-h`} className="mt-4 block text-sm text-tekst-2">
        Hasło
      </label>
      <input id={`${id}-h`} type="password" autoComplete="current-password" value={haslo} onChange={(e) => setHaslo(e.target.value)} className="pole mt-1 w-full" aria-describedby={blad ? `${id}-b` : undefined} aria-invalid={!!blad} required />
      {blad && (
        <p id={`${id}-b`} role="alert" className="mt-2 text-sm font-semibold text-blad">
          {blad}
        </p>
      )}
      <button type="submit" className="przycisk przycisk-glowny mt-4 !min-h-10 w-full" disabled={trwa || !haslo}>
        {trwa ? "Sprawdzanie…" : "Zaloguj"}
      </button>
    </form>
  );
}

function Pole({ etykieta, children }: { etykieta: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-tekst-2">
      {etykieta}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function FormularzDrzewa({ meta, naZapis, naAnuluj }: { meta: DrzewoMeta; naZapis: (z: ZmianaDrzewa) => void; naAnuluj: () => void }) {
  const [nazwa, setNazwa] = useState(meta.nazwa);
  const [opis, setOpis] = useState(meta.opis);
  const [region, setRegion] = useState(meta.region);
  const [zrodloNazwa, setZrodloNazwa] = useState(meta.zrodlo.nazwa);
  const [zrodloUrl, setZrodloUrl] = useState(meta.zrodlo.url);
  const [autorNazwa, setAutorNazwa] = useState(meta.autor.nazwa);
  const [autorUrl, setAutorUrl] = useState(meta.autor.url ?? "");
  const [polityka, setPolityka] = useState<PolitykaDat>(meta.politykaDatZyjacych);
  const [wyrozniane, setWyrozniane] = useState(!!meta.wyrozniane);
  const [bledy, setBledy] = useState<string[]>([]);

  const zapisz = (e: React.FormEvent) => {
    e.preventDefault();
    const zmiana: ZmianaDrzewa = {
      nazwa: nazwa.trim(),
      opis: opis.trim(),
      region: region.trim(),
      zrodlo: { nazwa: zrodloNazwa.trim(), url: zrodloUrl.trim() },
      autor: { nazwa: autorNazwa.trim(), ...(autorUrl.trim() ? { url: autorUrl.trim() } : {}) },
      politykaDatZyjacych: polityka,
      wyrozniane,
    };
    const znalezione = bledyMeta(zastosujZmianeMeta(meta, zmiana));
    setBledy(znalezione);
    if (!znalezione.length) naZapis(zmiana);
  };

  return (
    <form onSubmit={zapisz} className="mt-4 grid gap-3 border-t border-kreska pt-4 sm:grid-cols-2" aria-label={`Edycja drzewa ${meta.nazwa}`}>
      <Pole etykieta="Nazwa">
        <input className="pole w-full" value={nazwa} onChange={(e) => setNazwa(e.target.value)} required />
      </Pole>
      <Pole etykieta="Region">
        <input className="pole w-full" value={region} onChange={(e) => setRegion(e.target.value)} required />
      </Pole>
      <div className="sm:col-span-2">
        <Pole etykieta="Opis (1–2 zdania)">
          <textarea className="pole w-full !py-2" rows={3} value={opis} onChange={(e) => setOpis(e.target.value)} required />
        </Pole>
      </div>
      <Pole etykieta="Źródło danych – nazwa">
        <input className="pole w-full" value={zrodloNazwa} onChange={(e) => setZrodloNazwa(e.target.value)} required />
      </Pole>
      <Pole etykieta="Źródło danych – adres (https://…)">
        <input className="pole w-full" type="url" value={zrodloUrl} onChange={(e) => setZrodloUrl(e.target.value)} required />
      </Pole>
      <Pole etykieta="Opiekun drzewa">
        <input className="pole w-full" value={autorNazwa} onChange={(e) => setAutorNazwa(e.target.value)} required />
      </Pole>
      <Pole etykieta="Strona opiekuna (opcjonalnie)">
        <input className="pole w-full" type="url" value={autorUrl} onChange={(e) => setAutorUrl(e.target.value)} />
      </Pole>
      <Pole etykieta="Dane osób żyjących">
        <select className="pole w-full" value={polityka} onChange={(e) => setPolityka(e.target.value as PolitykaDat)}>
          {POLITYKI_DAT.map((p) => (
            <option key={p} value={p}>
              {OPISY_POLITYK[p]}
            </option>
          ))}
        </select>
      </Pole>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" checked={wyrozniane} onChange={(e) => setWyrozniane(e.target.checked)} className="size-4" />
        Wyróżnione na stronie głównej
      </label>
      {bledy.length > 0 && (
        <ul role="alert" className="text-sm font-semibold text-blad sm:col-span-2">
          {bledy.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      <p className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" className="przycisk przycisk-glowny">
          Zapisz zmiany
        </button>
        <button type="button" className="przycisk" onClick={naAnuluj}>
          Anuluj
        </button>
      </p>
    </form>
  );
}

function WierszDrzewa({ drzewo, api }: { drzewo: PodsumowanieDrzewa; api: ReturnType<typeof useZmianyDrzew> }) {
  const [edycja, setEdycja] = useState(false);
  const osoby = useEdycje(drzewo.meta.slug);
  const slug = drzewo.meta.slug;
  const zmiana = api.zmiany.zmienione[slug];
  const doUsuniecia = api.zmiany.usuniete.includes(slug);
  const meta = zmiana ? zastosujZmianeMeta(drzewo.meta, zmiana) : drzewo.meta;

  return (
    <li id={slug} className={`szklo p-5 ${doUsuniecia ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl">
            <Link href={sciezkaDrzewa(slug)} className="link">
              {meta.nazwa}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-tekst-2">
            <code>{slug}</code> · {ileOsob(drzewo.osob)} · {ilePokolen(drzewo.pokolen)} · {meta.region}
          </p>
          <p className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            {doUsuniecia && <span className="rounded-full border border-blad px-2.5 py-0.5 text-blad">Do usunięcia</span>}
            {zmiana && !doUsuniecia && <span className="rounded-full border border-kreska bg-najazd px-2.5 py-0.5">Metadane zmienione</span>}
            {osoby.liczbaZmian > 0 && <span className="rounded-full border border-kreska bg-najazd px-2.5 py-0.5">Zmiany osób: {osoby.liczbaZmian}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {doUsuniecia ? (
            <button type="button" className="przycisk" onClick={() => api.przywroc(slug)}>
              Przywróć
            </button>
          ) : (
            <>
              <Link href={sciezkaGalezi(slug, "cale")} className="przycisk">
                Edytuj osoby
              </Link>
              <button type="button" className="przycisk" aria-expanded={edycja} onClick={() => setEdycja((e) => !e)}>
                Edytuj drzewo
              </button>
              <button
                type="button"
                className="przycisk"
                onClick={() => {
                  if (window.confirm(`Oznaczyć drzewo „${meta.nazwa}” do usunięcia?\n\nZniknie z serwisu po zastosowaniu pobranego pliku zmian i ponownym wdrożeniu.`)) {
                    setEdycja(false);
                    api.usun(slug);
                  }
                }}
              >
                Usuń drzewo
              </button>
            </>
          )}
        </div>
      </div>
      {(zmiana || osoby.liczbaZmian > 0) && !doUsuniecia && (
        <p className="mt-3 flex flex-wrap gap-2">
          {zmiana && (
            <button type="button" className="przycisk !min-h-8" onClick={() => api.cofnijZmiane(slug)}>
              Cofnij zmianę metadanych
            </button>
          )}
          {osoby.liczbaZmian > 0 && (
            <button type="button" className="przycisk !min-h-8" onClick={osoby.pobierz}>
              Pobierz zmiany osób (edycje-{slug}.json)
            </button>
          )}
        </p>
      )}
      {edycja && !doUsuniecia && (
        <FormularzDrzewa
          key={JSON.stringify(zmiana ?? null)}
          meta={meta}
          naAnuluj={() => setEdycja(false)}
          naZapis={(z) => {
            api.zmien(slug, z);
            setEdycja(false);
          }}
        />
      )}
    </li>
  );
}

/** Panel administratora: logowanie, zarządzanie drzewami (edycja metadanych, usuwanie) i eksport zmian. */
export function PanelAdmina({ drzewa }: { drzewa: PodsumowanieDrzewa[] }) {
  const admin = useCzyAdmin();
  const api = useZmianyDrzew();
  if (!admin) return <Logowanie />;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-4xl">Administracja</h1>
        <button type="button" className="przycisk ml-auto" onClick={wylogujAdmina}>
          Wyloguj
        </button>
      </div>
      <p className="mt-2 max-w-3xl text-tekst-2">
        Tryb administratora jest włączony w tej przeglądarce: w panelu osoby (lista gałęzi i diagram) widać przyciski „Edytuj dane” i „Dodaj dziecko”. Pozostali odwiedzający ich nie widzą.
      </p>

      <section className="panel mt-5 p-4 text-sm" aria-label="Jak opublikować zmiany">
        <p>
          <strong>Serwis jest statyczny.</strong> Zmiany zapisują się najpierw tylko w tej przeglądarce. Aby trafiły do serwisu, pobierz plik, zastosuj go w repozytorium i wdróż stronę:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            drzewa (edycja, usunięcie): <code>npm run zastosuj-zmiany-drzew -- zmiany-drzew.json</code>
          </li>
          <li>
            osoby: <code>npm run zastosuj-edycje -- &lt;slug&gt; edycje-&lt;slug&gt;.json</code>
          </li>
        </ul>
        {api.liczba > 0 ? (
          <p className="mt-3 flex flex-wrap items-center gap-2">
            <strong>Zmiany drzew do opublikowania: {api.liczba}.</strong>
            <button type="button" className="przycisk przycisk-glowny !min-h-8" onClick={api.pobierz}>
              Pobierz zmiany drzew (JSON)
            </button>
            <button
              type="button"
              className="przycisk !min-h-8"
              onClick={() => {
                if (window.confirm("Cofnąć wszystkie niezapisane zmiany drzew?")) api.wyczysc();
              }}
            >
              Cofnij wszystkie
            </button>
          </p>
        ) : (
          <p className="mt-3 text-tekst-2">Brak niezapisanych zmian drzew.</p>
        )}
      </section>

      <h2 className="mt-8 text-2xl">Drzewa ({drzewa.length})</h2>
      <ul className="mt-4 grid gap-4">
        {drzewa.map((d) => (
          <WierszDrzewa key={d.meta.slug} drzewo={d} api={api} />
        ))}
      </ul>
      <p className="mt-6 text-sm text-tekst-2">Nowe drzewo dodaje się w repozytorium – opis w README, sekcja „Jak dodać drzewo”.</p>
    </div>
  );
}
