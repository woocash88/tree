import type { Metadata } from "next";
import { PanelProfilu } from "@/components/konta/PanelProfilu";
import { StronaKonta } from "@/components/konta/StronaKonta";

export const metadata: Metadata = { title: "Mój profil", description: "Twój profil i drzewa genealogiczne w serwisie Przodkowie.", robots: { index: false } };

export default function StronaProfilu() {
  return (
    <StronaKonta szeroka>
      <PanelProfilu />
    </StronaKonta>
  );
}
