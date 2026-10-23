"use client";

import { Printer } from "lucide-react";
import Badge from "./Badge";
import { fechaCorta, pen } from "@/lib/format";
import type { Comprobante } from "@/lib/tipos";

const nombreMetodo = { tarjeta: "Tarjeta", yape: "Yape", plin: "Plin" } as const;
const dec = (n: number) => "S/ " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Boleta o factura del cliente. Se puede imprimir o guardar como PDF desde el navegador. */
export default function ComprobanteVista({ c }: { c: Comprobante }) {
  const estado = c.estadoCalculado ?? c.estado;
  return (
    <div>
      <article className="comprobante" aria-label={`${c.tipoComprobante} ${c.facturaId}`}>
        <header>
          <div><strong>Winware S.A.C.</strong><small>Alquiler de equipos tecnológicos</small></div>
          <div className="comp-num"><b>{c.tipoComprobante === "Boleta" ? "BOLETA DE VENTA" : "FACTURA"} ELECTRÓNICA</b><span>{c.facturaId}</span></div>
        </header>
        <dl className="facts">
          <div><dt>Cliente</dt><dd>{c.receptor.nombre}</dd></div>
          <div><dt>{c.receptor.documento.length === 11 ? "RUC" : "DNI"}</dt><dd>{c.receptor.documento}</dd></div>
          <div><dt>Dirección</dt><dd>{c.receptor.direccion}</dd></div>
          <div><dt>Emitida</dt><dd>{fechaCorta(c.emitida)}</dd></div>
          <div><dt>Contrato</dt><dd>{c.contratoId}</dd></div>
        </dl>
        <table>
          <thead><tr><th>Descripción</th><th className="num">Importe</th></tr></thead>
          <tbody>
            {c.items.length ? c.items.map((i) => <tr key={i.equipoId}><td>{i.descripcion} <small className="muted">({i.equipoId})</small></td><td className="num">{dec(i.precio)}</td></tr>)
              : <tr><td>{c.concepto}</td><td className="num">{dec(c.monto)}</td></tr>}
          </tbody>
        </table>
        <p className="muted" style={{ margin: "6px 0 0" }}>{c.concepto}</p>
        <dl className="comp-totales">
          <div><dt>Subtotal</dt><dd>{dec(c.subtotal)}</dd></div>
          <div><dt>IGV (18%)</dt><dd>{dec(c.igv)}</dd></div>
          <div className="total"><dt>Total</dt><dd>{dec(c.monto)}</dd></div>
        </dl>
        <footer>
          <Badge tono={estado === "Pagada" ? "ok" : estado === "Vencida" ? "danger" : "warn"} dot>{estado}</Badge>
          {c.pagadaEl && <small>Pagado el {fechaCorta(c.pagadaEl)}{c.metodoPago ? ` con ${nombreMetodo[c.metodoPago]}` : ""}{c.detallePago ? ` (${c.detallePago})` : ""}{c.referenciaPago ? ` · Ref. ${c.referenciaPago}` : ""}</small>}
          {!c.pagadaEl && <small>Vence el {fechaCorta(c.vence)} · Total a pagar {pen(c.monto)}</small>}
        </footer>
      </article>
      <div className="drawer-pie sin-imprimir">
        <button type="button" className="btn btn-secundario" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Imprimir o guardar PDF</button>
      </div>
    </div>
  );
}
