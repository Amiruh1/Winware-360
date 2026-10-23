"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Bell, Boxes, CalendarClock, FileText, Info, Wallet, WalletCards, Wrench } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import BarChart from "@/components/BarChart";
import MapaEquipos from "@/components/MapaEquipos";
import { ResumenDiaIA } from "@/components/FuncionesIA";
import StatusBar from "@/components/StatusBar";
import { Cargando, ErrorCarga, SinAcceso } from "@/components/Estados";
import { useContadores } from "@/components/Contadores";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { api, mensajeDe } from "@/lib/api";
import { fechaCorta, hoyISO, mesCorto, mesLargo, pen, plural } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import { tonoAlerta, tonoPrioridad, tonoTicket } from "@/lib/tonos";
import type { Alerta, Equipo } from "@/lib/tipos";

const destino = (a: Alerta) => a.entidad === "FACTURA" ? "/finanzas" : a.entidad === "CONTRATO" ? "/contratos" : `/inventario?equipo=${a.entidadId}`;
const IconoAlerta = ({ s }: { s: Alerta["severidad"] }) => s === "Alta" ? <AlertTriangle size={17} aria-hidden="true" /> : s === "Media" ? <CalendarClock size={17} aria-hidden="true" /> : <Info size={17} aria-hidden="true" />;

/** Tarjeta de indicador: ícono, valor grande, detalle y contenido extra opcional (barra, enlace). */
function Indicador({ icono: Icono, tono = "info", titulo, valor, detalle, alerta, children }: {
  icono: typeof Boxes; tono?: "info" | "ok" | "warn" | "danger"; titulo: string; valor: string | number; detalle?: string; alerta?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className={`indicador${alerta ? " indicador-alerta" : ""}`}>
      <div className="indicador-cab">
        <span className={`indicador-icono aviso-${tono}`} aria-hidden="true"><Icono size={18} /></span>
        <dt>{titulo}</dt>
      </div>
      <dd>
        <span className="indicador-valor">{valor}</span>
        {detalle && <small>{detalle}</small>}
        {children}
      </dd>
    </div>
  );
}

export default function Resumen() {
  const { me, puede } = useAuth();
  const router = useRouter();
  useEffect(() => { if (me?.rol === "Cliente") router.replace("/catalogo"); }, [me, router]);
  const { resumen, error, cargando, refrescar } = useContadores();
  const aviso = useToast();
  const equipos = useCarga(() => api<{ items: Equipo[] }>("/equipos"), []);
  // se vuelve a cargar cuando cambia el contador (por ejemplo, al marcar avisos desde la campana)
  const alertas = useCarga(() => api<{ items: Alerta[] }>("/alertas", { query: { estado: "Nueva" } }), [resumen?.alertasNuevas]);

  if (me?.rol === "Cliente") return <Cargando />;
  if (!puede("resumen")) return <SinAcceso />;

  async function marcar(a: Alerta, estado: "Vista" | "Resuelta") {
    try {
      await api(`/alertas/${a.alertaId}`, { metodo: "PATCH", cuerpo: { estado } });
      await Promise.all([alertas.recargar(), refrescar()]);
    } catch (e) { aviso(mensajeDe(e), "error"); }
  }

  const primerNombre = me?.nombre.split(" ")[0] ?? "";
  const hoy = hoyISO();
  const r = resumen;
  const ocupacion = r && r.equipos.total ? Math.round((r.equipos.alquilado / r.equipos.total) * 100) : 0;
  const sinResolver = r ? r.tickets.abiertos + r.tickets.enAtencion : 0;
  const listaAvisos = alertas.datos?.items ?? [];

  return (
    <div className="inicio">
      <PageHeader titulo={`Hola, ${primerNombre}`} descripcion={`Hoy es ${Number(hoy.slice(8, 10))} de ${mesLargo(hoy.slice(0, 7))}. Este es el estado de los equipos, la mesa de ayuda y los contratos de Winware.`} />

      {cargando && !r && <Cargando />}
      {error && !r && <ErrorCarga mensaje={error} onReintentar={() => void refrescar()} />}

      {r && (
        <>
          <dl className="indicadores">
            <Indicador icono={Boxes} titulo="Equipos" valor={r.equipos.total} detalle={`${r.equipos.alquilado} alquilados · ${r.equipos.disponible} disponibles · ${r.equipos.enMantenimiento} en mantenimiento`}>
              <span className="indicador-barra" role="progressbar" aria-valuenow={ocupacion} aria-valuemin={0} aria-valuemax={100} aria-label="Ocupación">
                <span style={{ width: `${ocupacion}%` }} />
              </span>
              <small>Ocupación del inventario: <b>{ocupacion}%</b></small>
            </Indicador>
            <Indicador icono={Wrench} tono={r.equipos.conIncidencia ? "danger" : "ok"} alerta={r.equipos.conIncidencia > 0} titulo="Tickets sin resolver" valor={sinResolver}
              detalle={`${r.tickets.abiertos} abiertos · ${r.tickets.enAtencion} en atención`}>
              <small className={r.equipos.conIncidencia ? "indicador-mal" : undefined}>{r.equipos.conIncidencia ? `${plural(r.equipos.conIncidencia, "equipo", "equipos")} con incidencia abierta` : "Ningún equipo con incidencia"}</small>
            </Indicador>
            {r.contratos ? (
              <Indicador icono={FileText} tono={r.contratos.porVencer.length ? "warn" : "info"} titulo="Contratos vigentes" valor={r.contratos.vigentes}
                detalle={r.contratos.porVencer.length ? `${plural(r.contratos.porVencer.length, "vence", "vencen")} en los próximos 60 días` : "Ninguno vence en los próximos 60 días"} />
            ) : (
              // quien no ve contratos (técnico) ve su carga de mantenimiento
              <Indicador icono={CalendarClock} tono={r.equipos.enMantenimiento ? "warn" : "ok"} titulo="En mantenimiento" valor={r.equipos.enMantenimiento}
                detalle={`${plural(r.equipos.disponible, "equipo disponible", "equipos disponibles")} para alquilar`} />
            )}
            {r.finanzas ? (
              <Indicador icono={Wallet} tono={r.finanzas.vencidasCantidad ? "danger" : "ok"} alerta={r.finanzas.vencidasCantidad > 0} titulo="Por cobrar" valor={pen(r.finanzas.pendienteMonto)}
                detalle={`${plural(r.finanzas.pendienteCantidad, "comprobante pendiente", "comprobantes pendientes")}`}>
                <small className={r.finanzas.vencidasCantidad ? "indicador-mal" : undefined}>Vencido: <b>{pen(r.finanzas.vencidasMonto)}</b>{r.finanzas.vencidasCantidad ? ` (${r.finanzas.vencidasCantidad})` : ""}</small>
              </Indicador>
            ) : (
              <Indicador icono={Bell} tono={r.alertasNuevas ? "warn" : "ok"} titulo="Avisos nuevos" valor={r.alertasNuevas} detalle={r.alertasNuevas ? "Revísalos en el panel de avisos" : "Todo en orden"} />
            )}
          </dl>

          <div className="inicio-grid">
            <section className="panel panel-rack" aria-labelledby="h-mapa">
              <h2 id="h-mapa">Mapa de equipos</h2>
              <p>Cada recuadro es un equipo. Pulsa uno para ver su ficha.</p>
              {equipos.cargando && !equipos.datos && <Cargando />}
              {equipos.error && <ErrorCarga mensaje={equipos.error} onReintentar={() => void equipos.recargar()} />}
              {equipos.datos && <MapaEquipos equipos={equipos.datos.items} />}
            </section>

            <div className="inicio-lateral">
              <ResumenDiaIA />
              <section className="panel" aria-labelledby="h-avisos">
                <div className="panel-cabecera">
                  <h2 id="h-avisos">Avisos</h2>
                  {listaAvisos.length > 0 && <Badge tono="danger">{plural(listaAvisos.length, "nuevo", "nuevos")}</Badge>}
                </div>
                {alertas.cargando && !alertas.datos && <Cargando />}
                {alertas.error && <ErrorCarga mensaje={alertas.error} onReintentar={() => void alertas.recargar()} />}
                {alertas.datos && listaAvisos.length === 0 && <p className="muted">No hay avisos nuevos. Todo en orden.</p>}
                <ul className="lista-avisos">
                  {listaAvisos.map((a) => (
                    <li key={a.alertaId}>
                      <span className={`aviso-icon aviso-${tonoAlerta(a.severidad)}`}><IconoAlerta s={a.severidad} /></span>
                      <div>
                        <p>{a.mensaje}</p>
                        <div className="acciones">
                          <Link href={destino(a)}>Ver</Link>
                          {puede("alertas", "escribir") && <button type="button" className="btn-texto" onClick={() => void marcar(a, "Vista")}>Marcar como vista</button>}
                          {puede("alertas", "escribir") && <button type="button" className="btn-texto" onClick={() => void marcar(a, "Resuelta")}>Resuelta</button>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {r.contratos && (
                <section className="panel" aria-labelledby="h-venc">
                  <h2 id="h-venc">Contratos por vencer</h2>
                  {r.contratos.porVencer.length === 0 && <p className="muted">Ningún contrato vence en los próximos 60 días.</p>}
                  <ul className="recent">
                    {r.contratos.porVencer.map((c) => (
                      <li key={c.contratoId}>
                        <div><strong>{c.nombre}</strong><small>{c.contratoId} · vence el {fechaCorta(c.fin)}</small></div>
                        <Badge tono={c.dias <= 30 ? "danger" : "warn"}>{c.dias} días</Badge>
                      </li>
                    ))}
                  </ul>
                  <Link href="/contratos" className="more">Ir a contratos <ArrowRight size={14} aria-hidden="true" /></Link>
                </section>
              )}
            </div>
          </div>

          <div className={`inicio-fila${r.finanzas ? "" : " inicio-fila-dos"}`}>
            <section className="panel" aria-labelledby="h-estado">
              <h2 id="h-estado">Inventario por estado</h2>
              <StatusBar items={[
                { label: "Disponibles", valor: r.equipos.disponible, tono: "ok" },
                { label: "Alquilados", valor: r.equipos.alquilado, tono: "warn" },
                { label: "En mantenimiento", valor: r.equipos.enMantenimiento, tono: "danger" },
              ]} />
              <Link href="/inventario" className="more">Ir al inventario <ArrowRight size={14} aria-hidden="true" /></Link>
            </section>

            <section className="panel" aria-labelledby="h-tickets">
              <h2 id="h-tickets">Tickets recientes</h2>
              {r.tickets.recientes.length === 0 && <p className="muted">Todavía no hay tickets.</p>}
              <ul className="recent">
                {r.tickets.recientes.map((t) => (
                  <li key={t.ticketId}>
                    <div>
                      <strong>{t.titulo}</strong>
                      <small>{t.ticketId} · {fechaCorta(t.creado)}</small>
                    </div>
                    <span className="etiquetas"><Badge tono={tonoPrioridad(t.prioridad)}>{t.prioridad}</Badge><Badge tono={tonoTicket(t.estado)} dot>{t.estado}</Badge></span>
                  </li>
                ))}
              </ul>
              <Link href="/mesa-de-ayuda" className="more">Ir a la mesa de ayuda <ArrowRight size={14} aria-hidden="true" /></Link>
            </section>

            {r.finanzas && (
              <section className="panel" aria-labelledby="h-inv">
                <h2 id="h-inv" className="titulo-icono"><WalletCards size={18} aria-hidden="true" /> Cobrado por mes</h2>
                {/* ?? []: un backend sin desplegar todavía no envía cobradoMensual */}
                {(r.finanzas.cobradoMensual ?? []).length > 0
                  ? <BarChart titulo="Cobrado por mes" datos={r.finanzas.cobradoMensual.map((m) => ({ etiqueta: mesCorto(m.mes), valor: m.total }))} />
                  : <p className="muted">Aún no hay facturas pagadas.</p>}
                <Link href="/finanzas" className="more">Ir a finanzas <ArrowRight size={14} aria-hidden="true" /></Link>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
