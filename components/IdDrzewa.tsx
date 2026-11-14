"use client";

import { useState } from "react";

/** „ID drzewa: 48213” z przyciskiem „Kopiuj”: pokazywane obok nazwy, żeby można było podać numer komuś zapraszanemu do współpracy. */
export function IdDrzewa({ numer, className = "" }: { numer?: string; className?: string }) {
  const [skopiowano, setSkopiowano] = useState(false);
  if (!numer) return null;
  return (
    <span className={`id-drzewa inline-flex max-w-full items-center gap-1.5 rounded-full border border-kreska bg-najazd py-0.5 pl-2.5 pr-1 align-middle text-xs font-semibold text-tekst-2 ${className}`} title="Numer drzewa – podaj go osobie, którą zapraszasz do współpracy">
      <span>ID drzewa:</span>
      <code className="select-all font-mono text-sm text-tekst">{numer}</code>
      <button
        type="button"
        className="rounded-full px-2 py-0.5 text-akcent hover:bg-lita"
        aria-label={`Kopiuj numer drzewa ${numer}`}
        onClick={() => {
          void navigator.clipboard?.writeText(numer).then(() => {
            setSkopiowano(true);
            setTimeout(() => setSkopiowano(false), 1800);
          });
        }}
      >
        {skopiowano ? "Skopiowano" : "Kopiuj"}
      </button>
    </span>
  );
}
