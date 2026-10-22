"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { api, mensajeDe } from "@/lib/api";
import type { RespuestaAsistente } from "@/lib/tipos";

const SUGERENCIAS = ["¿Qué características tiene?", "¿En qué condición está?", "¿Qué garantía incluye?"];

/** Pregúntale a la IA sobre un equipo: responde solo con los datos de su ficha. */
export default function AsistenteIA({ equipoId }: { equipoId: string }) {
  const [pregunta, setPregunta] = useState("");
  const [r, setR] = useState<RespuestaAsistente | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function preguntar(texto?: string) {
    setError(null); setCargando(true);
    try { setR(await api<RespuestaAsistente>(`/asistente/equipos/${equipoId}`, { metodo: "POST", cuerpo: texto ? { pregunta: texto } : {} })); }
    catch (e) { setError(mensajeDe(e)); } finally { setCargando(false); }
  }
  const enviar = (ev: FormEvent) => { ev.preventDefault(); if (pregunta.trim()) void preguntar(pregunta.trim()); };

  return (
    <section className="asistente" aria-labelledby={`h-ia-${equipoId}`}>
      <h3 id={`h-ia-${equipoId}`}><Sparkles size={16} aria-hidden="true" /> Pregúntale a la IA</h3>
      <div className="chips">
        <button type="button" className="chip" disabled={cargando} onClick={() => void preguntar()}>Explícame este equipo</button>
        {SUGERENCIAS.map((s) => <button key={s} type="button" className="chip" disabled={cargando} onClick={() => { setPregunta(s); void preguntar(s); }}>{s}</button>)}
      </div>
      <form className="asistente-form" onSubmit={enviar}>
        <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} maxLength={300} placeholder="Escribe tu pregunta sobre este equipo" aria-label="Tu pregunta" />
        <button type="submit" className="btn btn-sm" disabled={cargando || !pregunta.trim()}>Preguntar</button>
      </form>
      {cargando && <p className="muted" role="status">Pensando…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {r && !cargando && (
        <div className="asistente-resp" role="status">
          <p style={{ whiteSpace: "pre-line", margin: 0 }}>{r.respuesta}</p>
          <small className="muted">{r.metodo === "bedrock" ? "Respuesta de la IA, basada en la ficha del equipo." : "Respuesta automática basada en la ficha del equipo."}{r.aviso ? ` ${r.aviso}` : ""}</small>
        </div>
      )}
    </section>
  );
}
