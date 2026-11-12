import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { skrotHasla, sprawdzHaslo } from "../lib/admin";
import { bledyMeta, liczbaZmianDrzew, zastosujZmianeMeta, zmianyDoPliku } from "../lib/zmiany-drzew";
import type { DrzewoMeta } from "../lib/schemat-drzewa";
import { zastosujZmianyDrzew } from "../scripts/zastosuj-zmiany-drzew";

const meta = (slug: string): DrzewoMeta => ({
  slug,
  nazwa: `Rodzina ${slug}`,
  opis: "Opis.",
  zakresLat: { od: 1800, do: 1900 },
  region: "Kobylin",
  zrodlo: { nazwa: "Archiwum", url: "https://example.org/zrodlo" },
  autor: { nazwa: "Jan" },
  zaktualizowano: "2026-01-01",
  widocznosc: "publiczne",
  politykaDatZyjacych: "ukryj",
  wyrozniane: true,
});

describe("hasło administratora", () => {
  it("akceptuje tylko właściwe hasło i odrzuca wszystko, gdy skrót jest pusty", async () => {
    const k = { sol: "abc", iteracje: 1000, skrot: await skrotHasla("tajne-haslo-1", "abc", 1000) };
    expect(await sprawdzHaslo("tajne-haslo-1", k)).toBe(true);
    expect(await sprawdzHaslo("tajne-haslo-2", k)).toBe(false);
    expect(await sprawdzHaslo("", k)).toBe(false);
    expect(await sprawdzHaslo("cokolwiek", { sol: "abc", iteracje: 1000, skrot: "" })).toBe(false);
  });

  it("w repozytorium jest tylko skrót (64 znaki szesnastkowe) albo pusta konfiguracja", () => {
    const k = JSON.parse(fs.readFileSync("data/admin.json", "utf8"));
    expect(Object.keys(k).sort()).toEqual(["iteracje", "skrot", "sol"]);
    expect(k.skrot).toMatch(/^([0-9a-f]{64})?$/);
  });
});

describe("zmiany drzew", () => {
  let katalog: string;
  const plikMeta = (slug: string) => path.join(katalog, slug, "drzewo.json");
  beforeEach(() => {
    katalog = fs.mkdtempSync(path.join(os.tmpdir(), "drzewa-"));
    for (const slug of ["alfa", "beta", "gamma"]) {
      fs.mkdirSync(path.join(katalog, slug, "zrodlo"), { recursive: true });
      fs.writeFileSync(plikMeta(slug), JSON.stringify(meta(slug)));
      fs.writeFileSync(path.join(katalog, slug, "rodzina.json"), "{}");
    }
    process.env.DRZEWA_KATALOG = katalog;
  });
  afterEach(() => {
    delete process.env.DRZEWA_KATALOG;
    fs.rmSync(katalog, { recursive: true, force: true });
  });

  it("zmienia metadane, usuwa pole wyrozniane i ustawia datę aktualizacji", () => {
    const wynik = zastosujZmianyDrzew({ rodzaj: "zmiany-drzew", zmienione: { alfa: { nazwa: "Nowa nazwa", wyrozniane: false, autor: { nazwa: "Anna", url: "https://example.org/a" } } } }, "2026-11-12");
    expect(wynik).toEqual({ zmienione: ["alfa"], usuniete: [] });
    const zapisane = JSON.parse(fs.readFileSync(plikMeta("alfa"), "utf8"));
    expect(zapisane).toMatchObject({ slug: "alfa", nazwa: "Nowa nazwa", zaktualizowano: "2026-11-12", autor: { nazwa: "Anna", url: "https://example.org/a" } });
    expect("wyrozniane" in zapisane).toBe(false);
    expect(JSON.parse(fs.readFileSync(plikMeta("beta"), "utf8")).nazwa).toBe("Rodzina beta");
  });

  it("usuwa katalog drzewa i pomija zmianę metadanych usuwanego drzewa", () => {
    const wynik = zastosujZmianyDrzew({ rodzaj: "zmiany-drzew", zmienione: { beta: { nazwa: "X" } }, usuniete: ["beta"] });
    expect(wynik).toEqual({ zmienione: [], usuniete: ["beta"] });
    expect(fs.existsSync(path.join(katalog, "beta"))).toBe(false);
    expect(fs.readdirSync(katalog).sort()).toEqual(["alfa", "gamma"]);
  });

  it("niczego nie zapisuje ani nie kasuje, gdy którakolwiek zmiana jest błędna", () => {
    const stan = () => fs.readdirSync(katalog).sort().map((s) => fs.readFileSync(plikMeta(s), "utf8"));
    const przed = stan();
    expect(() => zastosujZmianyDrzew({ rodzaj: "zmiany-drzew", zmienione: { alfa: { nazwa: "Dobra" }, gamma: { zrodlo: { nazwa: "Z", url: "to-nie-adres" } } }, usuniete: ["beta"] })).toThrow(/zrodlo/);
    expect(() => zastosujZmianyDrzew({ rodzaj: "zmiany-drzew", usuniete: ["nie-ma"] })).toThrow(/Nie ma drzewa „nie-ma”/);
    expect(() => zastosujZmianyDrzew({ rodzaj: "zmiany-drzew", usuniete: ["../alfa"] })).toThrow(/Niepoprawny slug/);
    expect(() => zastosujZmianyDrzew({ rodzaj: "zmiany-drzew", usuniete: ["alfa", "beta", "gamma"] })).toThrow(/co najmniej jedno/);
    expect(() => zastosujZmianyDrzew({ rodzaj: "zmiany-drzew", zmienione: { alfa: { slug: "inny" } as never } })).toThrow(/slug/);
    expect(() => zastosujZmianyDrzew({ slug: "alfa", osoby: {} } as never)).toThrow(/nie jest plik zmian drzew/);
    expect(stan()).toEqual(przed);
  });

  it("panel sprawdza metadane tym samym schematem co build", () => {
    const m = meta("alfa");
    expect(bledyMeta(zastosujZmianeMeta(m, { nazwa: "Inna" }))).toEqual([]);
    expect(bledyMeta(zastosujZmianeMeta(m, { nazwa: "" })).join()).toMatch(/nazwa/);
    expect(liczbaZmianDrzew({ zmienione: { alfa: {} }, usuniete: ["beta"] })).toBe(2);
    expect(JSON.parse(zmianyDoPliku({ zmienione: {}, usuniete: ["beta"] }))).toMatchObject({ rodzaj: "zmiany-drzew", usuniete: ["beta"] });
  });
});
