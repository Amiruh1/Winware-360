"use client";

import { Suspense, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, CheckCircle2, Paperclip, Plus, Sparkles } from "lucide-react";
import CampoEvidencia from "@/components/CampoEvidencia";
import { DiagnosticoIA, RespuestaTicketIA } from "@/components/FuncionesIA";
import { abrirEvidencia } from "@/lib/evidencia";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import { Cargando, ErrorCarga, SinAcceso } from "@/components/Estados";
import { AreaTexto, Seleccion, Texto } from "@/components/Campos";
import { useToast } from "@/components/Toast";
import { useContadores } from "@/components/Contadores";
import { useAuth } from "@/lib/auth";
import { api, mensajeDe } from "@/lib/api";
import { fechaCorta, fechaHora } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import { tonoPrioridad } from "@/lib/tonos";
import type { Categoria, Equipo, EstadoTicket, EvidenciaNueva, Interpretacion, Prioridad, Ticket, TicketDetalle, Usuario } from "@/lib/tipos";

const COLUMNAS: { estado: EstadoTicket; titulo: string }[] = [
  { estado: "Abierto", titulo: "Abiertos" }, { estado: "En atención", titulo: "En atención" }, { estado: "Resuelto", titulo: "Resueltos" },
];
const CATEGORIAS: Categoria[] = ["Hardware", "Software", "Impresión", "Red", "General"];
const PRIORIDADES: Prioridad[] = ["Alta", "Media", "Baja"];
const EJEMPLOS = [
  "La impresora del segundo piso no imprime y sale una luz roja",
  "Mi laptop está muy lenta y se congela al abrir Excel",
  "No hay internet en la sala de reuniones",
];

export default function Pagina() {
  return <Suspense fallback={<Cargando />}><MesaDeAyuda /></Suspense>;
}

function MesaDeAyuda() {
  const { puede } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { refrescar } = useContadores();
  const abierto = params.get("ticket");
  const [nuevo, setNuevo] = useState(false);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [prio, setPrio] = useState<"" | Prioridad>("");
  const [soloMios, setSoloMios] = useState(false);
  const { me } = useAuth();
  const lista = useCarga(() => api<{ items: Ticket[] }>("/tickets"), []);
  const equipos = useCarga(() => api<{ items: Equipo[] }>("/equipos"), []);

  const filtrados = useMemo(() => (lista.datos?.items ?? []).filter((t) =>
    (!prio || t.prioridad === prio) && (!soloMios || t.asignadoA === me?.correo)), [lista.datos, prio, soloMios, me]);

  if (!puede("tickets")) return <SinAcceso />;

  const alCambiar = async () => { await Promise.all([lista.recargar(), refrescar()]); };
  const ver = (id: string) => router.replace(`/mesa-de-ayuda?ticket=${id}`);

  return (
    <>
      <PageHeader titulo="Mesa de ayuda" descripcion="Reporta un problema con tus propias palabras: la IA lo clasifica y tú confirmas.">
        {puede("tickets", "escribir") && <button type="button" className="btn" onClick={() => setNuevo(true)}><Plus size={16} aria-hidden="true" /> Nuevo ticket</button>}
      </PageHeader>

      <div className="toolbar">
        <select value={prio} onChange={(e) => setPrio(e.target.value as typeof prio)} aria-label="Filtrar por prioridad">
          <option value="">Todas las prioridades</option>
          {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={soloMios} onChange={(e) => setSoloMios(e.target.checked)} /> Solo los asignados a mí</label>
      </div>

      {lista.cargando && !lista.datos && <Cargando />}
      {lista.error && <ErrorCarga mensaje={lista.error} onReintentar={() => void lista.recargar()} />}
      {lista.datos && (
        <div className="board" style={{ marginTop: 8 }}>
          {COLUMNAS.map(({ estado, titulo }) => {
            // CU-13: ordenado por prioridad (Alta primero) y luego por fecha
            const items = filtrados.filter((t) => t.estado === estado)
              .sort((a, b) => PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad) || (b.creadoEn ?? b.creado).localeCompare(a.creadoEn ?? a.creado));
            return (
              <section key={estado} className="column" aria-label={titulo}>
                <header><h2>{titulo} <b>{items.length}</b></h2></header>
                {items.length === 0 ? <p className="column-empty">Sin tickets</p> : (
                  <ul>
                    {items.map((t) => (
                      <li key={t.ticketId}>
                        <button type="button" className={`tcard${t.ticketId === ultimo ? " tcard-new" : ""}`} onClick={() => ver(t.ticketId)}>
                          <span className="tcard-top"><small className="ticket-ref">{t.ticketId}</small><Badge tono={tonoPrioridad(t.prioridad)}>{t.prioridad}</Badge></span>
                          <strong>{t.titulo}</strong>
                          <span className="tcard-meta">
                            <span>{t.categoria}</span>
                            {t.equipoNombre && <span>{t.equipoNombre}</span>}
                            <span>{fechaCorta(t.creado)}</span>
                            {t.origen === "IA" && <span title="Clasificado con ayuda de la IA"><Sparkles size={12} aria-hidden="true" /> IA</span>}
                            {t.estado !== "Resuelto" && t.prioridadConfirmada === false && <span className="por-confirmar">Prioridad por confirmar</span>}
                            {t.evidencia && <span title="Tiene evidencia adjunta"><Paperclip size={12} aria-hidden="true" /></span>}
                            {t.origen === "Prueba" && <span>Prueba</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {abierto && <FichaTicket id={abierto} onCerrar={() => router.replace("/mesa-de-ayuda")} onCambio={alCambiar} />}
      {nuevo && <NuevoTicket equipos={equipos.datos?.items ?? []} onCerrar={() => setNuevo(false)}
        onCreado={async (id) => { setNuevo(false); setUltimo(id); await alCambiar(); }} />}
    </>
  );
}

function NuevoTicket({ equipos, onCerrar, onCreado }: { equipos: Equipo[]; onCerrar: () => void; onCreado: (id: string) => Promise<void> }) {
  const aviso = useToast();
  const { puede } = useAuth();
  // quien gestiona tickets confirma la prioridad al registrar; el resto deja que el sistema la sugiera (CU-11/12)
  const confirma = puede("gestionTickets", "escribir");
  const [evidencia, setEvidencia] = useState<EvidenciaNueva | null>(null);
  const [esPrueba, setEsPrueba] = useState(false);
  const [texto, setTexto] = useState("");
  const [equipoPista, setEquipoPista] = useState("");
  const [sug, setSug] = useState<Interpretacion | null>(null);
  const [f, setF] = useState({ titulo: "", categoria: "General" as Categoria, prioridad: "Media" as Prioridad, equipoId: "" });
  const [pensando, setPensando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [descripcion, setDescripcion] = useState("");

  async function interpretar(ev: FormEvent) {
    ev.preventDefault();
    setError(null); setPensando(true);
    try {
      const r = await api<Interpretacion>("/tickets/interpretar", { metodo: "POST", cuerpo: { texto, equipoId: equipoPista || undefined } });
      setSug(r);
      setF({ titulo: r.titulo, categoria: r.categoria, prioridad: r.prioridad, equipoId: r.equipoId ?? "" });
    } catch (x) { setError(mensajeDe(x)); } finally { setPensando(false); }
  }

  async function crear(ev: FormEvent) {
    ev.preventDefault();
    setError(null); setEnviando(true);
    try {
      const cuerpo = {
        titulo: f.titulo, descripcion: sug ? texto : descripcion, categoria: f.categoria, prioridad: confirma ? f.prioridad : undefined,
        equipoId: f.equipoId || undefined, solicitudId: sug?.solicitudId, evidencia: evidencia ?? undefined, esPrueba: esPrueba || undefined,
      };
      const t = await api<Ticket & { avisos?: string[] }>("/tickets", { metodo: "POST", cuerpo });
      aviso(`Ticket ${t.ticketId} creado con prioridad ${t.prioridad.toLowerCase()}${t.prioridadConfirmada ? "" : " (sugerida, por confirmar)"}.`);
      for (const a of t.avisos ?? []) aviso(a, "error");
      await onCreado(t.ticketId);
    } catch (x) { setError(mensajeDe(x)); } finally { setEnviando(false); }
  }

  const opcionesEquipo = equipos.map((e) => ({ valor: e.equipoId, etiqueta: `${e.nombre} (${e.equipoId})` }));
  const paso2 = sug || manual;

  return (
    <Drawer titulo="Nuevo ticket" subtitulo={paso2 ? "Revisa los datos y confirma" : "Cuéntanos qué pasó"} onCerrar={onCerrar} ancho={560}>
      {!paso2 && (
        <form className="formulario" onSubmit={(e) => void interpretar(e)}>
          <AreaTexto etiqueta="¿Qué problema tienes?" requerido valor={texto} onCambio={setTexto} filas={5} maxLength={1500}
            ayuda="Escribe como se lo contarías a un compañero. Si sabes cuál equipo es, menciónalo." placeholder="Ej.: La impresora del segundo piso no imprime…" />
          <div className="chips" aria-label="Ejemplos">
            {EJEMPLOS.map((x) => <button key={x} type="button" className="chip" onClick={() => setTexto(x)}>{x}</button>)}
          </div>
          <Seleccion etiqueta="Equipo afectado (opcional)" valor={equipoPista} onCambio={setEquipoPista} vacio="Que la IA lo deduzca" opciones={opcionesEquipo} />
          {error && <p className="error" role="alert">{error}</p>}
          <div className="drawer-pie">
            <button type="button" className="btn-texto" onClick={() => { setManual(true); setDescripcion(texto); }}>Prefiero llenarlo yo</button>
            <button type="submit" className="btn" disabled={pensando || texto.trim().length < 5}><Bot size={16} aria-hidden="true" /> {pensando ? "Analizando…" : "Analizar con IA"}</button>
          </div>
        </form>
      )}

      {paso2 && (
        <form className="formulario" onSubmit={(e) => void crear(e)}>
          {sug && (
            <div className="sugerencia" role="status">
              <strong><Sparkles size={14} aria-hidden="true" /> Sugerencia {sug.metodo === "bedrock" ? "de la IA" : "automática"}</strong>
              <span>{sug.resumen}</span>
              {sug.aviso && <small>{sug.aviso}</small>}
              <small>Puedes corregir cualquier dato antes de crear el ticket.</small>
            </div>
          )}
          <Texto etiqueta="Título" requerido valor={f.titulo} onCambio={(v) => setF((p) => ({ ...p, titulo: v }))} maxLength={120} />
          {!sug && <AreaTexto etiqueta="Descripción" requerido valor={descripcion} onCambio={setDescripcion} filas={4} maxLength={1500} />}
          <div className="fila-campos">
            <Seleccion etiqueta="Categoría" valor={f.categoria} onCambio={(v) => setF((p) => ({ ...p, categoria: v as Categoria }))} opciones={CATEGORIAS.map((c) => ({ valor: c, etiqueta: c }))} />
            {confirma
              ? <Seleccion etiqueta="Prioridad (la confirmas tú)" valor={f.prioridad} onCambio={(v) => setF((p) => ({ ...p, prioridad: v as Prioridad }))} opciones={PRIORIDADES.map((c) => ({ valor: c, etiqueta: c }))} />
              : <p className="muted campo-nota">La prioridad la sugiere el sistema y la confirma un técnico.</p>}
          </div>
          <Seleccion etiqueta="Equipo" valor={f.equipoId} onCambio={(v) => setF((p) => ({ ...p, equipoId: v }))} vacio="Ninguno / no aplica" opciones={opcionesEquipo} />
          <CampoEvidencia valor={evidencia} onCambio={setEvidencia} />
          <label className="check"><input type="checkbox" checked={esPrueba} onChange={(e) => setEsPrueba(e.target.checked)} /> Es un ticket de prueba (no cuenta en los indicadores)</label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="drawer-pie">
            <button type="button" className="btn btn-secundario" onClick={() => { setSug(null); setManual(false); }}>Volver</button>
            <button type="submit" className="btn" disabled={enviando}>{enviando ? "Creando…" : "Crear ticket"}</button>
          </div>
        </form>
      )}
    </Drawer>
  );
}

function FichaTicket({ id, onCerrar, onCambio }: { id: string; onCerrar: () => void; onCambio: () => Promise<void> }) {
  const { puede, me } = useAuth();
  const aviso = useToast();
  const det = useCarga(() => api<TicketDetalle>(`/tickets/${id}`), [id]);
  const tecnicos = useCarga(() => api<{ items: Usuario[] }>("/usuarios").catch(() => ({ items: [] as Usuario[] })), []);
  const [comentario, setComentario] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const t = det.datos;
  const gestiona = puede("gestionTickets", "escribir");

  async function cambiar(cuerpo: Record<string, unknown>, ok: string) {
    setOcupado(true);
    try {
      await api(`/tickets/${id}`, { metodo: "PATCH", cuerpo });
      aviso(ok);
      await Promise.all([det.recargar(), onCambio()]);
    } catch (x) { aviso(mensajeDe(x), "error"); } finally { setOcupado(false); }
  }

  async function comentar(ev: FormEvent) {
    ev.preventDefault();
    setOcupado(true);
    try {
      await api(`/tickets/${id}/comentarios`, { metodo: "POST", cuerpo: { texto: comentario } });
      setComentario("");
      await det.recargar();
    } catch (x) { aviso(mensajeDe(x), "error"); } finally { setOcupado(false); }
  }

  const asignables = (tecnicos.datos?.items ?? []).filter((u) => u.estado === "Activo" && (u.rol === "Tecnico" || u.rol === "Administrador"));
  const siguiente: Record<EstadoTicket, { a: EstadoTicket; texto: string } | null> = {
    Abierto: { a: "En atención", texto: "Tomar / en atención" }, "En atención": { a: "Resuelto", texto: "Marcar como resuelto" }, Resuelto: null,
  };

  return (
    <Drawer titulo={t?.titulo ?? "Ticket"} subtitulo={id} onCerrar={onCerrar} ancho={580}>
      {det.cargando && !t && <Cargando />}
      {det.error && !t && <ErrorCarga mensaje={det.error} onReintentar={() => void det.recargar()} />}
      {t && (
        <div className="stack">
          <div className="etiquetas">
            <Badge tono={tonoPrioridad(t.prioridad)}>Prioridad {t.prioridad.toLowerCase()}</Badge>
            <Badge tono={t.estado === "Resuelto" ? "ok" : t.estado === "En atención" ? "info" : "warn"} dot>{t.estado}</Badge>
            <Badge>{t.categoria}</Badge>
            {t.origen === "IA" && <Badge tono="info">Con ayuda de IA</Badge>}
            {t.origen === "Prueba" && <Badge>Ticket de prueba</Badge>}
          </div>
          <p>{t.descripcion}</p>
          <dl className="facts">
            <div><dt>Equipo</dt><dd>{t.equipo ? `${t.equipo.nombre} (${t.equipo.equipoId})` : "—"}</dd></div>
            {t.sede && <div><dt>Sede</dt><dd>{t.sede}</dd></div>}
            <div><dt>Creado por</dt><dd>{t.creadoPor}</dd></div>
            <div><dt>Creado</dt><dd>{fechaHora(t.creadoEn ?? t.creado)}</dd></div>
            <div><dt>Asignado a</dt><dd>{t.asignadoA ?? "Sin asignar"}</dd></div>
            {t.resueltoEn && <div><dt>Resuelto</dt><dd>{fechaHora(t.resueltoEn)}</dd></div>}
            {t.evidencia && (
              <div><dt>Evidencia</dt><dd>
                <button type="button" className="btn-texto enlace-evidencia" onClick={() => void abrirEvidencia(`/tickets/${id}/evidencia`).catch((x) => aviso(mensajeDe(x), "error"))}>
                  <Paperclip size={13} aria-hidden="true" /> {t.evidencia.nombre}
                </button>
              </dd></div>
            )}
          </dl>

          {/* CU-11/12: la prioridad sugerida la confirma o corrige una persona antes de atender */}
          {t.prioridadSugerida && (
            <div className={`prioridad-sugerida${t.prioridadConfirmada ? " confirmada" : ""}`}>
              <p>
                <b>Prioridad sugerida: {t.prioridadSugerida}</b> ({t.origenPrioridad === "bedrock" ? "IA" : "reglas por palabras clave"})
                {t.motivoPrioridad && <span> · {t.motivoPrioridad}</span>}
              </p>
              {t.prioridadConfirmada
                ? <small><CheckCircle2 size={13} aria-hidden="true" /> Prioridad final {t.prioridad.toLowerCase()}, confirmada por {t.confirmadaPor ?? "el equipo"}.</small>
                : <small>Falta que un técnico la confirme. Hasta entonces no se puede asignar ni atender.</small>}
            </div>
          )}

          {gestiona && t.estado !== "Resuelto" && (
            <div className="barra-acciones">
              {!t.prioridadConfirmada && (
                <button type="button" className="btn btn-sm" disabled={ocupado} onClick={() => void cambiar({ confirmarPrioridad: true }, `Prioridad ${t.prioridad.toLowerCase()} confirmada.`)}>Confirmar prioridad {t.prioridad.toLowerCase()}</button>
              )}
              <select value={t.prioridad} disabled={ocupado} aria-label={t.prioridadConfirmada ? "Cambiar prioridad" : "Confirmar con otra prioridad"} onChange={(e) => void cambiar({ prioridad: e.target.value }, "Prioridad confirmada.")}>
                {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
              </select>
              {siguiente[t.estado] && (
                <button type="button" className="btn btn-sm" disabled={ocupado || !t.prioridadConfirmada} title={t.prioridadConfirmada ? undefined : "Confirma la prioridad primero"}
                  onClick={() => void cambiar({ estado: siguiente[t.estado]!.a }, `Ticket: ${siguiente[t.estado]!.a.toLowerCase()}.`)}>{siguiente[t.estado]!.texto}</button>
              )}
              {asignables.length > 0
                ? <select value={t.asignadoA ?? ""} disabled={ocupado || !t.prioridadConfirmada} aria-label="Asignar a" onChange={(e) => { if (e.target.value) void cambiar({ asignadoA: e.target.value }, "Ticket asignado."); }}>
                    <option value="">Asignar a…</option>
                    {asignables.map((u) => <option key={u.correo} value={u.correo}>{u.nombre}</option>)}
                  </select>
                : t.asignadoA !== me?.correo && <button type="button" className="btn btn-secundario btn-sm" disabled={ocupado || !t.prioridadConfirmada} onClick={() => void cambiar({ asignadoA: me!.correo }, "Ticket asignado a ti.")}>Asignármelo</button>}
            </div>
          )}
          {t.estado === "Resuelto" && <p className="muted">Ticket cerrado. Si el problema vuelve, registra un ticket nuevo.</p>}
          {gestiona && t.estado !== "Resuelto" && <DiagnosticoIA key={`dx-${id}`} ticketId={id} />}

          <section aria-labelledby="h-hist">
            <h3 id="h-hist">Historial</h3>
            {t.comentarios.length === 0 && <p className="muted">Sin actividad todavía.</p>}
            <ol className="timeline">
              {t.comentarios.map((c) => (
                <li key={`${c.creadoEn}-${c.autor}`} className={c.tipo === "Aviso" || c.tipo === "AvisoFallido" ? `hist-aviso${c.tipo === "AvisoFallido" ? " hist-fallido" : ""}` : undefined}>
                  <time dateTime={c.creadoEn}>{fechaHora(c.creadoEn)}</time>
                  <span className="autor">{c.autor === "sistema" ? "Sistema" : c.autor}</span>
                  <p>{c.texto}</p>
                </li>
              ))}
            </ol>
          </section>

          {puede("tickets", "escribir") && (
            <form className="formulario" onSubmit={(e) => void comentar(e)}>
              <RespuestaTicketIA key={`resp-${id}`} ticketId={id} onBorrador={(x) => setComentario(x.slice(0, 1000))} />
              <AreaTexto etiqueta="Agregar comentario" valor={comentario} onCambio={setComentario} filas={comentario.length > 200 ? 7 : 3} maxLength={1000} />
              <div className="drawer-pie"><button type="submit" className="btn btn-sm" disabled={ocupado || !comentario.trim()}>Comentar</button></div>
            </form>
          )}
        </div>
      )}
    </Drawer>
  );
}
