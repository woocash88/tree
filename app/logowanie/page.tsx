import type { Metadata } from "next";
import { FormularzLogowania } from "@/components/konta/FormularzLogowania";
import { StronaKonta } from "@/components/konta/StronaKonta";

export const metadata: Metadata = { title: "Logowanie", description: "Zaloguj się do serwisu Przodkowie.", robots: { index: false } };

export default function StronaLogowania() {
  return (
    <StronaKonta>
      <FormularzLogowania />
    </StronaKonta>
  );
}
