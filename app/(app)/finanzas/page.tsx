"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import { Cargando, ErrorCarga, SinAcceso, Vacio } from "@/components/Estados";
import { Seleccion, Texto } from "@/components/Campos";
import { useToast } from "@/components/Toast";
import { useContadores } from "@/components/Contadores";
import { useAuth } from "@/lib/auth";
import { api, mensajeDe } from "@/lib/api";
import { fechaCorta, hoyISO, pen } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import { tonoFactura } from "@/lib/tonos";
import type { Contrato, Factura } from "@/lib/tipos";

export default function Finanzas() {
  const { puede } = useAuth();
  const { refrescar } = useContadores();
  const aviso = useToast();
  const [filtro, setFiltro] = useState<"" | "Pendiente" | "Vencida" | "Pagada">("");
  const [nueva, setNueva] = useState(false);
  const facturas = useCarga(() => api<{ items: Factura[] }>("/facturas"), []);
  const contratos = useCarga(() => api<{ items: Contrato[] }>("/contratos"), []);

  const fs = useMemo(() => [...(facturas.datos?.items ?? [])].sort((a, b) => b.vence.localeCompare(a.vence)), [facturas.datos]);
  const visibles = fs.filter((f) => !filtro || (f.estadoCalculado ?? f.estado) === filtro);
  const tot = useMemo(() => {
    const suma = (e: string) => fs.filter((f) => (f.estadoCalculado ?? f.estado) === e).reduce((s, f) => s + f.monto, 0);
    return { pendiente: suma("Pendiente"), vencida: suma("Vencida"), pagada: suma("Pagada") };
  }, [fs]);

  if (!puede("finanzas")) return <SinAcceso />;
  const escribe = puede("finanzas", "escribir");
  const alCambiar = async () => { await Promise.all([facturas.recargar(), refrescar()]); };

  async function marcarPagada(f: Factura) {
    try {
      await api(`/facturas/${f.facturaId}`, { metodo: "PATCH", cuerpo: { estado: "Pagada" } });
      aviso(`Factura ${f.facturaId} marcada como pagada.`);
      await alCambiar();
    } catch (x) { aviso(mensajeDe(x), "error"); }
  }

  return (
    <>
      <PageHeader titulo="Finanzas" descripcion="Cobros a los clientes.">
        {escribe && <button type="button" className="btn" onClick={() => setNueva(true)}><Plus size={16} aria-hidden="true" /> Nueva factura</button>}
      </PageHeader>

      <dl className="kpis" style={{ marginTop: 0 }}>
        <div><dt>Por cobrar</dt><dd>{pen(tot.pendiente)}</dd></div>
        <div className={tot.vencida ? "kpi-alert" : undefined}><dt>Vencido</dt><dd>{pen(tot.vencida)}</dd></div>
        <div><dt>Cobrado</dt><dd>{pen(tot.pagada)}</dd></div>
      </dl>

      <div className="toolbar" style={{ marginTop: 18 }}>
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

      {nueva && <FormFactura contratos={contratos.datos?.items ?? []} onCerrar={() => setNueva(false)} onGuardado={async () => { setNueva(false); await alCambiar(); }} />}
    </>
  );
}

function FormFactura({ contratos, onCerrar, onGuardado }: { contratos: Contrato[]; onCerrar: () => void; onGuardado: () => Promise<void> }) {
  const aviso = useToast();
  const [f, setF] = useState({ contratoId: contratos.find((c) => c.estado === "Vigente")?.contratoId ?? "", emitida: hoyISO(), vence: "", monto: "" });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const sugerido = contratos.find((c) => c.contratoId === f.contratoId)?.tarifaMensual;
  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null); setEnviando(true);
    try { await api("/facturas", { metodo: "POST", cuerpo: { ...f, monto: Number(f.monto) } }); aviso("Factura creada."); await onGuardado(); }
    catch (x) { setError(mensajeDe(x)); } finally { setEnviando(false); }
  }
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
        <div className="drawer-pie">
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn" disabled={enviando}>{enviando ? "Guardando…" : "Crear factura"}</button>
        </div>
      </form>
    </Drawer>
  );
}
