import type { Metadata } from "next";
import { FormularzRejestracji } from "@/components/konta/FormularzRejestracji";
import { StronaKonta } from "@/components/konta/StronaKonta";

export const metadata: Metadata = { title: "Rejestracja", description: "Załóż konto w serwisie Przodkowie i twórz własne drzewa genealogiczne.", robots: { index: false } };

export default function StronaRejestracji() {
  return (
    <StronaKonta>
      <FormularzRejestracji />
    </StronaKonta>
  );
}
