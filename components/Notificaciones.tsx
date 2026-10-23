"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CalendarClock, Check, CheckCheck, Info } from "lucide-react";
import { Cargando, ErrorCarga } from "./Estados";
import { useContadores } from "./Contadores";
import { useToast } from "./Toast";
import { useAuth } from "@/lib/auth";
import { api, mensajeDe } from "@/lib/api";
import { fechaHora } from "@/lib/format";
import { tonoAlerta } from "@/lib/tonos";
import type { Alerta } from "@/lib/tipos";

const destino = (a: Alerta) => a.entidad === "FACTURA" ? "/finanzas" : a.entidad === "CONTRATO" ? "/contratos" : `/inventario?equipo=${a.entidadId}`;
const IconoAlerta = ({ s }: { s: Alerta["severidad"] }) => s === "Alta" ? <AlertTriangle size={16} aria-hidden="true" /> : s === "Media" ? <CalendarClock size={16} aria-hidden="true" /> : <Info size={16} aria-hidden="true" />;
const TITULO: Record<Alerta["tipo"], string> = {
  FacturaVencida: "Factura vencida", ContratoPorVencer: "Contrato por vencer", ContratoSaturado: "Contrato saturado", GarantiaPorVencer: "Garantía por vencer",
};

/** Campana de la barra superior: abre un panel con los avisos nuevos, permite ir a cada uno y marcarlos como vistos. */
export default function Notificaciones() {
  const { puede } = useAuth();
  const { resumen, refrescar } = useContadores();
  const aviso = useToast();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<Alerta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const caja = useRef<HTMLDivElement | null>(null);
  const nuevas = resumen?.alertasNuevas ?? 0;
  const editar = puede("alertas", "escribir");

  async function cargar() {
    setError(null);
    try { setItems((await api<{ items: Alerta[] }>("/alertas", { query: { estado: "Nueva" } })).items); }
    catch (e) { setError(mensajeDe(e)); }
  }
  useEffect(() => { if (abierto) void cargar(); }, [abierto]);

  // se cierra al hacer clic fuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", tecla); };
  }, [abierto]);

  async function marcarVistas(lista: Alerta[]) {
    if (!lista.length) return;
    setOcupado(true);
    try {
      await Promise.all(lista.map((a) => api(`/alertas/${a.alertaId}`, { metodo: "PATCH", cuerpo: { estado: "Vista" } })));
      setItems((xs) => xs?.filter((x) => !lista.some((a) => a.alertaId === x.alertaId)) ?? null);
      await refrescar();
    } catch (e) { aviso(mensajeDe(e), "error"); }
    finally { setOcupado(false); }
  }

  function ir(a: Alerta) {
    setAbierto(false);
    if (editar) void marcarVistas([a]);
    router.push(destino(a));
  }

  return (
    <div className="notif" ref={caja}>
      <button type="button" className="bell" aria-label={`Notificaciones: ${nuevas} avisos nuevos`} aria-expanded={abierto} aria-haspopup="dialog" onClick={() => setAbierto((v) => !v)}>
        <Bell size={18} aria-hidden="true" />
        {nuevas > 0 && <b>{nuevas > 99 ? "99+" : nuevas}</b>}
      </button>
      {abierto && (
        <div className="notif-panel" role="dialog" aria-label="Notificaciones">
          <div className="notif-cab">
            <strong>Notificaciones</strong>
            {editar && !!items?.length && (
              <button type="button" className="btn-texto" disabled={ocupado} onClick={() => void marcarVistas(items)}><CheckCheck size={15} aria-hidden="true" /> Marcar todas como vistas</button>
            )}
          </div>
          <div className="notif-cuerpo">
            {!items && !error && <Cargando />}
            {error && <ErrorCarga mensaje={error} onReintentar={() => void cargar()} />}
            {items && items.length === 0 && (
              <div className="notif-vacio"><CheckCheck size={22} aria-hidden="true" /><p>No tienes avisos nuevos.</p><small>Todo en orden.</small></div>
            )}
            {items && items.length > 0 && (
              <ul className="notif-lista">
                {items.map((a) => (
                  <li key={a.alertaId}>
                    <button type="button" className="notif-item" onClick={() => ir(a)}>
                      <span className={`aviso-icon aviso-${tonoAlerta(a.severidad)}`}><IconoAlerta s={a.severidad} /></span>
                      <span className="notif-texto">
                        <b>{TITULO[a.tipo] ?? "Aviso"}</b>
                        <span>{a.mensaje}</span>
                        <small>{fechaHora(a.creadaEn)}</small>
                      </span>
                    </button>
                    {editar && (
                      <button type="button" className="notif-visto" disabled={ocupado} onClick={() => void marcarVistas([a])} aria-label="Marcar como vista" title="Marcar como vista">
                        <Check size={15} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="notif-pie">
            <Link href="/" onClick={() => setAbierto(false)}>Ver todos los avisos en Inicio</Link>
          </div>
        </div>
      )}
    </div>
  );
}
