import type { Metadata, Viewport } from "next";
import { ADRES_SERWISU } from "@/lib/sciezki";
import "./globals.css";

const NAZWA = "Przodkowie";
const OPIS = "Drzewa genealogiczne rodzin – przeglądaj pokolenia, szukaj przodków i odkrywaj powiązania.";

export const metadata: Metadata = {
  metadataBase: new URL(ADRES_SERWISU + "/"),
  title: { default: `${NAZWA} – drzewa genealogiczne rodzin`, template: `%s · ${NAZWA}` },
  description: OPIS,
  openGraph: { siteName: NAZWA, title: NAZWA, description: OPIS, locale: "pl_PL", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9edfb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1f" },
  ],
};

// Zapamiętany motyw ustawiamy przed pierwszym wyrenderowaniem strony (skrypt własny, wbudowany).
const SKRYPT_MOTYWU = `try{var t=localStorage.getItem("motyw");if(t==="jasny"||t==="ciemny")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRYPT_MOTYWU }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
