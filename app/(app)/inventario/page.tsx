"use client";

import { Suspense, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Trash2, Wrench } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import { Cargando, ErrorCarga, SinAcceso, Vacio } from "@/components/Estados";
import { AreaTexto, Seleccion, Texto } from "@/components/Campos";
import EquipoImagen from "@/components/EquipoImagen";
import { useToast } from "@/components/Toast";
import { useContadores } from "@/components/Contadores";
import { useAuth } from "@/lib/auth";
import { api, mensajeDe } from "@/lib/api";
import { fechaCorta, fechaHora, hoyISO, pen, plural } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import { garantia, tonoEquipo, tonoPrioridad, tonoTicket } from "@/lib/tonos";
import type { Contrato, Equipo, EquipoDetalle, EstadoEquipo, Mantenimiento, TipoEquipo, Usuario } from "@/lib/tipos";

const ESTADOS: EstadoEquipo[] = ["Disponible", "Alquilado", "En mantenimiento", "Reservado"];
/** Estados que se pueden poner a mano; "Reservado" lo pone el portal. */
const ESTADOS_MANUALES: EstadoEquipo[] = ["Disponible", "Alquilado", "En mantenimiento"];
const CAMPO: Record<string, string> = {
  estado: "Estado", contratoId: "Contrato", sede: "Sede", serie: "Serie", nombre: "Nombre", tarifaMensual: "Tarifa", garantiaHasta: "Garantía hasta",
  marca: "Marca", modelo: "Modelo", condicion: "Condición", tipo: "Tipo", imagenUrl: "Foto",
};
const valorCampo = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const TIPOS: TipoEquipo[] = ["Laptop", "Impresora", "Monitor", "Servidor", "Red"];
const quitarTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Pagina() {
  return <Suspense fallback={<Cargando />}><Inventario /></Suspense>;
}

function Inventario() {
  const { puede } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { refrescar } = useContadores();
  const abierto = params.get("equipo");
  const [estado, setEstado] = useState<"" | EstadoEquipo>("");
  const [tipo, setTipo] = useState<"" | TipoEquipo>("");
  const [sede, setSede] = useState("");
  const [texto, setTexto] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const lista = useCarga(() => api<{ items: Equipo[] }>("/equipos"), []);
  const escribe = puede("equipos", "escribir");
  const sedes = useMemo(() => [...new Set((lista.datos?.items ?? []).map((e) => e.sede).filter((s): s is string => !!s))].sort(), [lista.datos]);

  const filtrados = useMemo(() => {
    const q = quitarTildes(texto.trim());
    return (lista.datos?.items ?? []).filter((e) =>
      (!estado || e.estado === estado) && (!tipo || e.tipo === tipo) && (!sede || e.sede === sede) &&
      (!q || quitarTildes(`${e.nombre} ${e.serie} ${e.equipoId} ${e.contratoId ?? ""} ${e.sede ?? ""}`).includes(q)));
  }, [lista.datos, estado, tipo, sede, texto]);

  if (!puede("equipos")) return <SinAcceso />;

  const cerrar = () => router.replace("/inventario");
  const alCambiar = async () => { await Promise.all([lista.recargar(), refrescar()]); };

  return (
    <>
      <PageHeader titulo="Inventario" descripcion="Todos los equipos de Winware, su estado y a qué contrato pertenecen.">
        {escribe && <button type="button" className="btn" onClick={() => setNuevo(true)}><Plus size={16} aria-hidden="true" /> Nuevo equipo</button>}
      </PageHeader>

      <div className="toolbar">
        <label className="search"><Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Buscar por nombre, serie o contrato" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar equipos" />
        </label>
        <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {ESTADOS.map((x) => <option key={x}>{x}</option>)}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          {TIPOS.map((x) => <option key={x}>{x}</option>)}
        </select>
        {sedes.length > 0 && (
          <select value={sede} onChange={(e) => setSede(e.target.value)} aria-label="Filtrar por sede">
            <option value="">Todas las sedes</option>
            {sedes.map((x) => <option key={x}>{x}</option>)}
          </select>
        )}
      </div>

      {lista.cargando && !lista.datos && <Cargando />}
      {lista.error && <ErrorCarga mensaje={lista.error} onReintentar={() => void lista.recargar()} />}
      {lista.datos && (
        filtrados.length === 0 ? <Vacio>No hay equipos que coincidan con la búsqueda.</Vacio> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Equipo</th><th>Serie</th><th>Estado</th><th>Contrato</th><th className="num">Tarifa mensual</th><th>Garantía</th></tr></thead>
              <tbody>
                {filtrados.map((e) => {
                  const g = garantia(e.garantiaHasta);
                  return (
                    <tr key={e.equipoId} className="fila-click" tabIndex={0} onClick={() => router.replace(`/inventario?equipo=${e.equipoId}`)}
                      onKeyDown={(ev) => { if (ev.key === "Enter") router.replace(`/inventario?equipo=${e.equipoId}`); }}>
                      <td><div className="detail-head"><EquipoImagen tipo={e.tipo} nombre={e.nombre} url={e.imagenUrl} variante="mini" /><div><strong>{e.nombre}</strong><small className="muted" style={{ display: "block" }}>{e.equipoId} · {e.tipo}{e.sede ? ` · ${e.sede}` : ""}</small></div></div></td>
                      <td>{e.serie}</td>
                      <td><Badge tono={tonoEquipo(e.estado)} dot>{e.estado}</Badge>{(e.incidenciasAbiertas ?? 0) > 0 && <span className="inline-note"><Badge tono="danger">{plural(e.incidenciasAbiertas!, "incidencia", "incidencias")}</Badge></span>}</td>
                      <td>{e.contratoId ?? <span className="muted">—</span>}</td>
                      <td className="num">{pen(e.tarifaMensual)}</td>
                      <td>{g ? <Badge tono={g.tono}>{g.texto}</Badge> : fechaCorta(e.garantiaHasta)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
      <p className="muted" style={{ marginTop: 10 }}>{lista.datos ? `${plural(filtrados.length, "equipo", "equipos")} de ${lista.datos.items.length}` : ""}</p>

      {abierto && <FichaEquipo id={abierto} onCerrar={cerrar} onCambio={alCambiar} />}
      {nuevo && <FormEquipo onCerrar={() => setNuevo(false)} onGuardado={async () => { setNuevo(false); await alCambiar(); }} />}
    </>
  );
}

function FichaEquipo({ id, onCerrar, onCambio }: { id: string; onCerrar: () => void; onCambio: () => Promise<void> }) {
  const { puede } = useAuth();
  const aviso = useToast();
  const det = useCarga(() => api<EquipoDetalle>(`/equipos/${id}`), [id]);
  const [editando, setEditando] = useState(false);
  const [mant, setMant] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const e = det.datos;
  const escribe = puede("equipos", "escribir");
  const escribeMant = puede("mantenimientos", "escribir");

  const recargar = async () => { await Promise.all([det.recargar(), onCambio()]); };

  // CU-08: el servidor rechaza eliminar un equipo alquilado, reservado o con tickets abiertos
  async function eliminar() {
    setOcupado(true);
    try {
      await api(`/equipos/${id}`, { metodo: "DELETE" });
      aviso(`Equipo ${id} eliminado.`);
      await onCambio();
      onCerrar();
    } catch (x) { aviso(mensajeDe(x), "error"); setConfirmarEliminar(false); } finally { setOcupado(false); }
  }

  async function cambiarEstadoMant(m: Mantenimiento, estadoNuevo: Mantenimiento["estado"]) {
    try {
      await api(`/equipos/${id}/mantenimientos/${m.mantenimientoId}`, { metodo: "PATCH", cuerpo: { estado: estadoNuevo } });
      aviso("Mantenimiento actualizado.");
      await recargar();
    } catch (x) { aviso(mensajeDe(x), "error"); }
  }

  return (
    <Drawer titulo={e?.nombre ?? "Equipo"} subtitulo={e ? `${e.equipoId} · ${e.tipo}` : id} onCerrar={onCerrar} ancho={560}>
      {det.cargando && !e && <Cargando />}
      {det.error && !e && <ErrorCarga mensaje={det.error} onReintentar={() => void det.recargar()} />}
      {e && !editando && (
        <div className="stack">
          <div className="detail-state">
            <Badge tono={tonoEquipo(e.estado)} dot>{e.estado}</Badge>
            {e.incidenciasAbiertas > 0 && <span className="inline-note"><Badge tono="danger">{plural(e.incidenciasAbiertas, "incidencia abierta", "incidencias abiertas")}</Badge></span>}
          </div>
          <dl className="facts">
            <div><dt>Serie</dt><dd>{e.serie}</dd></div>
            <div><dt>Contrato</dt><dd>{e.contrato ? `${e.contrato.nombre} (${e.contrato.contratoId})` : "Sin contrato"}</dd></div>
            <div><dt>Tarifa mensual</dt><dd>{pen(e.tarifaMensual)}</dd></div>
            <div><dt>Garantía hasta</dt><dd>{fechaCorta(e.garantiaHasta)}</dd></div>
            <div><dt>Marca / modelo</dt><dd>{[e.marca, e.modelo].filter(Boolean).join(" ") || "—"}</dd></div>
            <div><dt>Condición</dt><dd>{e.condicion ?? "—"}</dd></div>
            <div><dt>Garantía al cliente</dt><dd>{e.garantiaMeses ?? 12} meses</dd></div>
            <div><dt>Sede</dt><dd>{e.sede ?? "—"}</dd></div>
            {e.estado === "Reservado" && e.reservaVence && <div><dt>Reservado hasta</dt><dd>{fechaHora(e.reservaVence)} (pedido del portal)</dd></div>}
          </dl>
          {escribe && (
            <div className="barra-acciones">
              <button type="button" className="btn btn-secundario btn-sm" onClick={() => setEditando(true)}>Editar equipo</button>
              {e.estado !== "Alquilado" && e.estado !== "Reservado"
                ? <button type="button" className="btn btn-peligro btn-sm" onClick={() => setConfirmarEliminar(true)}><Trash2 size={14} aria-hidden="true" /> Eliminar</button>
                : <small className="muted">Un equipo alquilado o reservado no se puede eliminar.</small>}
            </div>
          )}
          {confirmarEliminar && (
            <div className="baja-equipo" role="alertdialog" aria-labelledby="h-eliminar">
              <p id="h-eliminar"><b>¿Eliminar {e.nombre} ({e.equipoId})?</b></p>
              <p className="muted">Se borrarán el equipo y sus mantenimientos. Esta acción no se puede deshacer. Los tickets resueltos se conservan.</p>
              <div className="drawer-pie">
                <button type="button" className="btn btn-secundario btn-sm" disabled={ocupado} onClick={() => setConfirmarEliminar(false)}>Cancelar</button>
                <button type="button" className="btn btn-peligro btn-sm" disabled={ocupado} onClick={() => void eliminar()}>{ocupado ? "Eliminando…" : "Sí, eliminar"}</button>
              </div>
            </div>
          )}

          <section aria-labelledby="h-mant">
            <div className="panel-cabecera"><h3 id="h-mant">Mantenimientos</h3>
              {escribeMant && <button type="button" className="btn btn-secundario btn-sm" onClick={() => setMant(true)}><Wrench size={14} aria-hidden="true" /> Registrar</button>}
            </div>
            {e.mantenimientos.length === 0 && <p className="muted">Sin mantenimientos registrados.</p>}
            <ul className="lista-hist">
              {e.mantenimientos.map((m) => (
                <li key={m.mantenimientoId}>
                  <div>
                    <strong>{m.tipo}</strong> · {fechaCorta(m.fecha)}
                    <p>{m.detalle}</p>
                    <small className="muted">{m.tecnico}</small>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Badge tono={m.estado === "Completado" ? "ok" : m.estado === "En curso" ? "info" : "warn"}>{m.estado}</Badge>
                    {escribeMant && m.estado !== "Completado" && (
                      <div><button type="button" className="btn-texto" onClick={() => void cambiarEstadoMant(m, m.estado === "Programado" ? "En curso" : "Completado")}>
                        {m.estado === "Programado" ? "Iniciar" : "Completar"}</button></div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="h-tk">
            <h3 id="h-tk">Tickets del equipo</h3>
            {e.tickets.length === 0 && <p className="muted">Este equipo no tiene tickets.</p>}
            <ul className="lista-hist">
              {e.tickets.map((t) => (
                <li key={t.ticketId}>
                  <div><strong>{t.titulo}</strong><small className="muted" style={{ display: "block" }}>{t.ticketId} · {fechaCorta(t.creado)}</small></div>
                  <span className="etiquetas"><Badge tono={tonoPrioridad(t.prioridad)}>{t.prioridad}</Badge><Badge tono={tonoTicket(t.estado)}>{t.estado}</Badge></span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="h-cambios">
            <h3 id="h-cambios">Historial de cambios</h3>
            {!e.historial?.length && <p className="muted">Sin cambios registrados todavía.</p>}
            <ol className="timeline">
              {[...(e.historial ?? [])].reverse().map((h, i) => (
                <li key={`${h.fecha}-${i}`}>
                  <time dateTime={h.fecha}>{fechaHora(h.fecha)}</time>
                  <span className="autor">{h.usuario === "sistema" ? "Sistema" : h.usuario} · {h.accion}</span>
                  <p>{Object.entries(h.cambios).filter(([k]) => CAMPO[k]).map(([k, c]) => `${CAMPO[k]}: ${valorCampo(c.antes)} → ${valorCampo(c.despues)}`).join(" · ") || "Sin cambios de datos."}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
      {e && editando && <FormEquipo equipo={e} onCerrar={() => setEditando(false)} onGuardado={async () => { setEditando(false); await recargar(); }} embebido />}
      {e && mant && <FormMantenimiento equipoId={e.equipoId} onCerrar={() => setMant(false)} onGuardado={async () => { setMant(false); await recargar(); }} />}
    </Drawer>
  );
}

function FormEquipo({ equipo, onCerrar, onGuardado, embebido = false }: { equipo?: Equipo; onCerrar: () => void; onGuardado: () => Promise<void>; embebido?: boolean }) {
  const aviso = useToast();
  const { puede } = useAuth();
  const veContratos = puede("contratos");
  const contratos = useCarga(() => (veContratos ? api<{ items: Contrato[] }>("/contratos") : Promise.resolve({ items: [] as Contrato[] })), [veContratos]);
  const [f, setF] = useState({
    nombre: equipo?.nombre ?? "", tipo: (equipo?.tipo ?? "Laptop") as string, serie: equipo?.serie ?? "", estado: (equipo?.estado ?? "Disponible") as string,
    contratoId: equipo?.contratoId ?? "", garantiaHasta: equipo?.garantiaHasta ?? "", tarifaMensual: String(equipo?.tarifaMensual ?? ""),
    marca: equipo?.marca ?? "", modelo: equipo?.modelo ?? "", condicion: equipo?.condicion ?? "", garantiaMeses: String(equipo?.garantiaMeses ?? 12),
    descripcion: equipo?.descripcion ?? "", caracteristicas: equipo?.caracteristicas ?? "", imagenUrl: equipo?.imagenUrl ?? "",
    sede: equipo?.sede ?? "", equipoId: "",
  });
  const reservado = equipo?.estado === "Reservado";
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null); setEnviando(true);
    const { equipoId, ...resto } = f;
    const cuerpo = { ...resto, contratoId: f.contratoId || undefined, tarifaMensual: Number(f.tarifaMensual), garantiaMeses: Number(f.garantiaMeses), sede: f.sede || undefined };
    try {
      if (equipo) await api(`/equipos/${equipo.equipoId}`, { metodo: "PATCH", cuerpo: { ...cuerpo, contratoId: f.contratoId || null, ...(reservado ? { estado: undefined, contratoId: undefined } : {}) } });
      else await api("/equipos", { metodo: "POST", cuerpo: { ...cuerpo, equipoId: equipoId.trim().toUpperCase() || undefined } });
      aviso(equipo ? "Equipo actualizado." : "Equipo creado.");
      await onGuardado();
    } catch (x) { setError(mensajeDe(x)); } finally { setEnviando(false); }
  }

  const form = (
    <form className="formulario" onSubmit={(e) => void enviar(e)}>
      <Texto etiqueta="Nombre" requerido valor={f.nombre} onCambio={set("nombre")} maxLength={120} />
      <div className="fila-campos">
        <Seleccion etiqueta="Tipo" requerido valor={f.tipo} onCambio={set("tipo")} opciones={TIPOS.map((t) => ({ valor: t, etiqueta: t }))} />
        <Texto etiqueta="Serie" requerido valor={f.serie} onCambio={set("serie")} maxLength={60} />
      </div>
      {!equipo && (
        <div className="fila-campos">
          <Texto etiqueta="Código (opcional)" valor={f.equipoId} onCambio={set("equipoId")} maxLength={7} placeholder="EQ-0000" ayuda="Si lo dejas vacío se asigna el siguiente. Debe ser único." />
          <Texto etiqueta="Sede" valor={f.sede} onCambio={set("sede")} maxLength={60} placeholder="Ej.: Lima - San Isidro" />
        </div>
      )}
      {reservado
        ? <p className="reserva-aviso">Este equipo está reservado por un pedido del portal: su estado y contrato no se pueden cambiar hasta que se pague o venza la reserva.</p>
        : (
          <div className="fila-campos">
            <Seleccion etiqueta="Estado" valor={f.estado} onCambio={set("estado")} opciones={ESTADOS_MANUALES.map((t) => ({ valor: t, etiqueta: t }))} />
            {veContratos
              ? <Seleccion etiqueta="Contrato" ayuda="Solo aplica a equipos alquilados." valor={f.contratoId} onCambio={set("contratoId")} vacio="Sin contrato"
                  opciones={(contratos.datos?.items ?? []).filter((c) => c.estado === "Vigente" || c.contratoId === equipo?.contratoId).map((c) => ({ valor: c.contratoId, etiqueta: `${c.contratoId} · ${c.nombre}` }))} />
              // quien no ve la lista de contratos (técnico) escribe el código; el servidor valida que exista y esté vigente
              : <Texto etiqueta="Contrato (código)" ayuda="Solo para equipos alquilados. Ej.: CT-2026-001" valor={f.contratoId} onCambio={(v) => set("contratoId")(v.toUpperCase())} maxLength={20} placeholder="CT-2026-001" />}
          </div>
        )}
      {equipo && <Texto etiqueta="Sede" valor={f.sede} onCambio={set("sede")} maxLength={60} placeholder="Ej.: Lima - San Isidro" />}
      <div className="fila-campos">
        <Texto etiqueta="Garantía hasta" tipo="date" requerido valor={f.garantiaHasta} onCambio={set("garantiaHasta")} />
        <Texto etiqueta="Tarifa mensual (S/)" tipo="number" requerido valor={f.tarifaMensual} onCambio={set("tarifaMensual")} min={0} />
      </div>
      <h3 style={{ marginTop: 6 }}>Ficha para clientes</h3>
      <div className="fila-campos">
        <Texto etiqueta="Marca" valor={f.marca} onCambio={set("marca")} maxLength={60} />
        <Texto etiqueta="Modelo" valor={f.modelo} onCambio={set("modelo")} maxLength={80} />
      </div>
      <div className="fila-campos">
        <Seleccion etiqueta="Condición" valor={f.condicion} onCambio={set("condicion")} vacio="Sin definir"
          opciones={["Nuevo", "Como nuevo", "Reacondicionado", "Usado en buen estado"].map((c) => ({ valor: c, etiqueta: c }))} />
        <Texto etiqueta="Garantía (meses)" tipo="number" valor={f.garantiaMeses} onCambio={set("garantiaMeses")} min={0} />
      </div>
      <Texto etiqueta="Foto del equipo (enlace)" tipo="url" valor={f.imagenUrl} onCambio={set("imagenUrl")} maxLength={500} placeholder="https://..."
        ayuda="Pega el enlace https de una imagen. Si lo dejas vacío se muestra una ilustración." />
      {f.imagenUrl && <EquipoImagen tipo={f.tipo as TipoEquipo} nombre={f.nombre || "Equipo"} url={f.imagenUrl} variante="ficha" />}
      <AreaTexto etiqueta="Descripción" valor={f.descripcion} onCambio={set("descripcion")} filas={3} maxLength={400} />
      <AreaTexto etiqueta="Características" ayuda="Una por línea. La IA las usa para responder a los clientes." valor={f.caracteristicas} onCambio={set("caracteristicas")} filas={5} maxLength={800} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="drawer-pie">
        <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button type="submit" className="btn" disabled={enviando}>{enviando ? "Guardando…" : equipo ? "Guardar cambios" : "Crear equipo"}</button>
      </div>
    </form>
  );
  return embebido ? form : <Drawer titulo="Nuevo equipo" onCerrar={onCerrar}>{form}</Drawer>;
}

function FormMantenimiento({ equipoId, onCerrar, onGuardado }: { equipoId: string; onCerrar: () => void; onGuardado: () => Promise<void> }) {
  const aviso = useToast();
  const { me } = useAuth();
  const tecnicos = useCarga(() => api<{ items: Usuario[] }>("/usuarios").catch(() => ({ items: [] as Usuario[] })), []);
  const [f, setF] = useState({ fecha: hoyISO(), tipo: "Preventivo", detalle: "", estado: "Programado", tecnico: me?.correo ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const activos = (tecnicos.datos?.items ?? []).filter((u) => u.estado === "Activo" && (u.rol === "Tecnico" || u.rol === "Administrador"));

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null); setEnviando(true);
    try {
      await api(`/equipos/${equipoId}/mantenimientos`, { metodo: "POST", cuerpo: f });
      aviso("Mantenimiento registrado.");
      await onGuardado();
    } catch (x) { setError(mensajeDe(x)); } finally { setEnviando(false); }
  }

  return (
    <Drawer titulo="Registrar mantenimiento" subtitulo={equipoId} onCerrar={onCerrar} ancho={460}>
      <form className="formulario" onSubmit={(e) => void enviar(e)}>
        <div className="fila-campos">
          <Seleccion etiqueta="Tipo" valor={f.tipo} onCambio={set("tipo")} opciones={[{ valor: "Preventivo", etiqueta: "Preventivo" }, { valor: "Correctivo", etiqueta: "Correctivo" }]} />
          <Texto etiqueta="Fecha" tipo="date" requerido valor={f.fecha} onCambio={set("fecha")} />
        </div>
        <AreaTexto etiqueta="Detalle" requerido valor={f.detalle} onCambio={set("detalle")} maxLength={400} filas={3} />
        <div className="fila-campos">
          <Seleccion etiqueta="Estado" valor={f.estado} onCambio={set("estado")} opciones={["Programado", "En curso", "Completado"].map((x) => ({ valor: x, etiqueta: x }))} />
          {activos.length > 0
            ? <Seleccion etiqueta="Técnico" valor={f.tecnico} onCambio={set("tecnico")} opciones={activos.map((u) => ({ valor: u.correo, etiqueta: u.nombre }))} />
            : <Texto etiqueta="Técnico (correo)" tipo="email" valor={f.tecnico} onCambio={set("tecnico")} />}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="drawer-pie">
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn" disabled={enviando}>{enviando ? "Guardando…" : "Registrar"}</button>
        </div>
      </form>
    </Drawer>
  );
}
