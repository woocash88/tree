"use client";

import { useState } from "react";
import { FACEBOOK_WLACZONY } from "@/lib/baza/firebase";
import { komunikatBledu, zalogujFacebook } from "@/lib/baza/konta";

/** Przycisk „… przez Facebook”. Widoczny tylko, gdy logowanie przez Facebooka jest włączone (FACEBOOK_WLACZONY). */
export function PrzyciskFacebook({ etykieta, naSukces, naBlad }: { etykieta: string; naSukces: () => void; naBlad: (komunikat: string) => void }) {
  const [trwa, setTrwa] = useState(false);
  if (!FACEBOOK_WLACZONY) return null;
  return (
    <button
      type="button"
      className="przycisk !min-h-11 w-full !border-0 !bg-[#1877F2] !text-white hover:!bg-[#1468d8]"
      disabled={trwa}
      onClick={async () => {
        setTrwa(true);
        try {
          await zalogujFacebook();
          naSukces();
        } catch (e) {
          naBlad(komunikatBledu(e));
        }
        setTrwa(false);
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="#fff">
        <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.700 4.500-4.700 1.300 0 2.700.2 2.700.2v3h-1.500c-1.500 0-2 .9-2 1.900V12h3.400l-.5 3.500h-2.900v8.400A12 12 0 0 0 24 12Z" />
      </svg>
      {etykieta}
    </button>
  );
}
