// Kontrast WCAG tekstu na powierzchniach "glass" w obu motywach – w najgorszym punkcie tła
// (centrum każdej plamy gradientu i miejsca nakładania się plam). Uruchom: npm run kontrast
// Wartości kolorów muszą odpowiadać zmiennym w app/globals.css; skrypt kończy się błędem, gdy kontrast < 4,5:1.
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = ([r, g, b]) => 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const miesz = (tlo, [r, g, b, a]) => tlo.map((c, i) => Math.round(c * (1 - a) + [r, g, b][i] * a));

const tryby = {
  jasny: {
    tlo: hex("#e9edfb"),
    plamy: [[99, 102, 241, 0.34], [45, 212, 191, 0.3], [167, 139, 250, 0.34], [56, 189, 248, 0.24]],
    powierzchnie: { szklo: [255, 255, 255, 0.62], panel: [255, 255, 255, 0.74], lita: null, "pole": [255, 255, 255, 0.9] },
    lita: hex("#f6f7fe"),
    tekst: hex("#0f1429"), tekst2: hex("#434a69"), akcent: hex("#3540d1"), akcentTekst: hex("#ffffff"), blad: hex("#b4234a"),
  },
  ciemny: {
    tlo: hex("#0a0e1f"),
    plamy: [[99, 102, 241, 0.4], [20, 184, 166, 0.24], [139, 92, 246, 0.36], [14, 165, 233, 0.2]],
    powierzchnie: { szklo: [22, 28, 62, 0.62], panel: [18, 24, 54, 0.78], lita: null, "pole": [12, 16, 40, 0.8] },
    lita: hex("#141a3a"),
    tekst: hex("#eceffd"), tekst2: hex("#aab1d0"), akcent: hex("#99a4ff"), akcentTekst: hex("#0a0e22"), blad: hex("#ff8fa8"),
  },
};

let minimum = 99;
for (const [nazwa, t] of Object.entries(tryby)) {
  // tła: samo tło + każda plama w centrum + dwie najjaśniejsze/najciemniejsze plamy nałożone (przybliżenie nakładania)
  const tla = [t.tlo, ...t.plamy.map((p) => miesz(t.tlo, p))];
  const dwie = [];
  for (let i = 0; i < t.plamy.length; i++) for (let j = i + 1; j < t.plamy.length; j++) dwie.push(miesz(miesz(t.tlo, t.plamy[i]), t.plamy[j]));
  tla.push(...dwie);
  for (const [pn, p] of Object.entries(t.powierzchnie)) {
    const wyniki = { tekst: 99, tekst2: 99, akcent: 99, blad: 99 };
    for (const b of tla) {
      const pow = p ? miesz(b, p) : t.lita;
      for (const k of Object.keys(wyniki)) wyniki[k] = Math.min(wyniki[k], kontrast(t[k], pow));
    }
    console.log(nazwa.padEnd(7), pn.padEnd(6), Object.entries(wyniki).map(([k, v]) => `${k} ${v.toFixed(1)}`).join("  "));
    minimum = Math.min(minimum, ...Object.values(wyniki));
  }
  console.log(nazwa.padEnd(7), "przycisk główny (tekst na akcencie):", kontrast(t.akcentTekst, t.akcent).toFixed(1));
  minimum = Math.min(minimum, kontrast(t.akcentTekst, t.akcent));
}
// kolory gałęzi: tekst czarny/biały wybierany automatycznie – najgorszy przypadek
const galezie = ["#64748b", "#e11d48", "#8b5cf6", "#059669", "#ea580c", "#3b82f6", "#58980b", "#0891b2", "#3540d1"];
const bialy = [255, 255, 255], ciemny = hex("#0b1020");
for (const g of galezie) {
  const c = hex(g);
  const najlepszy = Math.max(kontrast(bialy, c), kontrast(ciemny, c));
  const tloJasne = kontrast(c, hex("#f6f7fe")), tloCiemne = kontrast(c, hex("#141a3a"));
  console.log(g, "tekst na kolorze:", najlepszy.toFixed(1), " znacznik na jasnym:", tloJasne.toFixed(1), " na ciemnym:", tloCiemne.toFixed(1));
}
console.log("NAJMNIEJSZY kontrast tekstu:", minimum.toFixed(2), minimum >= 4.5 ? "(AA spełnione)" : "(PONIŻEJ AA)");
process.exit(minimum >= 4.5 ? 0 : 1);
