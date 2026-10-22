"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import PagoForm from "@/components/PagoForm";
import ComprobanteVista from "@/components/ComprobanteVista";
import { Cargando, ErrorCarga, SinAcceso, Vacio } from "@/components/Estados";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { fechaCorta, pen } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import { tonoFactura } from "@/lib/tonos";
import type { Comprobante, DatosPago, FacturaCliente } from "@/lib/tipos";

const METODO = { tarjeta: "Tarjeta", yape: "Yape", plin: "Plin" } as const;

export default function MisPagos() {
  const { puede } = useAuth();
  const aviso = useToast();
  const lista = useCarga(() => api<{ items: FacturaCliente[] }>("/portal/facturas"), []);
  const [id, setId] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);
  const det = useCarga(() => (id ? api<Comprobante>(`/portal/facturas/${id}`) : Promise.resolve(null)), [id]);
  if (!puede("portal")) return <SinAcceso />;
  const items = lista.datos?.items ?? [];

  async function pagar(pago: DatosPago) {
    const r = await api<{ correoEnviadoA?: string | null }>(`/portal/facturas/${id}/pagar`, { metodo: "POST", cuerpo: { pago } });
    aviso(r.correoEnviadoA ? `Pago registrado. Te enviamos el comprobante a ${r.correoEnviadoA}.` : "Pago registrado."); setPagando(false);
    await Promise.all([lista.recargar(), det.recargar()]);
  }

  return (
    <>
      <PageHeader titulo="Mis pagos" descripcion="Tus boletas y facturas. Puedes verlas, imprimirlas o guardarlas en PDF." />
      {lista.cargando && !lista.datos && <Cargando />}
      {lista.error && <ErrorCarga mensaje={lista.error} onReintentar={() => void lista.recargar()} />}
      {lista.datos && items.length === 0 && <Vacio>Aún no tienes comprobantes.</Vacio>}
      {items.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Comprobante</th><th>Emitido</th><th>Contrato</th><th className="num">Monto</th><th>Pago</th><th>Estado</th></tr></thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.facturaId}>
                  <td><button type="button" className="row-link" onClick={() => { setId(f.facturaId); setPagando(false); }}><b>{f.facturaId}</b> <span className="muted">{f.tipoComprobante}</span></button></td>
                  <td>{fechaCorta(f.emitida)}</td><td>{f.contratoId}</td><td className="num">{pen(f.monto)}</td>
                  <td>{f.metodoPago ? METODO[f.metodoPago] : "—"}</td>
                  <td><Badge tono={tonoFactura(f.estadoCalculado)} dot>{f.estadoCalculado}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {id && (
        <Drawer titulo={`Comprobante ${id}`} onCerrar={() => { setId(null); setPagando(false); }} ancho={600}>
          {det.cargando && !det.datos && <Cargando />}
          {det.error && <ErrorCarga mensaje={det.error} />}
          {det.datos && !pagando && (
            <>
              <ComprobanteVista c={det.datos} />
              {det.datos.estado === "Pendiente" && <div className="drawer-pie"><button type="button" className="btn" onClick={() => setPagando(true)}>Pagar {pen(det.datos.monto)}</button></div>}
            </>
          )}
          {det.datos && pagando && <PagoForm monto={det.datos.monto} textoBoton="Pagar" onPagar={pagar} onCancelar={() => setPagando(false)} />}
        </Drawer>
      )}
    </>
  );
}
