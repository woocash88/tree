import type { Metadata, Viewport } from "next";
import { Naglowek } from "@/components/Naglowek";
import { wczytajDane } from "@/lib/dane";
import "./globals.css";

export function generateMetadata(): Metadata {
  const { rodzina } = wczytajDane();
  return {
    title: { default: rodzina.tytul, template: `%s · ${rodzina.tytul}` },
    description: rodzina.opis,
    openGraph: { title: rodzina.tytul, description: rodzina.opis, locale: "pl_PL", type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#f3ead6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { rodzina, korzenId } = wczytajDane();
  const galezie = rodzina.galezie.map((g) => ({ id: g.id, nazwa: g.nazwa, kolor: g.kolor }));
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Naglowek tytul={rodzina.tytul} galezie={galezie} korzenId={korzenId} />
        <div id="tresc" className="flex flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
