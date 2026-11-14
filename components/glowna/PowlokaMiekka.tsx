import { Stopka } from "@/components/Stopka";
import { NaglowekGlowna } from "./NaglowekGlowna";

/**
 * Wspólna oprawa stron w stylu miękkim (wzór C): kremowe tło z miękkimi plamami, nagłówek-pigułka, treść i stopka.
 * `pasek` to opcjonalny pasek pod nagłówkiem (np. rola użytkownika w drzewie).
 */
export function PowlokaMiekka({ aktywny, pasek, children }: { aktywny?: "drzewa"; pasek?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glowna flex flex-col">
      <div aria-hidden="true" className="g-orb" style={{ top: -200, left: -160, width: 640, height: 640, background: "var(--g-orb-1)" }} />
      <div aria-hidden="true" className="g-orb" style={{ top: 140, right: -220, width: 700, height: 700, background: "var(--g-orb-2)" }} />
      <div aria-hidden="true" className="g-orb" style={{ top: 820, left: "12%", width: 520, height: 520, background: "var(--g-orb-3)" }} />
      <div className="relative z-10 flex flex-1 flex-col">
        <NaglowekGlowna aktywny={aktywny} />
        {pasek}
        {children}
        <Stopka />
      </div>
    </div>
  );
}
