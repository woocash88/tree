import type { Metadata } from "next";
import { Suspense } from "react";
import { WidokDrzewaDb } from "@/components/db/WidokDrzewaDb";

// Drzewa użytkowników są wczytywane w przeglądarce, więc tej strony nie indeksujemy.
export const metadata: Metadata = { title: "Drzewo", robots: { index: false, follow: false } };

export default function StronaDrzewaUzytkownika() {
  return (
    <Suspense fallback={<p className="flex-1 px-4 py-16 text-center">Wczytywanie…</p>}>
      <WidokDrzewaDb />
    </Suspense>
  );
}
