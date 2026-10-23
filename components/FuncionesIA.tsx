"use client";

// Funciones de IA del asistente (ver src/ia/funciones.ts en el backend). Todas muestran si la respuesta vino de la IA
// o de las reglas de respaldo, y son sugerencias: una persona decide.
import { useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, ClipboardList, Lightbulb, ListChecks, Newspaper, PenLine, ShoppingCart, Sparkles } from "lucide-react";
import EquipoImagen from "./EquipoImagen";
import NotaIA from "./NotaIA";
import { api, mensajeDe } from "@/lib/api";
import { pen } from "@/lib/format";
import type { PasosIA, RecomendacionesIA, TextoIA } from "@/lib/tipos";

/** Estado común: cargando, error y resultado de una llamada a la IA. */
function useIA<T>() {
  const [r, setR] = useState<T | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedir = async (ruta: string, cuerpo: unknown = {}) => {
    setError(null); setCargando(true);
    try { const x = await api<T>(ruta, { metodo: "POST", cuerpo }); setR(x); return x; }
    catch (e) { setError(mensajeDe(e)); return null; }
    finally { setCargando(false); }
  };
  return { r, cargando, error, pedir, limpiar: () => setR(null) };
}

/** 1) Recomendar equipos del catálogo según lo que el cliente necesita. */
export function RecomendadorIA({ enCarrito, onAgregar }: { enCarrito: string[]; onAgregar: (equipoId: string) => void }) {
  const [necesidad, setNecesidad] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const ia = useIA<RecomendacionesIA>();
  const enviar = (ev: FormEvent) => { ev.preventDefault(); void ia.pedir("/asistente/recomendar", { necesidad, presupuesto: presupuesto ? Number(presupuesto) : undefined }); };
  const EJEMPLOS = ["Necesito 3 laptops para que mi equipo trabaje en Excel y videollamadas", "Una impresora para facturas a doble cara", "Un monitor extra para diseñar"];
  return (
    <div className="stack">
      <form className="formulario" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="ia-necesidad">¿Para qué necesitas los equipos?</label>
          <textarea id="ia-necesidad" rows={4} maxLength={500} value={necesidad} onChange={(e) => setNecesidad(e.target.value)} placeholder="Ej.: equipo para una oficina de 5 personas que usa Excel y correo" />
        </div>
        <div className="chips" aria-label="Ejemplos">{EJEMPLOS.map((x) => <button key={x} type="button" className="chip" onClick={() => setNecesidad(x)}>{x}</button>)}</div>
        <div className="campo">
          <label htmlFor="ia-presupuesto">Presupuesto máximo por equipo al mes (opcional)</label>
          <input id="ia-presupuesto" type="number" min={1} value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} placeholder="S/" />
        </div>
        {ia.error && <p className="error" role="alert">{ia.error}</p>}
        <div className="drawer-pie"><button type="submit" className="btn" disabled={ia.cargando || necesidad.trim().length < 5}><Sparkles size={16} aria-hidden="true" /> {ia.cargando ? "Buscando…" : "Recomendarme equipos"}</button></div>
      </form>
      {ia.r && !ia.cargando && (
        <section className="ia-resultado" aria-live="polite">
          <p>{ia.r.resumen}</p>
          <ul className="resumen-pedido">
            {ia.r.recomendaciones.map((e) => {
              const dentro = enCarrito.includes(e.equipoId);
              return (
                <li key={e.equipoId} className="ia-recomendacion">
                  <EquipoImagen tipo={e.tipo} nombre={e.nombre} url={e.imagenUrl} variante="mini" />
                  <div className="pedido-info"><strong>{e.nombre}</strong><small>{e.motivo}</small></div>
                  <div className="pedido-precio"><b>{pen(e.tarifaMensual)}</b><small>al mes</small></div>
                  <button type="button" className="btn btn-sm" disabled={dentro} onClick={() => onAgregar(e.equipoId)}>
                    {dentro ? <><CheckCircle2 size={14} aria-hidden="true" /> En tu pedido</> : <><ShoppingCart size={14} aria-hidden="true" /> Agregar</>}
                  </button>
                </li>
              );
            })}
          </ul>
          <NotaIA r={ia.r} revisar={false} />
        </section>
      )}
    </div>
  );
}

/** 2) Resumen del historial de un contrato (cliente dueño o personal con acceso). */
export function ResumenContratoIA({ contratoId }: { contratoId: string }) {
  const ia = useIA<TextoIA>();
  return (
    <section className="ia-bloque" aria-label="Resumen con IA">
      {!ia.r && <button type="button" className="btn btn-secundario btn-sm" disabled={ia.cargando} onClick={() => void ia.pedir(`/asistente/contratos/${contratoId}/resumen`)}>
        <ClipboardList size={15} aria-hidden="true" /> {ia.cargando ? "Resumiendo…" : "Resumir con IA"}</button>}
      {ia.error && <p className="error" role="alert">{ia.error}</p>}
      {ia.r && <div className="ia-resultado"><p className="ia-texto">{ia.r.texto}</p><NotaIA r={ia.r} /></div>}
    </section>
  );
}

/** 3) Borrador de respuesta al cliente para un ticket. El agente lo edita en el cuadro de comentario antes de enviarlo. */
export function RespuestaTicketIA({ ticketId, onBorrador }: { ticketId: string; onBorrador: (texto: string) => void }) {
  const [indicaciones, setIndicaciones] = useState("");
  const ia = useIA<TextoIA>();
  const redactar = async () => { const x = await ia.pedir(`/asistente/tickets/${ticketId}/respuesta`, indicaciones.trim() ? { indicaciones: indicaciones.trim() } : {}); if (x) onBorrador(x.texto); };
  return (
    <div className="ia-bloque">
      <div className="ia-fila">
        <input aria-label="Indicaciones para la IA (opcional)" maxLength={300} value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} placeholder="Indicaciones opcionales (ej.: pasaremos el jueves a las 10)" />
        <button type="button" className="btn btn-secundario btn-sm" disabled={ia.cargando} onClick={() => void redactar()}><PenLine size={15} aria-hidden="true" /> {ia.cargando ? "Redactando…" : "Redactar respuesta con IA"}</button>
      </div>
      {ia.error && <p className="error" role="alert">{ia.error}</p>}
      {ia.r && <NotaIA r={ia.r} />}
    </div>
  );
}

/** 4) Pasos de diagnóstico sugeridos para el técnico. */
export function DiagnosticoIA({ ticketId }: { ticketId: string }) {
  const ia = useIA<PasosIA>();
  return (
    <section className="ia-bloque" aria-label="Diagnóstico sugerido">
      {!ia.r && <button type="button" className="btn btn-secundario btn-sm" disabled={ia.cargando} onClick={() => void ia.pedir(`/asistente/tickets/${ticketId}/diagnostico`)}>
        <ListChecks size={15} aria-hidden="true" /> {ia.cargando ? "Pensando…" : "Sugerir diagnóstico"}</button>}
      {ia.error && <p className="error" role="alert">{ia.error}</p>}
      {ia.r && (
        <div className="ia-resultado">
          <strong>Diagnóstico sugerido</strong>
          <ol className="ia-pasos">{ia.r.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>
          <NotaIA r={ia.r} />
        </div>
      )}
    </section>
  );
}

/** 5) Autoayuda: qué puede probar el cliente antes de enviar el reporte. */
export function AutoayudaIA({ equipoId, descripcion }: { equipoId: string; descripcion: string }) {
  const ia = useIA<PasosIA>();
  const listo = !!equipoId && descripcion.trim().length >= 5;
  return (
    <div className="ia-bloque">
      <button type="button" className="btn btn-secundario btn-sm" disabled={!listo || ia.cargando} onClick={() => void ia.pedir("/asistente/autoayuda", { equipoId, descripcion })}
        title={listo ? undefined : "Elige el equipo y cuéntanos qué pasa"}>
        <Lightbulb size={15} aria-hidden="true" /> {ia.cargando ? "Buscando…" : "¿Qué puedo probar antes?"}
      </button>
      {ia.error && <p className="error" role="alert">{ia.error}</p>}
      {ia.r && (
        <div className="ia-resultado">
          <strong>Prueba esto antes de enviar el reporte</strong>
          <ol className="ia-pasos">{ia.r.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>
          <NotaIA r={ia.r} revisar={false} />
        </div>
      )}
    </div>
  );
}

/** 6) Resumen del día para el personal (según lo que su rol puede ver). */
export function ResumenDiaIA() {
  const ia = useIA<TextoIA>();
  return (
    <section className="panel" aria-labelledby="h-dia">
      <div className="panel-cabecera">
        <h2 id="h-dia" className="titulo-icono"><Newspaper size={18} aria-hidden="true" /> Resumen del día</h2>
        <button type="button" className="btn btn-secundario btn-sm" disabled={ia.cargando} onClick={() => void ia.pedir("/asistente/resumen-operativo")}>
          <Sparkles size={15} aria-hidden="true" /> {ia.cargando ? "Generando…" : ia.r ? "Actualizar" : "Generar con IA"}
        </button>
      </div>
      {!ia.r && !ia.error && <p className="muted">Un resumen breve de tickets, inventario y avisos para empezar el día.</p>}
      {ia.error && <p className="error" role="alert">{ia.error}</p>}
      {ia.r && <><p className="ia-texto">{ia.r.texto}</p><NotaIA r={ia.r} /></>}
    </section>
  );
}
