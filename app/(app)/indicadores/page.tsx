"use client";

import { useState } from "react";
import { BarChart3, Clock, Gauge, ListChecks, Scale, Table2, TrendingUp, Wallet } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BarChart from "@/components/BarChart";
import { Cargando, ErrorCarga, SinAcceso } from "@/components/Estados";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { fechaHora, mesCorto, mesLargo, pen } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import type { Demanda, Indicador, Indicadores } from "@/lib/tipos";

/** Muestra el valor o "datos insuficientes": nunca se inventa un número (CU-15). */
function Valor({ i, formato }: { i: Indicador; formato?: (n: number) => string }) {
  if (i.valor === null) return <span className="ind-insuficiente">Datos insuficientes</span>;
  return <>{formato ? formato(i.valor) : `${i.valor.toLocaleString("es-PE")} ${i.unidad === "%" ? "%" : i.unidad}`}</>;
}

function Tarjeta({ icono: Icono, titulo, i, ayuda, formato }: { icono: typeof Clock; titulo: string; i: Indicador; ayuda: string; formato?: (n: number) => string }) {
  return (
    <div className="indicador">
      <div className="indicador-cab"><span className="indicador-icono aviso-info" aria-hidden="true"><Icono size={18} /></span><dt>{titulo}</dt></div>
      <dd>
        <span className="indicador-valor"><Valor i={i} formato={formato} /></span>
        <small>{ayuda}</small>
        <small>Muestra: {i.muestra}</small>
      </dd>
    </div>
  );
}

export default function PaginaIndicadores() {
  const { puede } = useAuth();
  const ind = useCarga(() => api<Indicadores>("/indicadores"), []);
  const dem = useCarga(() => api<Demanda>("/demanda"), []);
  const [modo, setModo] = useState<"grafico" | "tabla">("grafico");
  if (!puede("indicadores")) return <SinAcceso />;
  const r = ind.datos;

  return (
    <div className="inicio">
      <PageHeader titulo="Indicadores" descripcion="Desempeño de la mesa de ayuda, inversión y demanda estimada. Los tickets de prueba no se cuentan." />
      {ind.cargando && !r && <Cargando />}
      {ind.error && <ErrorCarga mensaje={ind.error} onReintentar={() => void ind.recargar()} />}
      {r && (
        <>
          <dl className="indicadores">
            <Tarjeta icono={Clock} titulo="Tiempo de respuesta" i={r.tiempoRespuesta} ayuda="Promedio desde el registro hasta que alguien lo atiende." formato={(n) => `${n.toLocaleString("es-PE")} h`} />
            <Tarjeta icono={Gauge} titulo="Cierre dentro del plazo" i={r.cierreEnPlazo}
              ayuda={`Plazos: Alta ${r.configuracion.slaHoras.Alta} h, Media ${r.configuracion.slaHoras.Media} h, Baja ${r.configuracion.slaHoras.Baja} h (a confirmar).`} />
            <Tarjeta icono={ListChecks} titulo="Trazabilidad completa" i={r.trazabilidad} ayuda="Tickets con equipo, autor y registro de cada cambio de estado." />
            <Tarjeta icono={Scale} titulo="Concordancia de la prioridad" i={r.concordancia} ayuda="Veces en que la prioridad sugerida coincidió con la que confirmó el técnico." />
          </dl>
          <p className="muted ind-nota">
            Se consideraron {r.ticketsConsiderados} tickets ({r.ticketsDePrueba} de prueba excluidos). Un indicador muestra «datos insuficientes» si tiene menos de {r.configuracion.minimo} casos.
            Calculado el {fechaHora(r.calculadoEl)}.
          </p>

          <div className="inicio-fila inicio-fila-dos">
            <section className="panel" aria-labelledby="h-inv">
              <div className="panel-cabecera">
                <h2 id="h-inv" className="titulo-icono"><Wallet size={18} aria-hidden="true" /> Cobrado por mes</h2>
                <div className="tabs segmentado" role="group" aria-label="Ver como">
                  <button type="button" aria-pressed={modo === "grafico"} onClick={() => setModo("grafico")}><BarChart3 size={14} aria-hidden="true" /> Gráfico</button>
                  <button type="button" aria-pressed={modo === "tabla"} onClick={() => setModo("tabla")}><Table2 size={14} aria-hidden="true" /> Tabla</button>
                </div>
              </div>
              {(r.cobradoMensual ?? []).length === 0 ? <p className="muted">Datos insuficientes: aún no hay facturas pagadas.</p>
                : modo === "grafico"
                  ? <BarChart titulo="Cobrado por mes" datos={(r.cobradoMensual ?? []).map((m) => ({ etiqueta: mesCorto(m.mes), valor: m.total }))} />
                  : (
                    <table>
                      <thead><tr><th>Mes</th><th className="num">Cobrado</th></tr></thead>
                      <tbody>{(r.cobradoMensual ?? []).map((m) => <tr key={m.mes}><td>{mesLargo(m.mes)}</td><td className="num">{pen(m.total)}</td></tr>)}</tbody>
                    </table>
                  )}
            </section>

            <section className="panel" aria-labelledby="h-dem">
              <h2 id="h-dem" className="titulo-icono"><TrendingUp size={18} aria-hidden="true" /> Demanda de equipos</h2>
              {dem.cargando && !dem.datos && <Cargando />}
              {dem.error && <ErrorCarga mensaje={dem.error} onReintentar={() => void dem.recargar()} />}
              {dem.datos && (
                <>
                  {dem.datos.estimacion
                    ? <p className="demanda-estimacion">Para <b>{mesLargo(dem.datos.estimacion.mes)}</b> se estiman <b>{dem.datos.estimacion.equipos} equipos</b> alquilados. <small>{dem.datos.estimacion.metodo}.</small></p>
                    : <p className="reserva-aviso">{dem.datos.nota}</p>}
                  {dem.datos.historial.length > 0 && (
                    <table>
                      <thead><tr><th>Mes</th><th className="num">Equipos alquilados</th></tr></thead>
                      <tbody>{dem.datos.historial.slice(-6).map((h) => <tr key={h.mes}><td>{mesLargo(h.mes)}</td><td className="num">{h.equipos}</td></tr>)}</tbody>
                    </table>
                  )}
                  <small className="muted">Se cuentan los equipos de cada contrato según su mes de inicio. Es una estimación simple, no un pronóstico garantizado.</small>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
