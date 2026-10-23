"use client";

import { Printer } from "lucide-react";
import { Cargando, ErrorCarga } from "./Estados";
import { api } from "@/lib/api";
import { fechaCorta, pen, plural } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import type { ContratoClienteDetalle, DatosClienteContrato } from "@/lib/tipos";

/** Meses entre dos fechas AAAA-MM-DD (para contratos antiguos que no guardaron la duración). */
export function mesesEntre(inicio: string, fin: string): number {
  const [y1, m1, d1] = inicio.split("-").map(Number);
  const [y2, m2, d2] = fin.split("-").map(Number);
  return Math.max(1, (y2! - y1!) * 12 + (m2! - m1!) - (d2! < d1! ? 1 : 0));
}

/** Contrato de alquiler en formato de documento. Se puede imprimir o guardar como PDF desde el navegador. */
export default function ContratoVista({ c }: { c: ContratoClienteDetalle }) {
  // Si el detalle no trae los datos del cliente, se toman del perfil de la cuenta.
  const perfil = useCarga(() => (c.cliente ? Promise.resolve(null) : api<{ correo: string; cliente: DatosClienteContrato | null }>("/portal/perfil")), [c.contratoId, !!c.cliente]);
  const cliente: DatosClienteContrato | null = c.cliente ?? (perfil.datos?.cliente ? { ...perfil.datos.cliente, correo: perfil.datos.cliente.correo ?? perfil.datos.correo } : null);
  if (!cliente) return perfil.error ? <ErrorCarga mensaje={perfil.error} onReintentar={() => void perfil.recargar()} /> : <Cargando />;
  const meses = c.meses ?? mesesEntre(c.inicio, c.fin);
  const esRuc = String(cliente.ruc ?? "").length === 11;
  return (
    <div>
      <article className="doc-contrato" aria-label={`Contrato ${c.contratoId}`}>
        <header>
          <div><strong>Winware S.A.C.</strong><small>Alquiler de equipos tecnológicos</small></div>
          <div className="comp-num"><b>CONTRATO DE ALQUILER</b><span>{c.contratoId}</span></div>
        </header>

        <section>
          <h4>Partes</h4>
          <div className="doc-partes">
            <div><span>El arrendador</span><b>Winware S.A.C.</b><small>Alquiler de equipos tecnológicos</small></div>
            <div><span>El cliente</span><b>{cliente.razonSocial}</b>
              <small>{esRuc ? "RUC" : "DNI"} {cliente.ruc}</small>
              {cliente.direccion && <small>{cliente.direccion}</small>}
              <small>{[cliente.correo, cliente.telefono].filter(Boolean).join(" · ")}</small>
            </div>
          </div>
        </section>

        <section>
          <h4>Condiciones</h4>
          <dl className="doc-condiciones">
            <div><dt>Inicio</dt><dd>{fechaCorta(c.inicio)}</dd></div>
            <div><dt>Fin</dt><dd>{fechaCorta(c.fin)}</dd></div>
            <div><dt>Duración</dt><dd>{plural(meses, "mes", "meses")}</dd></div>
            <div><dt>Cuota mensual</dt><dd>{pen(c.tarifaMensual)}</dd></div>
            <div><dt>Total del contrato</dt><dd>{pen(c.tarifaMensual * meses)}</dd></div>
            <div><dt>Estado</dt><dd>{c.estado}</dd></div>
          </dl>
        </section>

        <section>
          <h4>Equipos alquilados</h4>
          <table>
            <thead><tr><th>Código</th><th>Equipo</th><th>Serie</th><th>Garantía hasta</th><th className="num">Cuota</th></tr></thead>
            <tbody>
              {c.equipos.map((e) => (
                <tr key={e.equipoId}>
                  <td>{e.equipoId}</td>
                  <td>{e.nombre}<small>{[e.marca, e.modelo].filter(Boolean).join(" ")}</small></td>
                  <td>{e.serie || "—"}</td>
                  <td>{fechaCorta(e.garantia.hasta)}</td>
                  <td className="num">{pen(e.tarifaMensual)}</td>
                </tr>
              ))}
              {c.equipos.length === 0 && <tr><td colSpan={5} className="muted">Este contrato ya no tiene equipos en uso.</td></tr>}
            </tbody>
          </table>
        </section>

        <section>
          <h4>Cláusulas</h4>
          <ol className="doc-clausulas">
            <li><b>Objeto.</b> Winware entrega al cliente en alquiler los equipos detallados, en buen estado de funcionamiento.</li>
            <li><b>Plazo.</b> El alquiler rige del {fechaCorta(c.inicio)} al {fechaCorta(c.fin)} ({plural(meses, "mes", "meses")}) y puede renovarse de común acuerdo.</li>
            <li><b>Pago.</b> El cliente paga {pen(c.tarifaMensual)} al mes, IGV incluido. El primer mes se paga al contratar y los siguientes se facturan mes a mes.</li>
            <li><b>Garantía y soporte.</b> Cada equipo tiene la garantía indicada, contada desde el inicio del contrato. Las fallas se reportan desde la sección Soporte del portal.</li>
            <li><b>Uso y cuidado.</b> El cliente usa los equipos para su actividad, los cuida y no los traslada a terceros sin autorización de Winware.</li>
            <li><b>Devolución.</b> Al terminar el contrato, el cliente devuelve los equipos en el estado en que los recibió, salvo el desgaste normal por uso.</li>
          </ol>
        </section>

        <footer>
          <small>{c.origen === "Portal" ? `Aceptado en línea por ${cliente.razonSocial} el ${fechaCorta(c.inicio)} desde el portal de Winware.` : `Contrato registrado por Winware el ${fechaCorta(c.inicio)}.`}</small>
        </footer>
      </article>
      <div className="drawer-pie sin-imprimir">
        <button type="button" className="btn btn-secundario" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Imprimir o guardar PDF</button>
      </div>
    </div>
  );
}
