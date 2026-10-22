"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronRight, Clock, CreditCard, FileText, Package, Receipt, ShieldCheck, Wallet } from "lucide-react";
import PagoForm from "@/components/PagoForm";
import { useToast } from "@/components/Toast";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import EquipoImagen from "@/components/EquipoImagen";
import ContratoVista, { mesesEntre } from "@/components/ContratoVista";
import ComprobanteVista from "@/components/ComprobanteVista";
import { Cargando, ErrorCarga, SinAcceso, Vacio } from "@/components/Estados";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { fechaCorta, pen, plural } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import { tonoContrato, tonoFactura } from "@/lib/tonos";
import type { Comprobante, ContratoCliente, ContratoClienteDetalle, DatosPago, ResultadoPedido } from "@/lib/tipos";

/** Qué muestra el panel lateral: el resumen, el documento del contrato, un comprobante o el pago de un pedido pendiente. */
type Vista = { tipo: "detalle" } | { tipo: "contrato" } | { tipo: "comprobante"; id: string } | { tipo: "pagar" };
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

const dias = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000);

/** Avance del contrato: qué parte del plazo ya pasó. */
function Avance({ c }: { c: ContratoCliente }) {
  const total = Math.max(1, dias(c.inicio, c.fin));
  const pasados = Math.min(total, Math.max(0, total - c.diasParaVencer));
  const pct = Math.round((pasados / total) * 100);
  if (c.estado === "Pendiente de pago") {
    return <p className="reserva-aviso"><Clock size={16} aria-hidden="true" /> Pago pendiente. Tus equipos están reservados hasta las <b>{c.reservaVence ? hora(c.reservaVence) : "—"}</b>.</p>;
  }
  if (c.estado === "Cancelado" && c.motivoCancelacion) return <p className="muted">{c.motivoCancelacion}.</p>;
  const texto = c.estado !== "Vigente" ? c.estado : c.diasParaVencer < 0 ? "Plazo cumplido" : c.diasParaVencer === 0 ? "Vence hoy" : `Vence en ${plural(c.diasParaVencer, "día", "días")}`;
  return (
    <div className="ct-avance">
      <div className="ct-avance-txt"><span>{fechaCorta(c.inicio)}</span><b className={c.estado === "Vigente" && c.diasParaVencer <= 30 ? "pronto" : ""}>{texto}</b><span>{fechaCorta(c.fin)}</span></div>
      <div className="ct-barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del contrato"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function MisContratos() {
  const { puede } = useAuth();
  const aviso = useToast();
  const lista = useCarga(() => api<{ items: ContratoCliente[] }>("/portal/contratos"), []);
  const [id, setId] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>({ tipo: "detalle" });
  const det = useCarga(() => (id ? api<ContratoClienteDetalle>(`/portal/contratos/${id}`) : Promise.resolve(null)), [id]);
  const facturaId = vista.tipo === "comprobante" ? vista.id : null;
  const comp = useCarga(() => (facturaId ? api<Comprobante>(`/portal/facturas/${facturaId}`) : Promise.resolve(null)), [facturaId]);
  if (!puede("portal")) return <SinAcceso />;
  const items = lista.datos?.items ?? [];
  const vigentes = items.filter((c) => c.estado === "Vigente");
  const proximo = [...vigentes].sort((a, b) => a.fin.localeCompare(b.fin))[0];

  const abrir = (contratoId: string, v: Vista = { tipo: "detalle" }) => { setId(contratoId); setVista(v); };
  // CU-05: completar el pago de un pedido reservado; si la reserva venció, se avisa y se refresca la lista
  async function pagarPendiente(pago: DatosPago) {
    try {
      const r = await api<ResultadoPedido>(`/portal/pedidos/${id}/pagar`, { metodo: "POST", cuerpo: { pago } });
      aviso(r.correoEnviadoA ? `Pago aprobado. Te enviamos el comprobante a ${r.correoEnviadoA}.` : "Pago aprobado. Tu alquiler ya está activo.");
      await Promise.all([lista.recargar(), det.recargar()]);
      setVista({ tipo: "comprobante", id: r.comprobante.facturaId });
    } catch (e) {
      if (e instanceof ApiError && e.status === 410) { aviso(e.message, "error"); cerrar(); await lista.recargar(); return; }
      throw e;
    }
  }
  const cerrar = () => { setId(null); setVista({ tipo: "detalle" }); };
  const d = det.datos;
  const titulo = vista.tipo === "contrato" ? `Contrato ${id}` : vista.tipo === "comprobante" ? `Comprobante ${vista.id}` : vista.tipo === "pagar" ? "Completar pago" : d?.nombre ?? `Contrato ${id}`;
  const subtitulo = vista.tipo === "detalle" ? `Contrato ${id}` : d?.nombre;

  return (
    <>
      <PageHeader titulo="Mis contratos" descripcion="Tus alquileres, con vigencia, equipos y comprobantes." />
      {lista.cargando && !lista.datos && <Cargando />}
      {lista.error && <ErrorCarga mensaje={lista.error} onReintentar={() => void lista.recargar()} />}
      {lista.datos && items.length === 0 && <Vacio>Todavía no tienes contratos. Alquila tu primer equipo desde el <Link href="/catalogo">catálogo</Link>.</Vacio>}

      {items.length > 0 && (
        <dl className="ct-resumen">
          <div><dt><FileText size={16} aria-hidden="true" /> Contratos vigentes</dt><dd>{vigentes.length}</dd></div>
          <div><dt><Package size={16} aria-hidden="true" /> Equipos en uso</dt><dd>{vigentes.reduce((s, c) => s + c.equiposEnUso, 0)}</dd></div>
          <div><dt><Wallet size={16} aria-hidden="true" /> Pagas al mes</dt><dd>{pen(vigentes.reduce((s, c) => s + c.tarifaMensual, 0))}</dd></div>
          <div><dt><CalendarDays size={16} aria-hidden="true" /> Próximo vencimiento</dt><dd>{proximo ? fechaCorta(proximo.fin) : "—"}</dd></div>
        </dl>
      )}

      <ul className="ct-lista">
        {items.map((c) => (
          <li key={c.contratoId} className="ct-card">
            <div className="ct-cab">
              <span className="ct-icono" aria-hidden="true"><FileText size={22} /></span>
              <div className="ct-titulo">
                <h2>{c.nombre}</h2>
                <span className="muted">{c.contratoId} · {plural(c.meses ?? mesesEntre(c.inicio, c.fin), "mes", "meses")}</span>
              </div>
              <Badge tono={tonoContrato(c.estado)} dot>{c.estado}</Badge>
            </div>
            <dl className="ct-datos">
              <div><dt>Cuota mensual</dt><dd className="ct-cuota">{pen(c.tarifaMensual)}</dd></div>
              <div><dt>Equipos</dt><dd>{c.equiposEnUso}</dd></div>
              <div><dt>Inicio</dt><dd>{fechaCorta(c.inicio)}</dd></div>
              <div><dt>Fin</dt><dd>{fechaCorta(c.fin)}</dd></div>
            </dl>
            <Avance c={c} />
            <div className="ct-acc">
              {c.estado === "Pendiente de pago"
                ? <button type="button" className="btn btn-sm" onClick={() => abrir(c.contratoId, { tipo: "pagar" })}><CreditCard size={15} aria-hidden="true" /> Completar pago</button>
                : <button type="button" className="btn btn-sm" onClick={() => abrir(c.contratoId, { tipo: "contrato" })}><FileText size={15} aria-hidden="true" /> Ver contrato</button>}
              <button type="button" className="btn btn-sm btn-secundario" onClick={() => abrir(c.contratoId)}>Ver detalle <ChevronRight size={15} aria-hidden="true" /></button>
            </div>
          </li>
        ))}
      </ul>

      {id && (
        <Drawer titulo={titulo} subtitulo={subtitulo} onCerrar={cerrar} ancho={vista.tipo === "detalle" ? 600 : 760}>
          {vista.tipo !== "detalle" && (
            <button type="button" className="btn-texto ct-volver" onClick={() => setVista({ tipo: "detalle" })}><ArrowLeft size={15} aria-hidden="true" /> Volver al resumen</button>
          )}
          {det.cargando && !d && <Cargando />}
          {det.error && <ErrorCarga mensaje={det.error} onReintentar={() => void det.recargar()} />}

          {d && vista.tipo === "contrato" && <ContratoVista c={d} />}

          {d && vista.tipo === "pagar" && (
            d.estado === "Pendiente de pago" ? (
              <>
                <p className="reserva-aviso"><Clock size={16} aria-hidden="true" /> Tus equipos están reservados hasta las <b>{d.reservaVence ? hora(d.reservaVence) : "—"}</b>. Hoy pagas el primer mes: <b>{pen(d.tarifaMensual)}</b>.</p>
                <PagoForm monto={d.tarifaMensual} textoBoton="Pagar" onPagar={pagarPendiente} onCancelar={() => setVista({ tipo: "detalle" })} />
              </>
            ) : <p className="muted">Este pedido ya no está pendiente de pago.</p>
          )}

          {vista.tipo === "comprobante" && (
            <>
              {comp.cargando && !comp.datos && <Cargando />}
              {comp.error && <ErrorCarga mensaje={comp.error} onReintentar={() => void comp.recargar()} />}
              {comp.datos && <ComprobanteVista c={comp.datos} />}
            </>
          )}

          {d && vista.tipo === "detalle" && (
            <>
              <section className="ct-hero">
                <div className="ct-hero-cab">
                  <Badge tono={tonoContrato(d.estado)} dot>{d.estado}</Badge>
                  <span className="muted">{d.origen === "Portal" ? "Contratado en línea" : "Registrado por Winware"}</span>
                </div>
                <Avance c={d} />
                <dl className="ct-tiles">
                  <div><dt>Cuota mensual</dt><dd>{pen(d.tarifaMensual)}</dd></div>
                  <div><dt>Duración</dt><dd>{plural(d.meses ?? mesesEntre(d.inicio, d.fin), "mes", "meses")}</dd></div>
                  <div><dt>Equipos</dt><dd>{d.equiposEnUso}</dd></div>
                  <div><dt>Total</dt><dd>{pen(d.tarifaMensual * (d.meses ?? mesesEntre(d.inicio, d.fin)))}</dd></div>
                </dl>
                <button type="button" className="btn ct-ver-doc" onClick={() => setVista({ tipo: "contrato" })}><FileText size={16} aria-hidden="true" /> Ver contrato</button>
              </section>

              <section className="pedido-seccion" aria-labelledby="h-ct-equipos">
                <h3 id="h-ct-equipos">Equipos ({d.equipos.length})</h3>
                {d.equipos.length === 0 ? <p className="muted">Este contrato ya no tiene equipos en uso.</p> : (
                  <ul className="resumen-pedido">
                    {d.equipos.map((e) => (
                      <li key={e.equipoId}>
                        <EquipoImagen tipo={e.tipo} nombre={e.nombre} url={e.imagenUrl} variante="mini" />
                        <div className="pedido-info">
                          <strong>{e.nombre}</strong>
                          <small>{[e.marca, e.modelo].filter(Boolean).join(" ") || e.tipo} · {e.equipoId}</small>
                        </div>
                        <Badge tono={e.garantia.vigente ? "ok" : "danger"}><ShieldCheck size={13} aria-hidden="true" /> {e.garantia.vigente ? `Garantía hasta ${fechaCorta(e.garantia.hasta)}` : "Garantía vencida"}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="pedido-seccion" aria-labelledby="h-ct-comp">
                <h3 id="h-ct-comp">Comprobantes ({d.facturas.length})</h3>
                {d.facturas.length === 0 ? <p className="muted">Sin comprobantes.</p> : (
                  <ul className="resumen-pedido">
                    {d.facturas.map((f) => (
                      <li key={f.facturaId}>
                        <span className="ct-comp-icono" aria-hidden="true"><Receipt size={18} /></span>
                        <div className="pedido-info">
                          <strong>{f.tipoComprobante} {f.facturaId}</strong>
                          <small>Emitida el {fechaCorta(f.emitida)} · {pen(f.monto)}</small>
                        </div>
                        <Badge tono={tonoFactura(f.estadoCalculado)} dot>{f.estadoCalculado}</Badge>
                        <button type="button" className="btn btn-sm btn-secundario" onClick={() => setVista({ tipo: "comprobante", id: f.facturaId })}>Ver</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </Drawer>
      )}
    </>
  );
}
