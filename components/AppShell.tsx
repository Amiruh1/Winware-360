"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Clock, WifiOff } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Logo from "./Logo";
import AvisoPrivacidad from "./AvisoPrivacidad";
import { Cargando } from "./Estados";
import { Contadores } from "./Contadores";
import { useAuth } from "@/lib/auth";
import { api, mensajeDe } from "@/lib/api";
import { useCarga } from "@/lib/hooks";
import type { Resumen } from "@/lib/tipos";

function Pantalla({ children }: { children: ReactNode }) {
  return (
    <main className="pantalla-centro">
      <div className="tarjeta-centro">
        <div className="logo-centro"><Logo size={44} /></div>
        {children}
      </div>
    </main>
  );
}

function Pendiente() {
  const { me, recargarMe, cerrarSesion } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [acepta, setAcepta] = useState(false);
  async function comoCliente() {
    setError(null); setOcupado(true);
    try { await api("/me/cliente", { metodo: "POST", cuerpo: { aceptaPrivacidad: acepta } }); await recargarMe(); }
    catch (e) { setError(mensajeDe(e)); } finally { setOcupado(false); }
  }
  return (
    <Pantalla>
      <h1>Tu cuenta está pendiente</h1>
      <p className="muted"><Clock size={16} aria-hidden="true" style={{ verticalAlign: "-3px" }} /> Hola, {me?.nombre}. Un administrador de Winware debe aprobar tu cuenta y asignarte un rol antes de que puedas usar el portal.</p>
      <p className="muted">Cuando te avisen, pulsa «Revisar de nuevo». Si sigue igual, cierra sesión y vuelve a entrar.</p>
      <div className="acciones-centro">
        <button type="button" className="btn" onClick={() => void recargarMe()}>Revisar de nuevo</button>
        <button type="button" className="btn btn-secundario" onClick={cerrarSesion}>Cerrar sesión</button>
      </div>
      <div className="aparte">
        <p className="muted"><b>¿Eres cliente de Winware?</b> Si vienes a alquilar equipos, no necesitas aprobación.</p>
        {error && <p className="aviso-error" role="alert">{error}</p>}
        <AvisoPrivacidad />
        <label className="check acepta-privacidad"><input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} /> He leído y acepto el aviso de privacidad</label>
        <button type="button" className="btn btn-secundario" disabled={ocupado || !acepta} onClick={() => void comoCliente()}>{ocupado ? "Un momento…" : "Continuar como cliente"}</button>
      </div>
    </Pantalla>
  );
}

function Contenido({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me } = useAuth();
  const esCliente = me?.rol === "Cliente";
  // El cliente no usa el resumen del personal
  const { datos, error, cargando, recargar } = useCarga(() => (esCliente ? Promise.resolve(null) : api<Resumen>("/resumen")), [pathname, esCliente]);
  const refrescar = useCallback(() => recargar(), [recargar]);
  return (
    <Contadores.Provider value={{ resumen: datos, cargando: esCliente ? false : cargando, error, refrescar }}>
      <a href="#contenido" className="saltar">Saltar al contenido</a>
      <div className="shell">
        <Sidebar />
        <div className="content">
          <Topbar />
          <main id="contenido" className="main">{children}</main>
        </div>
      </div>
    </Contadores.Provider>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { estado, me, reintentar, cerrarSesion } = useAuth();
  const router = useRouter();
  useEffect(() => { if (estado === "anonimo") router.replace("/login"); }, [estado, router]);

  if (estado === "cargando" || estado === "anonimo") return <Pantalla><Cargando texto="Abriendo tu sesión…" /></Pantalla>;
  if (estado === "sin-conexion") {
    return (
      <Pantalla>
        <h1>Sin conexión</h1>
        <p className="muted"><WifiOff size={16} aria-hidden="true" style={{ verticalAlign: "-3px" }} /> No se pudo conectar con el servidor. Revisa tu internet e inténtalo de nuevo.</p>
        <div className="acciones-centro">
          <button type="button" className="btn" onClick={reintentar}>Reintentar</button>
          <button type="button" className="btn btn-secundario" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </Pantalla>
    );
  }
  if (!me?.rol) return <Pendiente />;
  return <Contenido>{children}</Contenido>;
}
