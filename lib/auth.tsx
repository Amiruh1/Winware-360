"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, ApiError } from "./api";
import { definirNuevaClave, iniciarSesion } from "./cognito";
import { alCerrarSesion, guardarSesion, sesionActual } from "./sesion";
import type { Me, Recurso } from "./tipos";

const CLAVE_INTENCION = "winware360.tipoCuenta";
const leerIntenciones = (): Record<string, string> => { try { return JSON.parse(window.localStorage.getItem(CLAVE_INTENCION) ?? "{}"); } catch { return {}; } };
const intencionCliente = (correo: string) => leerIntenciones()[correo.toLowerCase()] === "cliente";
function olvidarIntencion(correo: string) { try { const t = leerIntenciones(); delete t[correo.toLowerCase()]; window.localStorage.setItem(CLAVE_INTENCION, JSON.stringify(t)); } catch { /* sin almacenamiento */ } }
/** Recuerda, hasta el primer ingreso, que la persona se registró como cliente. */
export function recordarTipoCuenta(correo: string, tipo: "cliente" | "personal") {
  try { const t = leerIntenciones(); t[correo.trim().toLowerCase()] = tipo; window.localStorage.setItem(CLAVE_INTENCION, JSON.stringify(t)); } catch { /* sin almacenamiento */ }
}

type Estado = "cargando" | "anonimo" | "autenticado" | "sin-conexion";
export type ResultadoLogin = { tipo: "ok" } | { tipo: "nueva-clave"; sesion: string };

interface AuthCtx {
  estado: Estado;
  me: Me | null;
  login(correo: string, clave: string): Promise<ResultadoLogin>;
  completarNuevaClave(correo: string, clave: string, sesion: string): Promise<void>;
  cerrarSesion(): void;
  recargarMe(): Promise<void>;
  reintentar(): void;
  puede(recurso: Recurso, modo?: "leer" | "escribir"): boolean;
}

const Contexto = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [me, setMe] = useState<Me | null>(null);
  const [intento, setIntento] = useState(0);

  const cargarMe = useCallback(async () => {
    let m = await api<Me>("/me");
    // Quien eligió «Soy cliente» al crear su cuenta queda activado como cliente en su primer ingreso.
    if (!m.rol && m.estado === "Pendiente" && intencionCliente(m.correo)) {
      // la intención de ser cliente solo se guarda si aceptó el aviso de privacidad al crear la cuenta
      try { await api("/me/cliente", { metodo: "POST", cuerpo: { aceptaPrivacidad: true } }); m = await api<Me>("/me"); } catch { /* si falla, verá la pantalla de cuenta pendiente */ }
      olvidarIntencion(m.correo);
    }
    setMe(m);
    setEstado("autenticado");
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!sesionActual()) { setEstado("anonimo"); return; }
      try { await cargarMe(); }
      catch (e) {
        if (!vivo) return;
        if (e instanceof ApiError && e.status === 0) setEstado("sin-conexion");
        else { guardarSesion(null); setMe(null); setEstado("anonimo"); }
      }
    })();
    return () => { vivo = false; };
  }, [cargarMe, intento]);

  useEffect(() => alCerrarSesion(() => { setMe(null); setEstado("anonimo"); }), []);

  const valor = useMemo<AuthCtx>(() => ({
    estado, me,
    async login(correo, clave) {
      const r = await iniciarSesion(correo, clave);
      if (r.tipo === "nueva-clave") return { tipo: "nueva-clave", sesion: r.sesion };
      guardarSesion(r.tokens);
      await cargarMe();
      return { tipo: "ok" };
    },
    async completarNuevaClave(correo, clave, sesion) {
      guardarSesion(await definirNuevaClave(correo, clave, sesion));
      await cargarMe();
    },
    cerrarSesion() { guardarSesion(null); setMe(null); setEstado("anonimo"); },
    recargarMe: cargarMe,
    reintentar() { setEstado("cargando"); setIntento((n) => n + 1); },
    puede(recurso, modo = "leer") { return !!me?.permisos?.[recurso]?.[modo]; },
  }), [estado, me, cargarMe]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Contexto);
  if (!c) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return c;
}
