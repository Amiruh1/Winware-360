"use client";

import { useState } from "react";
import { compacto, pen } from "@/lib/format";

export type Dato = { etiqueta: string; valor: number };

const W = 560, H = 240, ML = 44, MR = 8, MT = 24, MB = 30;
const RADIO = 4;

function barra(x: number, y: number, w: number, base: number) {
  const h = base - y;
  const r = Math.min(RADIO, h);
  return `M${x},${base} V${y + r} a${r},${r} 0 0 1 ${r},${-r} H${x + w - r} a${r},${r} 0 0 1 ${r},${r} V${base} Z`;
}

export default function BarChart({ datos, titulo, unidad = "soles" }: { datos: Dato[]; titulo: string; unidad?: string }) {
  const [activo, setActivo] = useState<number | null>(null);

  const maxDato = Math.max(1, ...datos.map((d) => d.valor));
  const paso = maxDato > 10000 ? 5000 : 1000;
  const tope = Math.ceil(maxDato / paso) * paso;
  const ticks: number[] = [];
  for (let t = 0; t <= tope; t += paso) ticks.push(t);

  const base = H - MB;
  const area = base - MT;
  const banda = (W - ML - MR) / datos.length;
  const ancho = Math.min(24, banda * 0.55);
  const yDe = (v: number) => base - (v / tope) * area;

  const ultimo = datos.length - 1;
  const idxMax = datos.reduce((m, d, i) => (d.valor > datos[m].valor ? i : m), 0);
  const etiquetados = new Set([ultimo, idxMax]);

  const cx = (i: number) => ML + banda * i + banda / 2;
  const sel = activo === null ? null : datos[activo];

  return (
    <figure className="chartbox">
      <figcaption>{titulo}</figcaption>
      <div className="chart-frame">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="group" aria-label={`${titulo}, en ${unidad}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={ML} x2={W - MR} y1={yDe(t)} y2={yDe(t)} className={t === 0 ? "ch-base" : "ch-grid"} />
              <text x={ML - 8} y={yDe(t) + 4} textAnchor="end" className="ch-tick">{compacto(t)}</text>
            </g>
          ))}
          {datos.map((d, i) => {
            const x = cx(i) - ancho / 2;
            const y = yDe(d.valor);
            const resaltada = i === ultimo;
            return (
              <g key={d.etiqueta}>
                <path d={barra(x, y, ancho, base)} className={resaltada ? "ch-bar ch-bar-now" : "ch-bar"} style={{ opacity: activo === null || activo === i ? 1 : 0.55 }} />
                {etiquetados.has(i) && (
                  <text x={cx(i)} y={y - 7} textAnchor="middle" className="ch-value">{compacto(d.valor)}</text>
                )}
                <text x={cx(i)} y={H - 10} textAnchor="middle" className="ch-tick">{d.etiqueta}</text>
                <rect
                  x={ML + banda * i}
                  y={MT - 8}
                  width={banda}
                  height={area + 8}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.etiqueta}: ${pen(d.valor)}`}
                  onPointerEnter={() => setActivo(i)}
                  onPointerMove={() => setActivo(i)}
                  onPointerLeave={() => setActivo(null)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                />
              </g>
            );
          })}
        </svg>
        {sel && activo !== null && (
          <div className="tooltip" style={{ left: `${(cx(activo) / W) * 100}%`, top: `${(yDe(sel.valor) / H) * 100}%` }} role="status">
            <strong>{pen(sel.valor)}</strong>
            <span>{sel.etiqueta}</span>
          </div>
        )}
      </div>
      <details className="chart-table">
        <summary>Ver como tabla</summary>
        <table>
          <thead><tr><th>Mes</th><th className="num">Monto</th></tr></thead>
          <tbody>
            {datos.map((d) => (
              <tr key={d.etiqueta}><td>{d.etiqueta}</td><td className="num">{pen(d.valor)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
