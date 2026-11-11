import { indeksSzukania } from "@/lib/dane";

// Statyczny plik JSON z indeksem wyszukiwania – generowany raz, przy buildzie.
export const dynamic = "force-static";

export function GET() {
  return Response.json(indeksSzukania());
}
