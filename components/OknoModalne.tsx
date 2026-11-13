"use client";

import { useEffect, useRef } from "react";

/** Okno modalne na elemencie <dialog> (Esc zamyka, fokus zostaje w oknie). Zawartość jest montowana tylko, gdy okno jest otwarte. */
export function OknoModalne({ otwarte, naZamkniecie, etykieta, children }: { otwarte: boolean; naZamkniecie: () => void; etykieta: string; children: React.ReactNode }) {
  const okno = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = okno.current;
    if (!d) return;
    if (otwarte && !d.open) d.showModal();
    if (!otwarte && d.open) d.close();
  }, [otwarte]);
  return (
    <dialog
      ref={okno}
      onClose={naZamkniecie}
      aria-label={etykieta}
      className="m-auto max-h-[90dvh] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border text-left border-kreska bg-lita p-5 text-tekst shadow-xl backdrop:bg-black/40"
    >
      {otwarte ? children : null}
    </dialog>
  );
}
