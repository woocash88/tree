/** Oszczędny ozdobnik: cienka linia z rombem pośrodku. */
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 12" className={`h-3 w-60 text-kreska ${className}`}>
      <path d="M0 6h100M140 6h100" stroke="currentColor" strokeWidth="1" />
      <path d="M120 1l5 5-5 5-5-5z" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="106" cy="6" r="1.5" fill="currentColor" />
      <circle cx="134" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}
