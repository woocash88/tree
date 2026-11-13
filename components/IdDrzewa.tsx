"use client";

import { useState } from "react";

/** Identyfikator drzewa z przyciskiem „Kopiuj”: pokazywany obok nazwy, żeby można go było podać komuś zapraszanemu do współpracy. */
export function IdDrzewa({ id, className = "" }: { id: string; className?: string }) {
  const [skopiowano, setSkopiowano] = useState(false);
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border border-kreska bg-najazd py-0.5 pl-2.5 pr-1 align-middle text-xs font-semibold text-tekst-2 ${className}`} title="Identyfikator drzewa – podaj go osobie, którą zapraszasz do współpracy">
      <span>ID</span>
      <code className="min-w-0 select-all truncate font-mono text-tekst">{id}</code>
      <button
        type="button"
        className="rounded-full px-2 py-0.5 text-akcent hover:bg-lita"
        aria-label={`Kopiuj identyfikator drzewa ${id}`}
        onClick={() => {
          void navigator.clipboard?.writeText(id).then(() => {
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
