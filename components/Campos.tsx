"use client";

import { useId } from "react";
import type { ReactNode } from "react";

interface Base { etiqueta: string; ayuda?: string; requerido?: boolean; deshabilitado?: boolean }

function Envoltura({ id, etiqueta, ayuda, requerido, children }: Base & { id: string; children: ReactNode }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}{requerido && <span className="req" aria-hidden="true"> *</span>}</label>
      {children}
      {ayuda && <small id={`${id}-ayuda`}>{ayuda}</small>}
    </div>
  );
}

export function Texto({ etiqueta, ayuda, requerido, deshabilitado, valor, onCambio, tipo = "text", maxLength, placeholder, autoComplete, min }: Base & {
  valor: string | number; onCambio: (v: string) => void; tipo?: string; maxLength?: number; placeholder?: string; autoComplete?: string; min?: number;
}) {
  const id = useId();
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} requerido={requerido}>
      <input id={id} type={tipo} value={valor} onChange={(e) => onCambio(e.target.value)} required={requerido} disabled={deshabilitado}
        maxLength={maxLength} placeholder={placeholder} autoComplete={autoComplete} min={min} aria-describedby={ayuda ? `${id}-ayuda` : undefined} />
    </Envoltura>
  );
}

export function Seleccion({ etiqueta, ayuda, requerido, deshabilitado, valor, onCambio, opciones, vacio }: Base & {
  valor: string; onCambio: (v: string) => void; opciones: { valor: string; etiqueta: string }[]; vacio?: string;
}) {
  const id = useId();
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} requerido={requerido}>
      <select id={id} value={valor} onChange={(e) => onCambio(e.target.value)} required={requerido} disabled={deshabilitado}>
        {vacio !== undefined && <option value="">{vacio}</option>}
        {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
      </select>
    </Envoltura>
  );
}

export function AreaTexto({ etiqueta, ayuda, requerido, deshabilitado, valor, onCambio, filas = 4, maxLength, placeholder }: Base & {
  valor: string; onCambio: (v: string) => void; filas?: number; maxLength?: number; placeholder?: string;
}) {
  const id = useId();
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} requerido={requerido}>
      <textarea id={id} rows={filas} value={valor} onChange={(e) => onCambio(e.target.value)} required={requerido} disabled={deshabilitado}
        maxLength={maxLength} placeholder={placeholder} />
    </Envoltura>
  );
}
