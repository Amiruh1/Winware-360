"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import { Cargando, ErrorCarga, SinAcceso, Vacio } from "@/components/Estados";
import { Seleccion, Texto, AreaTexto } from "@/components/Campos";
import { useToast } from "@/components/Toast";
import { useContadores } from "@/components/Contadores";
import { useAuth } from "@/lib/auth";
import { api, mensajeDe } from "@/lib/api";
import { fechaCorta, hoyISO, pen } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import { tonoFactura, tonoOrden } from "@/lib/tonos";
import type { Contrato, Factura, OrdenCompra, Proveedor } from "@/lib/tipos";

type Vista = "facturas" | "ordenes" | "proveedores";
const ESTADOS_OC = ["En aprobación", "En tránsito", "Entregada"] as const;

export default function Finanzas() {
  const { puede } = useAuth();
  const { refrescar } = useContadores();
  const aviso = useToast();
  const [vista, setVista] = useState<Vista>("facturas");
  const [filtro, setFiltro] = useState<"" | "Pendiente" | "Vencida" | "Pagada">("");
  const [form, setForm] = useState<null | "factura" | "orden" | "proveedor">(null);
  const facturas = useCarga(() => api<{ items: Factura[] }>("/facturas"), []);
  const ordenes = useCarga(() => api<{ items: OrdenCompra[] }>("/ordenes-compra"), []);
  const proveedores = useCarga(() => api<{ items: Proveedor[] }>("/proveedores"), []);
  const contratos = useCarga(() => api<{ items: Contrato[] }>("/contratos"), []);

  const fs = useMemo(() => [...(facturas.datos?.items ?? [])].sort((a, b) => b.vence.localeCompare(a.vence)), [facturas.datos]);
  const visibles = fs.filter((f) => !filtro || (f.estadoCalculado ?? f.estado) === filtro);
  const tot = useMemo(() => {
    const suma = (e: string) => fs.filter((f) => (f.estadoCalculado ?? f.estado) === e).reduce((s, f) => s + f.monto, 0);
    return { pendiente: suma("Pendiente"), vencida: suma("Vencida"), pagada: suma("Pagada") };
  }, [fs]);

  if (!puede("finanzas")) return <SinAcceso />;
  const escribe = puede("finanzas", "escribir");
  const alCambiar = async () => { await Promise.all([facturas.recargar(), ordenes.recargar(), proveedores.recargar(), refrescar()]); };

  async function marcarPagada(f: Factura) {
    try {
      await api(`/facturas/${f.facturaId}`, { metodo: "PATCH", cuerpo: { estado: "Pagada" } });
      aviso(`Factura ${f.facturaId} marcada como pagada.`);
      await alCambiar();
    } catch (x) { aviso(mensajeDe(x), "error"); }
  }
  async function avanzarOrden(o: OrdenCompra) {
    const sig = ESTADOS_OC[ESTADOS_OC.indexOf(o.estado) + 1];
    if (!sig) return;
    try {
      await api(`/ordenes-compra/${o.ordenId}`, { metodo: "PATCH", cuerpo: { estado: sig } });
      aviso(`Orden ${o.ordenId}: ${sig.toLowerCase()}.`);
      await alCambiar();
    } catch (x) { aviso(mensajeDe(x), "error"); }
  }

  const etiquetaNuevo = { facturas: "Nueva factura", ordenes: "Nueva orden de compra", proveedores: "Nuevo proveedor" }[vista];
  const abrir = { facturas: "factura", ordenes: "orden", proveedores: "proveedor" }[vista] as "factura" | "orden" | "proveedor";

  return (
    <>
      <PageHeader titulo="Finanzas" descripcion="Cobros a los clientes y compras a proveedores.">
        {escribe && <button type="button" className="btn" onClick={() => setForm(abrir)}><Plus size={16} aria-hidden="true" /> {etiquetaNuevo}</button>}
      </PageHeader>

      <dl className="kpis" style={{ marginTop: 0 }}>
        <div><dt>Por cobrar</dt><dd>{pen(tot.pendiente)}</dd></div>
        <div className={tot.vencida ? "kpi-alert" : undefined}><dt>Vencido</dt><dd>{pen(tot.vencida)}</dd></div>
        <div><dt>Cobrado</dt><dd>{pen(tot.pagada)}</dd></div>
      </dl>

      <div className="tabs" style={{ marginTop: 18 }} role="group" aria-label="Vista">
        <button type="button" aria-pressed={vista === "facturas"} onClick={() => setVista("facturas")}>Facturas <b>{fs.length}</b></button>
        <button type="button" aria-pressed={vista === "ordenes"} onClick={() => setVista("ordenes")}>Órdenes de compra <b>{ordenes.datos?.items.length ?? 0}</b></button>
        <button type="button" aria-pressed={vista === "proveedores"} onClick={() => setVista("proveedores")}>Proveedores <b>{proveedores.datos?.items.length ?? 0}</b></button>
      </div>

      {vista === "facturas" && (
        <>
          <div className="toolbar">
            <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} aria-label="Filtrar por estado">
              <option value="">Todas</option><option>Pendiente</option><option>Vencida</option><option>Pagada</option>
            </select>
          </div>
          {facturas.cargando && !facturas.datos && <Cargando />}
          {facturas.error && <ErrorCarga mensaje={facturas.error} onReintentar={() => void facturas.recargar()} />}
          {facturas.datos && (visibles.length === 0 ? <Vacio>No hay facturas con ese filtro.</Vacio> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Factura</th><th>Contrato</th><th>Emitida</th><th>Vence</th><th className="num">Monto</th><th>Estado</th>{escribe && <th><span className="sr-only">Acciones</span></th>}</tr></thead>
              <tbody>
                {visibles.map((f) => {
                  const est = f.estadoCalculado ?? f.estado;
                  return (
                    <tr key={f.facturaId}>
                      <td><strong>{f.facturaId}</strong></td><td>{f.contratoId}</td><td>{fechaCorta(f.emitida)}</td>
                      <td>{fechaCorta(f.vence)}</td><td className="num">{pen(f.monto)}</td>
                      <td><Badge tono={tonoFactura(est)} dot>{est}</Badge>{f.pagadaEl && <small className="muted" style={{ display: "block" }}>el {fechaCorta(f.pagadaEl)}</small>}</td>
                      {escribe && <td><div className="celda-acciones">{est !== "Pagada" && <button type="button" className="btn btn-secundario btn-sm" onClick={() => void marcarPagada(f)}>Marcar pagada</button>}</div></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          ))}
        </>
      )}

      {vista === "ordenes" && (
        <>
          {ordenes.cargando && !ordenes.datos && <Cargando />}
          {ordenes.error && <ErrorCarga mensaje={ordenes.error} onReintentar={() => void ordenes.recargar()} />}
          {ordenes.datos && (ordenes.datos.items.length === 0 ? <Vacio>Aún no hay órdenes de compra.</Vacio> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Orden</th><th>Proveedor</th><th>Descripción</th><th>Fecha</th><th className="num">Monto</th><th>Estado</th>{escribe && <th><span className="sr-only">Acciones</span></th>}</tr></thead>
              <tbody>
                {[...ordenes.datos.items].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((o) => (
                  <tr key={o.ordenId}>
                    <td><strong>{o.ordenId}</strong></td><td>{o.proveedor ?? o.proveedorId}</td><td>{o.descripcion}</td><td>{fechaCorta(o.fecha)}</td>
                    <td className="num">{pen(o.monto)}</td><td><Badge tono={tonoOrden(o.estado)} dot>{o.estado}</Badge></td>
                    {escribe && <td><div className="celda-acciones">{o.estado !== "Entregada" && <button type="button" className="btn btn-secundario btn-sm" onClick={() => void avanzarOrden(o)}>{o.estado === "En aprobación" ? "Aprobar" : "Marcar entregada"}</button>}</div></td>}
                  </tr>
                ))}
              </tbody>
            </table></div>
          ))}
        </>
      )}

      {vista === "proveedores" && (
        <>
          {proveedores.cargando && !proveedores.datos && <Cargando />}
          {proveedores.error && <ErrorCarga mensaje={proveedores.error} onReintentar={() => void proveedores.recargar()} />}
          {proveedores.datos && (proveedores.datos.items.length === 0 ? <Vacio>Aún no hay proveedores.</Vacio> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Proveedor</th><th>RUC</th><th>Contacto</th><th>Estado</th></tr></thead>
              <tbody>
                {proveedores.datos.items.map((p) => (
                  <tr key={p.proveedorId}>
                    <td><strong>{p.razonSocial}</strong><small className="muted" style={{ display: "block" }}>{p.proveedorId}</small></td><td>{p.ruc}</td>
                    <td>{p.contacto}<small className="muted" style={{ display: "block" }}>{p.correo} · {p.telefono}</small></td>
                    <td><Badge tono={p.estado === "Activo" ? "ok" : "neutral"} dot>{p.estado}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ))}
        </>
      )}

      {form === "factura" && <FormFactura contratos={contratos.datos?.items ?? []} onCerrar={() => setForm(null)} onGuardado={async () => { setForm(null); await alCambiar(); }} />}
      {form === "orden" && <FormOrden proveedores={(proveedores.datos?.items ?? []).filter((p) => p.estado === "Activo")} onCerrar={() => setForm(null)} onGuardado={async () => { setForm(null); await alCambiar(); }} />}
      {form === "proveedor" && <FormProveedor onCerrar={() => setForm(null)} onGuardado={async () => { setForm(null); await alCambiar(); }} />}
    </>
  );
}

function useEnvio(ruta: string, ok: string, cuerpo: () => unknown, onGuardado: () => Promise<void>) {
  const aviso = useToast();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null); setEnviando(true);
    try { await api(ruta, { metodo: "POST", cuerpo: cuerpo() }); aviso(ok); await onGuardado(); }
    catch (x) { setError(mensajeDe(x)); } finally { setEnviando(false); }
  }
  return { error, enviando, enviar };
}

function Pie({ onCerrar, enviando, texto }: { onCerrar: () => void; enviando: boolean; texto: string }) {
  return (
    <div className="drawer-pie">
      <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
      <button type="submit" className="btn" disabled={enviando}>{enviando ? "Guardando…" : texto}</button>
    </div>
  );
}

function FormFactura({ contratos, onCerrar, onGuardado }: { contratos: Contrato[]; onCerrar: () => void; onGuardado: () => Promise<void> }) {
  const [f, setF] = useState({ contratoId: contratos.find((c) => c.estado === "Vigente")?.contratoId ?? "", emitida: hoyISO(), vence: "", monto: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const { error, enviando, enviar } = useEnvio("/facturas", "Factura creada.", () => ({ ...f, monto: Number(f.monto) }), onGuardado);
  const sugerido = contratos.find((c) => c.contratoId === f.contratoId)?.tarifaMensual;
  return (
    <Drawer titulo="Nueva factura" onCerrar={onCerrar} ancho={460}>
      <form className="formulario" onSubmit={(e) => void enviar(e)}>
        <Seleccion etiqueta="Contrato" requerido valor={f.contratoId} onCambio={set("contratoId")} opciones={contratos.map((c) => ({ valor: c.contratoId, etiqueta: `${c.contratoId} · ${c.nombre}` }))} />
        <div className="fila-campos">
          <Texto etiqueta="Emitida" tipo="date" requerido valor={f.emitida} onCambio={set("emitida")} />
          <Texto etiqueta="Vence" tipo="date" requerido valor={f.vence} onCambio={set("vence")} />
        </div>
        <Texto etiqueta="Monto (S/)" tipo="number" min={0} requerido valor={f.monto} onCambio={set("monto")} ayuda={sugerido ? `Tarifa mensual del contrato: ${pen(sugerido)}` : undefined} />
        {error && <p className="error" role="alert">{error}</p>}
        <Pie onCerrar={onCerrar} enviando={enviando} texto="Crear factura" />
      </form>
    </Drawer>
  );
}

function FormOrden({ proveedores, onCerrar, onGuardado }: { proveedores: Proveedor[]; onCerrar: () => void; onGuardado: () => Promise<void> }) {
  const [f, setF] = useState({ proveedorId: proveedores[0]?.proveedorId ?? "", fecha: hoyISO(), descripcion: "", monto: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const { error, enviando, enviar } = useEnvio("/ordenes-compra", "Orden de compra creada.", () => ({ ...f, monto: Number(f.monto) }), onGuardado);
  return (
    <Drawer titulo="Nueva orden de compra" onCerrar={onCerrar} ancho={460}>
      <form className="formulario" onSubmit={(e) => void enviar(e)}>
        <Seleccion etiqueta="Proveedor" requerido valor={f.proveedorId} onCambio={set("proveedorId")} opciones={proveedores.map((p) => ({ valor: p.proveedorId, etiqueta: p.razonSocial }))} />
        <Texto etiqueta="Fecha" tipo="date" requerido valor={f.fecha} onCambio={set("fecha")} />
        <AreaTexto etiqueta="Descripción" requerido valor={f.descripcion} onCambio={set("descripcion")} filas={3} maxLength={300} />
        <Texto etiqueta="Monto (S/)" tipo="number" min={0} requerido valor={f.monto} onCambio={set("monto")} />
        {error && <p className="error" role="alert">{error}</p>}
        <Pie onCerrar={onCerrar} enviando={enviando} texto="Crear orden" />
      </form>
    </Drawer>
  );
}

function FormProveedor({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => Promise<void> }) {
  const [f, setF] = useState({ razonSocial: "", ruc: "", contacto: "", correo: "", telefono: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const { error, enviando, enviar } = useEnvio("/proveedores", "Proveedor creado.", () => f, onGuardado);
  return (
    <Drawer titulo="Nuevo proveedor" onCerrar={onCerrar} ancho={460}>
      <form className="formulario" onSubmit={(e) => void enviar(e)}>
        <Texto etiqueta="Razón social" requerido valor={f.razonSocial} onCambio={set("razonSocial")} maxLength={150} />
        <Texto etiqueta="RUC" requerido valor={f.ruc} onCambio={set("ruc")} ayuda="11 dígitos" maxLength={11} />
        <Texto etiqueta="Persona de contacto" requerido valor={f.contacto} onCambio={set("contacto")} maxLength={100} />
        <div className="fila-campos">
          <Texto etiqueta="Correo" tipo="email" requerido valor={f.correo} onCambio={set("correo")} />
          <Texto etiqueta="Teléfono" requerido valor={f.telefono} onCambio={set("telefono")} maxLength={30} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <Pie onCerrar={onCerrar} enviando={enviando} texto="Crear proveedor" />
      </form>
    </Drawer>
  );
}
