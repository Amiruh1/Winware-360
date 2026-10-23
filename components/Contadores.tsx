"use client";

import { createContext, useContext } from "react";
import type { Resumen } from "@/lib/tipos";

export interface ContadoresCtx { resumen: Resumen | null; cargando: boolean; error: string | null; refrescar: () => Promise<void> }
export const Contadores = createContext<ContadoresCtx>({ resumen: null, cargando: true, error: null, refrescar: async () => undefined });
/** Datos del resumen compartidos por el menú, la barra superior y la pantalla de inicio. */
export const useContadores = () => useContext(Contadores);
