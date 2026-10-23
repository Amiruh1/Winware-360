"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Drawer from "./Drawer";
import { Texto } from "./Campos";
import { useToast } from "./Toast";
import { useAuth } from "@/lib/auth";
import { api, mensajeDe } from "@/lib/api";
import { useCarga } from "@/lib/hooks";
import type { Perfil } from "@/lib/tipos";

/** Datos para la boleta o factura: DNI (8 dígitos) genera boleta; RUC (11 dígitos) genera factura. */
export default function PerfilCliente({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => Promise<void> | void }) {
  const aviso = useToast();
  const { recargarMe } = useAuth();
  const perfil = useCarga(() => api<Perfil>("/portal/perfil"), []);
  const c = perfil.datos?.cliente;
  const [f, setF] = useState<{ razonSocial: string; ruc: string; telefono: string; direccion: string } | null>(null);
  const valores = f ?? { razonSocial: c?.razonSocial ?? perfil.datos?.nombre ?? "", ruc: c?.ruc ?? "", telefono: c?.telefono ?? "", direccion: c?.direccion ?? "" };
  const set = (k: keyof typeof valores) => (v: string) => setF({ ...valores, [k]: v });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null); setEnviando(true);
    try {
      await api("/portal/perfil", { metodo: "PUT", cuerpo: valores });
      await recargarMe();
      aviso("Datos guardados.");
      await onGuardado();
    } catch (x) { setError(mensajeDe(x)); } finally { setEnviando(false); }
  }

  return (
    <Drawer titulo="Tus datos de facturación" subtitulo="Se usan para emitir tu boleta o factura" onCerrar={onCerrar} ancho={460}>
      {!perfil.datos && !perfil.error && <p className="muted">Cargando…</p>}
      {perfil.error && <p className="error" role="alert">{perfil.error}</p>}
      {perfil.datos && (
        <form className="formulario" onSubmit={(e) => void enviar(e)}>
          <Texto etiqueta="Nombre completo o razón social" requerido valor={valores.razonSocial} onCambio={set("razonSocial")} maxLength={150} />
          <Texto etiqueta="DNI o RUC" requerido valor={valores.ruc} onCambio={(v) => set("ruc")(v.replace(/\D/g, "").slice(0, 11))} ayuda="8 dígitos (DNI) emite boleta; 11 dígitos (RUC) emite factura." />
          <Texto etiqueta="Teléfono" requerido valor={valores.telefono} onCambio={set("telefono")} maxLength={30} />
          <Texto etiqueta="Dirección" requerido valor={valores.direccion} onCambio={set("direccion")} maxLength={200} />
          {error && <p className="error" role="alert">{error}</p>}
          <div className="drawer-pie">
            <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="btn" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      )}
    </Drawer>
  );
}
