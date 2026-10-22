"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mensajeDe } from "./api";

export interface Carga<T> { datos: T | null; error: string | null; cargando: boolean; recargar: () => Promise<void> }

/** Carga datos al entrar y cada vez que cambian las dependencias. Ignora respuestas viejas. */
export function useCarga<T>(cargar: () => Promise<T>, deps: unknown[] = []): Carga<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const ultimo = useRef(0);
  const fn = useRef(cargar);
  fn.current = cargar;

  const recargar = useCallback(async () => {
    const mio = ++ultimo.current;
    setCargando(true);
    try {
      const d = await fn.current();
      if (mio === ultimo.current) { setDatos(d); setError(null); }
    } catch (e) {
      if (mio === ultimo.current) setError(mensajeDe(e));
    } finally {
      if (mio === ultimo.current) setCargando(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void recargar(); }, deps);
  return { datos, error, cargando, recargar };
}
