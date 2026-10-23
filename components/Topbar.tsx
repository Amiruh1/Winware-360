"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { iniciales } from "@/lib/format";
import Notificaciones from "./Notificaciones";

export default function Topbar() {
  const { me, cerrarSesion, puede } = useAuth();
  if (!me) return null;
  return (
    <div className="topbar">
      <div className="topbar-client">
        <strong>Winware S.A.C.</strong>
        <span>{me.rol === "Cliente" ? "Portal del cliente" : "Gestión de equipos en alquiler"}</span>
      </div>
      <div className="topbar-right">
        {me.rol !== "Cliente" && puede("alertas") && <Notificaciones />}
        <div className="user">
          <span className="avatar" aria-hidden="true">{iniciales(me.nombre)}</span>
          <span className="user-text">
            <strong>{me.nombre}</strong>
            <small>{me.rol === "Administracion" ? "Administración" : me.rol === "Tecnico" ? "Técnico" : me.rol}</small>
          </span>
        </div>
        <button type="button" className="icono-btn" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
