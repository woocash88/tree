"use client";

import { createContext } from "react";
import type { ApiEdycji } from "@/components/useEdycje";
import type { WpisSzukania } from "@/lib/szukaj";

/** Dane drzewa z bazy udostępniane komponentom widoków (lista, diagram, panel osoby, wyszukiwarka). */
export type WartoscKontekstuDb = { drzewoId: string; api: ApiEdycji; indeks: WpisSzukania[] };
export const KontekstDb = createContext<WartoscKontekstuDb | null>(null);
