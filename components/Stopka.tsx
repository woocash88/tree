export function Stopka({ zrodlo }: { zrodlo?: string }) {
  return (
    <footer className="mt-16 border-t border-kreska/60 px-4 py-6 text-center text-sm text-sepia">
      <p>
        {zrodlo && (
          <>
            Dane:{" "}
            <a className="link" href={zrodlo} rel="noreferrer">
              genealogia.okiem.pl
            </a>
            .{" "}
          </>
        )}
        Daty osób żyjących są ukryte. Strona nie używa ciasteczek ani skryptów śledzących.
      </p>
    </footer>
  );
}
