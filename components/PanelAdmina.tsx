"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PodsumowanieDrzewa } from "@/lib/dane-czyste";
import { listaUzytkownikow, listaWszystkich, usunDaneUzytkownika, usunDrzewo, type WpisDrzewa, type WpisUzytkownika } from "@/lib/baza/api";
import { komunikatBledu } from "@/lib/baza/konta";
import { ileOsob, ilePokolen } from "@/lib/format";
import { POLITYKI_DAT, type DrzewoMeta, type PolitykaDat } from "@/lib/schemat-drzewa";
import { sciezkaDrzewa, sciezkaGalezi, sciezkaUstawienDrzewa, slugDb } from "@/lib/sciezki";
import { bledyMeta, zastosujZmianeMeta, type ZmianaDrzewa } from "@/lib/zmiany-drzew";
import { useKonto } from "./konta/AuthProvider";
import { useEdycje } from "./useEdycje";
import { useZmianyDrzew } from "./useZmianyDrzew";

const OPISY_POLITYK: Record<PolitykaDat, string> = {
  ukryj: "ukryj – tylko imię i nazwisko",
  "tylko-rok": "tylko rok urodzenia",
  pokaz: "pokaż wszystkie dane",
};

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
  const [zrodloNazwa, setZrodloNazwa] = useState(meta.zrodlo?.nazwa ?? "");
  const [zrodloUrl, setZrodloUrl] = useState(meta.zrodlo?.url ?? "");
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

function SekcjaUzytkownikow() {
  const [lista, setLista] = useState<WpisUzytkownika[] | null>(null);
  const [blad, setBlad] = useState("");
  const [info, setInfo] = useState("");
  const [trwa, setTrwa] = useState<string | null>(null);
  const [filtr, setFiltr] = useState("");

  const wczytaj = useCallback(async () => {
    try {
      setLista(await listaUzytkownikow());
    } catch (e) {
      setBlad(komunikatBledu(e));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- wczytanie listy po wejściu do panelu
    void wczytaj();
  }, [wczytaj]);

  const widoczni = (lista ?? []).filter((u) => `${u.imie} ${u.nazwisko} ${u.email}`.toLowerCase().includes(filtr.toLowerCase()));
  return (
    <section aria-label="Użytkownicy" className="mt-8">
      <h2 className="text-2xl">Użytkownicy ({lista?.length ?? "…"})</h2>
      <input type="search" className="pole mt-3 w-full max-w-sm" placeholder="Szukaj po imieniu, nazwisku lub e-mailu" value={filtr} onChange={(e) => setFiltr(e.target.value)} aria-label="Szukaj użytkownika" />
      {blad && <p role="alert" className="mt-2 text-sm font-semibold text-blad">{blad}</p>}
      {info && <p role="status" className="mt-2 text-sm font-semibold">{info}</p>}
      <ul className="mt-3 grid gap-2">
        {widoczni.map((u) => (
          <li key={u.uid} className="szklo flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{u.imie} {u.nazwisko}</p>
              <p className="truncate text-sm text-tekst-2">{u.email} · od {u.utworzono.slice(0, 10)}</p>
            </div>
            <button
              type="button"
              className="przycisk !min-h-8"
              disabled={trwa === u.uid}
              onClick={async () => {
                if (!window.confirm(`Usunąć użytkownika ${u.imie} ${u.nazwisko} (${u.email}) wraz z jego drzewami?\n\nTej operacji nie można cofnąć. Konto zostanie zablokowane.`)) return;
                setTrwa(u.uid);
                setBlad("");
                try {
                  const { drzew } = await usunDaneUzytkownika(u.uid, u.email, { zablokuj: true });
                  setInfo(`Usunięto użytkownika ${u.email} i jego drzewa (${drzew}).`);
                  await wczytaj();
                } catch (e) {
                  setBlad(komunikatBledu(e));
                }
                setTrwa(null);
              }}
            >
              {trwa === u.uid ? "Usuwanie…" : "Usuń użytkownika"}
            </button>
          </li>
        ))}
      </ul>
      {lista && widoczni.length === 0 && <p className="mt-3 text-sm italic text-tekst-2">Brak użytkowników.</p>}
    </section>
  );
}

function SekcjaDrzewUzytkownikow() {
  const [lista, setLista] = useState<WpisDrzewa[] | null>(null);
  const [blad, setBlad] = useState("");
  const [trwa, setTrwa] = useState<string | null>(null);
  const wczytaj = useCallback(async () => {
    try {
      setLista(await listaWszystkich());
    } catch (e) {
      setBlad(komunikatBledu(e));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- wczytanie listy po wejściu do panelu
    void wczytaj();
  }, [wczytaj]);
  return (
    <section aria-label="Drzewa użytkowników" className="mt-8">
      <h2 className="text-2xl">Drzewa użytkowników ({lista?.length ?? "…"})</h2>
      {blad && <p role="alert" className="mt-2 text-sm font-semibold text-blad">{blad}</p>}
      <ul className="mt-3 grid gap-2">
        {(lista ?? []).map(({ id, meta }) => (
          <li key={id} className="szklo flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                <Link href={sciezkaDrzewa(slugDb(id))} className="link">{meta.nazwa}</Link>
              </p>
              <p className="text-sm text-tekst-2">
                {meta.widocznosc === "publiczne" ? "publiczne" : "prywatne"} · {ileOsob(meta.statystyki.osob)} · właściciel: {meta.wlascicielNazwa}
                {meta.kolaboranci.length > 0 && ` · kolaborantów: ${meta.kolaboranci.length}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={sciezkaDrzewa(slugDb(id))} className="przycisk !min-h-8">Otwórz i edytuj</Link>
              <Link href={sciezkaUstawienDrzewa(slugDb(id))} className="przycisk !min-h-8">Ustawienia</Link>
              <button
                type="button"
                className="przycisk !min-h-8"
                disabled={trwa === id}
                onClick={async () => {
                  if (!window.confirm(`Usunąć drzewo „${meta.nazwa}” (właściciel: ${meta.wlascicielNazwa})?\n\nTej operacji nie można cofnąć.`)) return;
                  setTrwa(id);
                  try {
                    await usunDrzewo(id);
                    await wczytaj();
                  } catch (e) {
                    setBlad(komunikatBledu(e));
                  }
                  setTrwa(null);
                }}
              >
                Usuń
              </button>
            </div>
          </li>
        ))}
      </ul>
      {lista && lista.length === 0 && <p className="mt-3 text-sm italic text-tekst-2">Użytkownicy nie utworzyli jeszcze żadnych drzew.</p>}
    </section>
  );
}

/** Panel administratora serwisu: użytkownicy, ich drzewa oraz drzewa z repozytorium. Dostępny tylko dla administratora. */
export function PanelAdmina({ drzewa }: { drzewa: PodsumowanieDrzewa[] }) {
  const konto = useKonto();
  const api = useZmianyDrzew();
  if (konto.status === "wylaczone") return <p className="szklo p-6 text-tekst-2">Konta użytkowników nie są jeszcze włączone w tym serwisie.</p>;
  if (konto.status === "ladowanie") return <p className="py-16 text-center text-tekst-2" role="status">Wczytywanie…</p>;
  if (konto.status === "gosc") {
    return (
      <div className="szklo mx-auto max-w-md p-6">
        <h1 className="text-2xl">Administracja</h1>
        <p className="mt-2 text-tekst-2">Panel jest dostępny tylko dla administratora serwisu. Zaloguj się na swoje konto.</p>
        <Link href="/logowanie/" className="przycisk przycisk-glowny mt-4 w-full">Zaloguj się</Link>
      </div>
    );
  }
  if (!konto.czyAdmin) {
    return (
      <div className="szklo mx-auto max-w-md p-6">
        <h1 className="text-2xl">Brak dostępu</h1>
        <p className="mt-2 text-tekst-2">To konto nie ma uprawnień administratora serwisu.</p>
        <Link href="/profil/" className="przycisk mt-4 w-full">Mój profil</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl">Administracja</h1>
      <p className="mt-2 max-w-3xl text-tekst-2">
        Jako administrator masz dostęp do wszystkich drzew użytkowników: możesz je otwierać, edytować, zmieniać ich ustawienia i usuwać oraz usuwać użytkowników.
      </p>

      <SekcjaUzytkownikow />
      <SekcjaDrzewUzytkownikow />

      <h2 className="mt-10 text-2xl">Drzewa z repozytorium ({drzewa.length})</h2>
      <section className="panel mt-3 p-4 text-sm" aria-label="Jak opublikować zmiany drzew z repozytorium">
        <p>
          Te drzewa są częścią kodu serwisu (pliki w <code>data/drzewa/</code>). Zmiany z tego panelu zapisują się najpierw tylko w tej przeglądarce – pobierz plik, zastosuj go w repozytorium i wdróż stronę:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>drzewa (edycja, usunięcie): <code>npm run zastosuj-zmiany-drzew -- zmiany-drzew.json</code></li>
          <li>osoby: <code>npm run zastosuj-edycje -- &lt;slug&gt; edycje-&lt;slug&gt;.json</code></li>
        </ul>
        {api.liczba > 0 ? (
          <p className="mt-3 flex flex-wrap items-center gap-2">
            <strong>Zmiany drzew do opublikowania: {api.liczba}.</strong>
            <button type="button" className="przycisk przycisk-glowny !min-h-8" onClick={api.pobierz}>Pobierz zmiany drzew (JSON)</button>
            <button type="button" className="przycisk !min-h-8" onClick={() => { if (window.confirm("Cofnąć wszystkie niezapisane zmiany drzew?")) api.wyczysc(); }}>Cofnij wszystkie</button>
          </p>
        ) : (
          <p className="mt-3 text-tekst-2">Brak niezapisanych zmian drzew.</p>
        )}
      </section>
      <ul className="mt-4 grid gap-4">
        {drzewa.map((d) => (
          <WierszDrzewa key={d.meta.slug} drzewo={d} api={api} />
        ))}
      </ul>
    </div>
  );
}
