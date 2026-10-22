"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Meter from "@/components/Meter";
import Drawer from "@/components/Drawer";
import EquipoIcono from "@/components/EquipoIcono";
import { Cargando, ErrorCarga, SinAcceso, Vacio } from "@/components/Estados";
import { Seleccion, Texto } from "@/components/Campos";
import { useToast } from "@/components/Toast";
import { useContadores } from "@/components/Contadores";
import { useAuth } from "@/lib/auth";
import { api, mensajeDe } from "@/lib/api";
import { fechaCorta, hoyISO, pen } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import { tonoContrato, tonoEquipo, tonoFactura } from "@/lib/tonos";
import type { Cliente, Contrato, ContratoDetalle } from "@/lib/tipos";

export default function Pagina() {
  return <Suspense fallback={<Cargando />}><Contratos /></Suspense>;
}

function Contratos() {
  const { puede } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { refrescar } = useContadores();
  const abierto = params.get("contrato");
  const [vista, setVista] = useState<"contratos" | "clientes">("contratos");
  const [nuevo, setNuevo] = useState(false);
  const [cliente, setCliente] = useState<Cliente | "nuevo" | null>(null);
  const contratos = useCarga(() => api<{ items: Contrato[] }>("/contratos"), []);
  const clientes = useCarga(() => api<{ items: Cliente[] }>("/clientes"), []);
  const nombreCliente = (id: string) => clientes.datos?.items.find((c) => c.clienteId === id)?.razonSocial ?? id;

  if (!puede("contratos")) return <SinAcceso />;
  const escribe = puede("contratos", "escribir");
  const escribeCli = puede("clientes", "escribir");
  const alCambiar = async () => { await Promise.all([contratos.recargar(), clientes.recargar(), refrescar()]); };

  return (
    <>
      <PageHeader titulo="Contratos" descripcion="Alquileres vigentes, cuántos equipos usa cada uno y cuándo vencen.">
        {vista === "contratos" && escribe && <button type="button" className="btn" onClick={() => setNuevo(true)}><Plus size={16} aria-hidden="true" /> Nuevo contrato</button>}
        {vista === "clientes" && escribeCli && <button type="button" className="btn" onClick={() => setCliente("nuevo")}><Plus size={16} aria-hidden="true" /> Nuevo cliente</button>}
      </PageHeader>

      <div className="tabs" role="group" aria-label="Vista">
        <button type="button" aria-pressed={vista === "contratos"} onClick={() => setVista("contratos")}>Contratos <b>{contratos.datos?.items.length ?? 0}</b></button>
        <button type="button" aria-pressed={vista === "clientes"} onClick={() => setVista("clientes")}>Clientes <b>{clientes.datos?.items.length ?? 0}</b></button>
      </div>

      {vista === "contratos" && (
        <>
          {contratos.cargando && !contratos.datos && <Cargando />}
          {contratos.error && <ErrorCarga mensaje={contratos.error} onReintentar={() => void contratos.recargar()} />}
          {contratos.datos && contratos.datos.items.length === 0 && <Vacio>Aún no hay contratos.</Vacio>}
          <ul className="contracts" style={{ listStyle: "none", padding: 0, display: "grid", gap: 14 }}>
            {contratos.datos?.items.map((c) => {
              const uso = c.equiposEnUso ?? 0;
              const pct = c.equiposContratados ? (uso / c.equiposContratados) * 100 : 0;
              const dias = c.diasParaVencer ?? 999;
              return (
                <li key={c.contratoId}>
                  <button type="button" className="contract" onClick={() => router.replace(`/contratos?contrato=${c.contratoId}`)}>
                    <div>
                      <h2 style={{ margin: 0 }}>{c.nombre}</h2>
                      <small className="muted">{c.contratoId} · {nombreCliente(c.clienteId)}</small>
                      <div className="contract-fee">{pen(c.tarifaMensual ?? 0)} <span>al mes</span></div>
                      <div style={{ marginTop: 10 }}>
                        <Badge tono={tonoContrato(c.estado)} dot>{c.estado}</Badge>
                        {c.estado === "Vigente" && dias >= 0 && dias <= 60 && <span className="inline-note"><Badge tono={dias <= 30 ? "danger" : "warn"}>Vence en {dias} días</Badge></span>}
                        {c.estado === "Vigente" && dias < 0 && <span className="inline-note"><Badge tono="danger">Vencido</Badge></span>}
                      </div>
                    </div>
                    <div className="cont-info">
                      <p>{fechaCorta(c.inicio)} → {fechaCorta(c.fin)}</p>
                      <p style={{ margin: "10px 0 6px" }}><strong>{uso}</strong> de {c.equiposContratados} equipos en uso</p>
                      <Meter valor={pct} tono={pct >= 100 ? "danger" : pct >= 80 ? "warn" : "accent"} etiqueta={`Equipos en uso de ${c.nombre}`} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {vista === "clientes" && (
        <>
          {clientes.cargando && !clientes.datos && <Cargando />}
          {clientes.error && <ErrorCarga mensaje={clientes.error} onReintentar={() => void clientes.recargar()} />}
          {clientes.datos && (clientes.datos.items.length === 0 ? <Vacio>Aún no hay clientes.</Vacio> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Cliente</th><th>RUC</th><th>Contacto</th><th>Estado</th></tr></thead>
                <tbody>
                  {clientes.datos.items.map((c) => (
                    <tr key={c.clienteId} className={escribeCli ? "fila-click" : undefined} tabIndex={escribeCli ? 0 : undefined}
                      onClick={() => escribeCli && setCliente(c)} onKeyDown={(e) => { if (e.key === "Enter" && escribeCli) setCliente(c); }}>
                      <td><strong>{c.razonSocial}</strong><small className="muted" style={{ display: "block" }}>{c.clienteId}</small></td>
                      <td>{c.ruc}</td>
                      <td>{c.contacto}<small className="muted" style={{ display: "block" }}>{c.correo} · {c.telefono}</small></td>
                      <td><Badge tono={c.estado === "Activo" ? "ok" : "neutral"} dot>{c.estado}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {abierto && <FichaContrato id={abierto} onCerrar={() => router.replace("/contratos")} onCambio={alCambiar} clientes={clientes.datos?.items ?? []} />}
      {nuevo && <FormContrato clientes={clientes.datos?.items ?? []} onCerrar={() => setNuevo(false)} onGuardado={async () => { setNuevo(false); await alCambiar(); }} />}
      {cliente && <FormCliente cliente={cliente === "nuevo" ? undefined : cliente} onCerrar={() => setCliente(null)} onGuardado={async () => { setCliente(null); await alCambiar(); }} />}
    </>
  );
}

function FichaContrato({ id, clientes, onCerrar, onCambio }: { id: string; clientes: Cliente[]; onCerrar: () => void; onCambio: () => Promise<void> }) {
  const { puede } = useAuth();
  const det = useCarga(() => api<ContratoDetalle>(`/contratos/${id}`), [id]);
  const [editando, setEditando] = useState(false);
  const c = det.datos;

  return (
    <Drawer titulo={c?.nombre ?? "Contrato"} subtitulo={id} onCerrar={onCerrar} ancho={580}>
      {det.cargando && !c && <Cargando />}
      {det.error && !c && <ErrorCarga mensaje={det.error} onReintentar={() => void det.recargar()} />}
      {c && !editando && (
        <div className="stack">
          <div><Badge tono={tonoContrato(c.estado)} dot>{c.estado}</Badge></div>
          <dl className="facts">
            <div><dt>Cliente</dt><dd>{c.cliente?.razonSocial ?? c.clienteId}</dd></div>
            <div><dt>Periodo</dt><dd>{fechaCorta(c.inicio)} → {fechaCorta(c.fin)}</dd></div>
            <div><dt>Equipos</dt><dd>{c.equiposEnUso} de {c.equiposContratados} en uso</dd></div>
            <div><dt>Tarifa mensual</dt><dd>{pen(c.tarifaMensual)}</dd></div>
            <div><dt>Días para vencer</dt><dd>{c.diasParaVencer < 0 ? "Vencido" : c.diasParaVencer}</dd></div>
          </dl>
          {puede("contratos", "escribir") && <div className="barra-acciones"><button type="button" className="btn btn-secundario btn-sm" onClick={() => setEditando(true)}>Editar contrato</button></div>}

          <section aria-labelledby="h-eq">
            <h3 id="h-eq">Equipos asignados</h3>
            {c.equipos.length === 0 && <p className="muted">Ningún equipo asignado.</p>}
            <ul className="lista-hist">
              {c.equipos.map((e) => (
                <li key={e.equipoId}>
                  <div className="detail-head"><span className="type-icon"><EquipoIcono tipo={e.tipo} /></span><div><strong>{e.nombre}</strong><small className="muted" style={{ display: "block" }}>{e.equipoId} · {e.serie}</small></div></div>
                  <Badge tono={tonoEquipo(e.estado)}>{e.estado}</Badge>
                </li>
              ))}
            </ul>
          </section>

          {c.facturas && (
            <section aria-labelledby="h-fa">
              <h3 id="h-fa">Facturas</h3>
              {c.facturas.length === 0 && <p className="muted">Sin facturas.</p>}
              <ul className="lista-hist">
                {c.facturas.map((f) => (
                  <li key={f.facturaId}>
                    <div><strong>{f.facturaId}</strong><small className="muted" style={{ display: "block" }}>Vence {fechaCorta(f.vence)}</small></div>
                    <div style={{ textAlign: "right" }}><div>{pen(f.monto)}</div><Badge tono={tonoFactura(f.estadoCalculado ?? f.estado)}>{f.estadoCalculado ?? f.estado}</Badge></div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
      {c && editando && <FormContrato contrato={c} clientes={clientes} embebido onCerrar={() => setEditando(false)} onGuardado={async () => { setEditando(false); await Promise.all([det.recargar(), onCambio()]); }} />}
    </Drawer>
  );
}

function FormContrato({ contrato, clientes, onCerrar, onGuardado, embebido = false }: {
  contrato?: Contrato; clientes: Cliente[]; onCerrar: () => void; onGuardado: () => Promise<void>; embebido?: boolean;
}) {
  const aviso = useToast();
  const [f, setF] = useState({
    clienteId: contrato?.clienteId ?? clientes[0]?.clienteId ?? "", nombre: contrato?.nombre ?? "", inicio: contrato?.inicio ?? hoyISO(), fin: contrato?.fin ?? "",
    equiposContratados: String(contrato?.equiposContratados ?? ""), estado: contrato?.estado ?? "Vigente",
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null); setEnviando(true);
    const cuerpo = { ...f, equiposContratados: Number(f.equiposContratados) };
    try {
      if (contrato) await api(`/contratos/${contrato.contratoId}`, { metodo: "PATCH", cuerpo });
      else await api("/contratos", { metodo: "POST", cuerpo });
      aviso(contrato ? "Contrato actualizado." : "Contrato creado.");
      await onGuardado();
    } catch (x) { setError(mensajeDe(x)); } finally { setEnviando(false); }
  }

  const form = (
    <form className="formulario" onSubmit={(e) => void enviar(e)}>
      <Seleccion etiqueta="Cliente" requerido valor={f.clienteId} onCambio={set("clienteId")} opciones={clientes.filter((c) => c.estado === "Activo" || c.clienteId === contrato?.clienteId).map((c) => ({ valor: c.clienteId, etiqueta: c.razonSocial }))} />
      <Texto etiqueta="Nombre del contrato" requerido valor={f.nombre} onCambio={set("nombre")} maxLength={150} />
      <div className="fila-campos">
        <Texto etiqueta="Inicio" tipo="date" requerido valor={f.inicio} onCambio={set("inicio")} />
        <Texto etiqueta="Fin" tipo="date" requerido valor={f.fin} onCambio={set("fin")} />
      </div>
      <div className="fila-campos">
        <Texto etiqueta="Equipos contratados" tipo="number" min={1} requerido valor={f.equiposContratados} onCambio={set("equiposContratados")} />
        <Seleccion etiqueta="Estado" valor={f.estado} onCambio={set("estado")} opciones={["Vigente", "Renovado", "Cancelado"].map((x) => ({ valor: x, etiqueta: x }))} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="drawer-pie">
        <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button type="submit" className="btn" disabled={enviando}>{enviando ? "Guardando…" : contrato ? "Guardar cambios" : "Crear contrato"}</button>
      </div>
    </form>
  );
  return embebido ? form : <Drawer titulo="Nuevo contrato" onCerrar={onCerrar}>{form}</Drawer>;
}

function FormCliente({ cliente, onCerrar, onGuardado }: { cliente?: Cliente; onCerrar: () => void; onGuardado: () => Promise<void> }) {
  const aviso = useToast();
  const [f, setF] = useState({
    razonSocial: cliente?.razonSocial ?? "", ruc: cliente?.ruc ?? "", contacto: cliente?.contacto ?? "", correo: cliente?.correo ?? "",
    telefono: cliente?.telefono ?? "", direccion: cliente?.direccion ?? "", estado: cliente?.estado ?? "Activo",
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null); setEnviando(true);
    try {
      if (cliente) await api(`/clientes/${cliente.clienteId}`, { metodo: "PATCH", cuerpo: f });
      else await api("/clientes", { metodo: "POST", cuerpo: f });
      aviso(cliente ? "Cliente actualizado." : "Cliente creado.");
      await onGuardado();
    } catch (x) { setError(mensajeDe(x)); } finally { setEnviando(false); }
  }

  return (
    <Drawer titulo={cliente ? "Editar cliente" : "Nuevo cliente"} subtitulo={cliente?.clienteId} onCerrar={onCerrar} ancho={480}>
      <form className="formulario" onSubmit={(e) => void enviar(e)}>
        <Texto etiqueta="Razón social" requerido valor={f.razonSocial} onCambio={set("razonSocial")} maxLength={150} />
        <div className="fila-campos">
          <Texto etiqueta="RUC" requerido valor={f.ruc} onCambio={set("ruc")} ayuda="11 dígitos" maxLength={11} />
          <Seleccion etiqueta="Estado" valor={f.estado} onCambio={set("estado")} opciones={[{ valor: "Activo", etiqueta: "Activo" }, { valor: "Inactivo", etiqueta: "Inactivo" }]} />
        </div>
        <Texto etiqueta="Persona de contacto" requerido valor={f.contacto} onCambio={set("contacto")} maxLength={100} />
        <div className="fila-campos">
          <Texto etiqueta="Correo" tipo="email" requerido valor={f.correo} onCambio={set("correo")} />
          <Texto etiqueta="Teléfono" requerido valor={f.telefono} onCambio={set("telefono")} maxLength={30} />
        </div>
        <Texto etiqueta="Dirección" requerido valor={f.direccion} onCambio={set("direccion")} maxLength={200} />
        {error && <p className="error" role="alert">{error}</p>}
        <div className="drawer-pie">
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Drawer>
  );
}
