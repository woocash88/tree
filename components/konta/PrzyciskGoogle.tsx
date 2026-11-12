"use client";

import { useState } from "react";
import { komunikatBledu, zalogujGoogle } from "@/lib/baza/konta";

export function PrzyciskGoogle({ etykieta, naSukces, naBlad }: { etykieta: string; naSukces: () => void; naBlad: (komunikat: string) => void }) {
  const [trwa, setTrwa] = useState(false);
  return (
    <button
      type="button"
      className="przycisk !min-h-11 w-full"
      disabled={trwa}
      onClick={async () => {
        setTrwa(true);
        try {
          await zalogujGoogle();
          naSukces();
        } catch (e) {
          naBlad(komunikatBledu(e));
        }
        setTrwa(false);
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.4 14.4a7.200 7.200 0 0 1 0-4.800V6.500H1.400a12 12 0 0 0 0 10.900l4-3Z" />
        <path fill="#EA4335" d="M12 4.800c1.800 0 3.300.6 4.600 1.800l3.400-3.400A12 12 0 0 0 1.400 6.500l4 3.100C6.300 6.900 8.900 4.800 12 4.800Z" />
      </svg>
      {etykieta}
    </button>
  );
}
