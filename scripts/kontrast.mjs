// Kontrast WCAG tekstu na powierzchniach motywu „miękkiego” w obu trybach. Uruchom: npm run kontrast
// Wartości kolorów muszą odpowiadać zmiennym w app/globals.css; skrypt kończy się błędem, gdy kontrast < 4,5:1.
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const miesz = (tlo, [r, g, b, a]) => tlo.map((c, i) => Math.round(c * (1 - a) + [r, g, b][i] * a));

const tryby = {
  jasny: {
    // tło strony i jego miękkie koła (najciemniejsze miejsce to koło nałożone na tło)
    tla: [hex("#f2f4ee"), miesz(hex("#f2f4ee"), [47, 111, 79, 0.1]), miesz(hex("#f2f4ee"), [244, 164, 120, 0.2])],
    powierzchnie: { szklo: hex("#ffffff"), chip: hex("#e6efe8"), tag: hex("#e1ece3"), "panel-wew": hex("#f4f7f2"), najazd: miesz(hex("#ffffff"), [47, 111, 79, 0.09]), zaznaczenie: miesz(hex("#ffffff"), [47, 111, 79, 0.16]) },
    tekst: hex("#1f2a24"), tekst2: hex("#4b5a50"), tekst3: hex("#546359"), akcent: hex("#2f6f4f"), akcentTekst: hex("#ffffff"), blad: hex("#b4234a"),
    biala: hex("#ffffff"),
  },
  ciemny: {
    tla: [hex("#101712"), miesz(hex("#101712"), [47, 111, 79, 0.2]), miesz(hex("#101712"), [244, 164, 120, 0.07])],
    powierzchnie: { szklo: hex("#1a241e"), pole: hex("#151e18"), chip: hex("#243229"), tag: hex("#223a2d"), "panel-wew": hex("#151e18"), najazd: miesz(hex("#1a241e"), [124, 199, 160, 0.12]), zaznaczenie: miesz(hex("#1a241e"), [124, 199, 160, 0.22]) },
    tekst: hex("#e8efe9"), tekst2: hex("#b6c4ba"), tekst3: hex("#a9b9ae"), akcent: hex("#7cc7a0"), akcentTekst: hex("#0b1a12"), blad: hex("#ff8fa8"),
    biala: hex("#1a241e"),
  },
};

let minimum = 99;
for (const [nazwa, t] of Object.entries(tryby)) {
  const wszystkie = { ...Object.fromEntries(t.tla.map((b, i) => [`tło ${i + 1}`, b])), ...t.powierzchnie };
  for (const [pn, pow] of Object.entries(wszystkie)) {
    const wyniki = { tekst: kontrast(t.tekst, pow), tekst2: kontrast(t.tekst2, pow), tekst3: kontrast(t.tekst3, pow), akcent: kontrast(t.akcent, pow), blad: kontrast(t.blad, pow) };
    console.log(nazwa.padEnd(7), pn.padEnd(10), Object.entries(wyniki).map(([k, v]) => `${k} ${v.toFixed(1)}`).join("  "));
    minimum = Math.min(minimum, ...Object.values(wyniki));
  }
  console.log(nazwa.padEnd(7), "przycisk główny (tekst na akcencie):", kontrast(t.akcentTekst, t.akcent).toFixed(1));
  minimum = Math.min(minimum, kontrast(t.akcentTekst, t.akcent));
}
// kolory gałęzi: tekst czarny/biały wybierany automatycznie – najgorszy przypadek
const galezie = ["#64748b", "#e11d48", "#8b5cf6", "#059669", "#ea580c", "#3b82f6", "#58980b", "#0891b2", "#2f6f4f", "#3540d1"];
const bialy = [255, 255, 255], ciemny = hex("#0b1020");
for (const g of galezie) {
  const c = hex(g);
  const najlepszy = Math.max(kontrast(bialy, c), kontrast(ciemny, c));
  console.log(g, "tekst na kolorze:", najlepszy.toFixed(1), " znacznik na jasnym:", kontrast(c, hex("#ffffff")).toFixed(1), " na ciemnym:", kontrast(c, hex("#1a241e")).toFixed(1));
}
console.log("NAJMNIEJSZY kontrast tekstu:", minimum.toFixed(2), minimum >= 4.5 ? "(AA spełnione)" : "(PONIŻEJ AA)");
process.exit(minimum >= 4.5 ? 0 : 1);
