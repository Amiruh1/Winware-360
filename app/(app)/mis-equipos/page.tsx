"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck, Wrench } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import EquipoImagen from "@/components/EquipoImagen";
import FichaVista, { tonoCondicion } from "@/components/FichaVista";
import AsistenteIA from "@/components/AsistenteIA";
import { Cargando, ErrorCarga, SinAcceso, Vacio } from "@/components/Estados";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { fechaCorta } from "@/lib/format";
import { useCarga } from "@/lib/hooks";
import type { EquipoCliente } from "@/lib/tipos";

export default function MisEquipos() {
  const { puede } = useAuth();
  const router = useRouter();
  const lista = useCarga(() => api<{ items: EquipoCliente[] }>("/portal/equipos"), []);
  const [sel, setSel] = useState<EquipoCliente | null>(null);
  if (!puede("portal")) return <SinAcceso />;
  const items = lista.datos?.items ?? [];

  return (
    <>
      <PageHeader titulo="Mis equipos" descripcion="Los equipos que tienes alquilados, con su garantía, modelo y condición." />
      {lista.cargando && !lista.datos && <Cargando />}
      {lista.error && <ErrorCarga mensaje={lista.error} onReintentar={() => void lista.recargar()} />}
      {lista.datos && items.length === 0 && <Vacio>Aún no tienes equipos alquilados. Revisa el <a href="/catalogo/">catálogo</a>.</Vacio>}
      <ul className="catalogo catalogo-simple">
        {items.map((e) => (
          <li key={e.equipoId} className="producto">
            <div className="producto-top"><EquipoImagen tipo={e.tipo} nombre={e.nombre} url={e.imagenUrl} />
              <Badge tono={e.garantia.vigente ? "ok" : "danger"} dot>{e.garantia.vigente ? "Garantía vigente" : "Garantía vencida"}</Badge></div>
            <h2>{e.nombre}</h2>
            <p className="muted">{[e.marca, e.modelo].filter(Boolean).join(" · ") || e.tipo}</p>
            <dl className="facts">
              <div><dt>Condición</dt><dd>{e.condicion ?? "—"}</dd></div>
              <div><dt>Garantía hasta</dt><dd>{fechaCorta(e.garantia.hasta)}</dd></div>
              <div><dt>Contrato</dt><dd>{e.contratoId}</dd></div>
            </dl>
            {e.incidenciasAbiertas > 0 && <p><Badge tono="warn">{e.incidenciasAbiertas} {e.incidenciasAbiertas === 1 ? "reporte abierto" : "reportes abiertos"}</Badge></p>}
            <div className="producto-acc">
              <button type="button" className="btn btn-sm btn-secundario" onClick={() => setSel(e)}>Ver ficha e IA</button>
              <button type="button" className="btn btn-sm" onClick={() => router.push(`/soporte?equipo=${e.equipoId}`)}><Wrench size={15} aria-hidden="true" /> Reportar problema</button>
            </div>
          </li>
        ))}
      </ul>

      {sel && (
        <Drawer titulo={sel.nombre} subtitulo={`${sel.equipoId} · serie ${sel.serie}`} onCerrar={() => setSel(null)}>
          <p><Badge tono={sel.garantia.vigente ? "ok" : "danger"} dot><ShieldCheck size={13} aria-hidden="true" /> {sel.garantia.vigente ? `Garantía vigente hasta el ${fechaCorta(sel.garantia.hasta)}` : `Garantía vencida el ${fechaCorta(sel.garantia.hasta)}`}</Badge></p>
          <EquipoImagen tipo={sel.tipo} nombre={sel.nombre} url={sel.imagenUrl} variante="ficha" />
          <FichaVista e={sel} />
          <dl className="facts">
            <div><dt>Estado de la garantía</dt><dd>{sel.garantia.meses} meses desde el {fechaCorta(sel.garantia.desde)}</dd></div>
            <div><dt>Alquiler hasta</dt><dd>{fechaCorta(sel.contratoFin)}</dd></div>
            <div><dt>Condición actual</dt><dd>{sel.condicion ? <Badge tono={tonoCondicion(sel.condicion)}>{sel.condicion}</Badge> : "—"}</dd></div>
          </dl>
          <h3 style={{ marginTop: 16 }}>Mantenimientos recientes</h3>
          {sel.mantenimientos.length === 0 ? <p className="muted">Sin mantenimientos registrados.</p> : (
            <ul className="recent">{sel.mantenimientos.map((m, i) => <li key={i}><span>{m.tipo}</span><span className="muted">{fechaCorta(m.fecha)} · {m.estado}</span></li>)}</ul>
          )}
          <AsistenteIA equipoId={sel.equipoId} />
        </Drawer>
      )}
    </>
  );
}
