"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Paperclip, Plus } from "lucide-react";
import CampoEvidencia from "@/components/CampoEvidencia";
import { abrirEvidencia } from "@/lib/evidencia";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import { Cargando, ErrorCarga, SinAcceso, Vacio } from "@/components/Estados";
import { AreaTexto, Seleccion, Texto } from "@/components/Campos";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { api, mensajeDe } from "@/lib/api";
import { fechaCorta, fechaHora } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import { tonoPrioridad, tonoTicket } from "@/lib/tonos";
import type { Categoria, EquipoCliente, EvidenciaNueva, TicketCliente, TicketClienteDetalle, TicketRegistrado } from "@/lib/tipos";

const CATEGORIAS: Categoria[] = ["Hardware", "Software", "Impresión", "Red", "General"];

export default function Pagina() {
  return <Suspense fallback={<Cargando />}><Soporte /></Suspense>;
}

function Soporte() {
  const { puede } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const equipoInicial = params.get("equipo");
  const lista = useCarga(() => api<{ items: TicketCliente[] }>("/portal/tickets"), []);
  const equipos = useCarga(() => api<{ items: EquipoCliente[] }>("/portal/equipos"), []);
  const [nuevo, setNuevo] = useState(!!equipoInicial);
  const [abierto, setAbierto] = useState<string | null>(null);
  if (!puede("portal")) return <SinAcceso />;
  const items = lista.datos?.items ?? [];
  const cerrarNuevo = () => { setNuevo(false); if (equipoInicial) router.replace("/soporte"); };

  return (
    <>
      <PageHeader titulo="Soporte" descripcion="Reporta un problema con uno de tus equipos y sigue su atención.">
        <button type="button" className="btn" onClick={() => setNuevo(true)}><Plus size={16} aria-hidden="true" /> Reportar problema</button>
      </PageHeader>
      {lista.cargando && !lista.datos && <Cargando />}
      {lista.error && <ErrorCarga mensaje={lista.error} onReintentar={() => void lista.recargar()} />}
      {lista.datos && items.length === 0 && <Vacio>No tienes reportes. Si algo falla con un equipo, avísanos aquí.</Vacio>}
      {items.length > 0 && (
        <ul className="lista-tickets">
          {items.map((t) => (
            <li key={t.ticketId} className="tcard">
              <button type="button" className="row-link" onClick={() => setAbierto(t.ticketId)}>
                <span><b>{t.titulo}</b><small className="muted"> {t.ticketId} · {t.equipoNombre ?? "Sin equipo"} · {fechaCorta(t.creado)}</small></span>
              </button>
              <span><Badge tono={tonoTicket(t.estado)} dot>{t.estado}</Badge> <Badge tono={tonoPrioridad(t.prioridad)}>{t.prioridad}</Badge></span>
            </li>
          ))}
        </ul>
      )}
      {nuevo && <Nuevo equipos={equipos.datos?.items ?? []} equipoInicial={equipoInicial} onCerrar={cerrarNuevo} onCreado={async (id) => { cerrarNuevo(); await lista.recargar(); setAbierto(id); }} />}
      {abierto && <Detalle id={abierto} onCerrar={() => setAbierto(null)} onCambio={() => void lista.recargar()} />}
    </>
  );
}

function Nuevo({ equipos, equipoInicial, onCerrar, onCreado }: { equipos: EquipoCliente[]; equipoInicial: string | null; onCerrar: () => void; onCreado: (id: string) => Promise<void> }) {
  const aviso = useToast();
  const [equipoId, setEquipoId] = useState(equipoInicial ?? "");
  const [titulo, setTitulo] = useState(""); const [descripcion, setDescripcion] = useState(""); const [categoria, setCategoria] = useState<Categoria>("General");
  const [error, setError] = useState<string | null>(null); const [enviando, setEnviando] = useState(false);
  const [evidencia, setEvidencia] = useState<EvidenciaNueva | null>(null);
  const [registrado, setRegistrado] = useState<TicketRegistrado | null>(null);
  async function enviar(ev: FormEvent) {
    ev.preventDefault(); setError(null); setEnviando(true);
    try {
      const t = await api<TicketRegistrado>("/portal/tickets", { metodo: "POST", cuerpo: { equipoId, titulo, descripcion, categoria, evidencia: evidencia ?? undefined } });
      aviso("Reporte enviado."); setRegistrado(t);
    } catch (e) { setError(mensajeDe(e)); } finally { setEnviando(false); }
  }
  // CU-10, paso 5: resumen de lo que se registró y detectó
  if (registrado) {
    return (
      <Drawer titulo="Reporte registrado" subtitulo={registrado.ticketId} onCerrar={() => void onCreado(registrado.ticketId)}>
        <p className="sugerencia" role="status">Recibimos tu reporte. Un técnico revisará la prioridad y te avisaremos por correo cuando cambie su estado.</p>
        <dl className="facts">
          <div><dt>Equipo</dt><dd>{registrado.equipoNombre} ({registrado.equipoId})</dd></div>
          {registrado.sede && <div><dt>Sede</dt><dd>{registrado.sede}</dd></div>}
          <div><dt>Categoría</dt><dd>{registrado.categoria}</dd></div>
          <div><dt>Prioridad sugerida</dt><dd><Badge tono={tonoPrioridad(registrado.prioridad)}>{registrado.prioridad}</Badge></dd></div>
          <div><dt>Evidencia</dt><dd>{registrado.evidencia?.nombre ?? "Sin evidencia"}</dd></div>
        </dl>
        {registrado.avisos.map((a) => <p key={a} className="reserva-aviso">{a}</p>)}
        <div className="drawer-pie"><button type="button" className="btn" onClick={() => void onCreado(registrado.ticketId)}>Ver mi reporte</button></div>
      </Drawer>
    );
  }
  return (
    <Drawer titulo="Reportar un problema" onCerrar={onCerrar}>
      {equipos.length === 0 ? <p className="muted">Solo puedes reportar problemas de equipos que tienes alquilados.</p> : (
        <form className="formulario" onSubmit={(e) => void enviar(e)}>
          <Seleccion etiqueta="Equipo" requerido valor={equipoId} onCambio={setEquipoId} vacio="Elige un equipo" opciones={equipos.map((e) => ({ valor: e.equipoId, etiqueta: `${e.nombre} (${e.equipoId})` }))} />
          <Texto etiqueta="Resumen del problema" requerido valor={titulo} onCambio={setTitulo} maxLength={120} />
          <AreaTexto etiqueta="Cuéntanos qué pasa" requerido valor={descripcion} onCambio={setDescripcion} maxLength={1500} />
          <Seleccion etiqueta="Categoría" valor={categoria} onCambio={(v) => setCategoria(v as Categoria)} opciones={CATEGORIAS.map((c) => ({ valor: c, etiqueta: c }))} />
          <CampoEvidencia valor={evidencia} onCambio={setEvidencia} />
          <small className="muted">La prioridad la sugiere el sistema a partir de tu descripción (sin tus datos personales) y la confirma un técnico.</small>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="drawer-pie"><button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button><button type="submit" className="btn" disabled={enviando}>{enviando ? "Enviando…" : "Enviar reporte"}</button></div>
        </form>
      )}
    </Drawer>
  );
}

function Detalle({ id, onCerrar, onCambio }: { id: string; onCerrar: () => void; onCambio: () => void }) {
  const d = useCarga(() => api<TicketClienteDetalle>(`/portal/tickets/${id}`), [id]);
  const [texto, setTexto] = useState(""); const [error, setError] = useState<string | null>(null);
  async function comentar(ev: FormEvent) {
    ev.preventDefault(); setError(null);
    try { await api(`/portal/tickets/${id}/comentarios`, { metodo: "POST", cuerpo: { texto } }); setTexto(""); await d.recargar(); onCambio(); }
    catch (e) { setError(mensajeDe(e)); }
  }
  return (
    <Drawer titulo={d.datos?.titulo ?? `Reporte ${id}`} subtitulo={id} onCerrar={onCerrar}>
      {d.cargando && !d.datos && <Cargando />}
      {d.error && <ErrorCarga mensaje={d.error} />}
      {d.datos && (
        <>
          <p><Badge tono={tonoTicket(d.datos.estado)} dot>{d.datos.estado}</Badge> <Badge tono={tonoPrioridad(d.datos.prioridad)}>{d.datos.prioridad}</Badge> <small className="muted">{d.datos.equipoNombre ?? ""}</small></p>
          <p style={{ whiteSpace: "pre-line" }}>{d.datos.descripcion}</p>
          {d.datos.evidencia && (
            <p><button type="button" className="btn-texto enlace-evidencia" onClick={() => void abrirEvidencia(`/portal/tickets/${id}/evidencia`).catch((x) => setError(mensajeDe(x)))}>
              <Paperclip size={13} aria-hidden="true" /> {d.datos.evidencia.nombre}
            </button></p>
          )}
          <h3>Seguimiento</h3>
          <ul className="timeline">{d.datos.comentarios.map((c, i) => <li key={i}><time>{fechaHora(c.creadoEn)} · {c.autor}</time>{c.texto}</li>)}</ul>
          {d.datos.estado !== "Resuelto" && (
            <form className="formulario" onSubmit={(e) => void comentar(e)}>
              <AreaTexto etiqueta="Agregar un comentario" valor={texto} onCambio={setTexto} filas={3} maxLength={1000} />
              {error && <p className="error" role="alert">{error}</p>}
              <div className="drawer-pie"><button type="submit" className="btn btn-sm" disabled={!texto.trim()}>Comentar</button></div>
            </form>
          )}
        </>
      )}
    </Drawer>
  );
}
