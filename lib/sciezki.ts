export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const sciezkaOsoby = (id: string) => `/osoba/${id}/`;
export const sciezkaDrzewa = (galazId?: string | null, osobaId?: string | null) =>
  `/drzewo/${galazId ? `${galazId}/` : ""}${osobaId ? `?osoba=${osobaId}` : ""}`;
