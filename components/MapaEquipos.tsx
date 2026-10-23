import type { CSSProperties } from "react";
import Link from "next/link";
import EquipoIcono from "./EquipoIcono";
import type { Equipo, EstadoEquipo } from "@/lib/tipos";

const grupos: { estado: EstadoEquipo; titulo: string }[] = [
  { estado: "Disponible", titulo: "Disponibles" },
  { estado: "Alquilado", titulo: "Alquilados" },
  { estado: "En mantenimiento", titulo: "En mantenimiento" },
  { estado: "Reservado", titulo: "Reservados (pago pendiente)" },
];

// El LED indica atención: verde = sin problemas, ámbar = en mantenimiento, rojo = tiene una incidencia abierta.
function tonoLed(e: Equipo): "ok" | "warn" | "danger" {
  if ((e.incidenciasAbiertas ?? 0) > 0) return "danger";
  return e.estado === "En mantenimiento" ? "warn" : "ok";
}

export default function MapaEquipos({ equipos }: { equipos: Equipo[] }) {
  let orden = 0;
  return (
    <div>
      <div className="rackmap">
        {grupos.map(({ estado, titulo }) => {
          const lista = equipos.filter((e) => e.estado === estado);
          if (estado === "Reservado" && lista.length === 0) return null;   // solo aparece cuando hay reservas
          const incid = lista.filter((e) => (e.incidenciasAbiertas ?? 0) > 0).length;
          return (
            <section key={estado} className="rack" aria-label={titulo}>
              <header>
                <h3>{titulo}</h3>
                <span>{lista.length} {lista.length === 1 ? "equipo" : "equipos"}{incid ? `, ${incid} con incidencia` : ""}</span>
              </header>
              <ul>
                {lista.length === 0 && <li><span className="slot-sub" style={{ padding: "6px 8px", display: "block" }}>Sin equipos</span></li>}
                {lista.map((e) => {
                  const tono = tonoLed(e);
                  const i = orden++;
                  return (
                    <li key={e.equipoId}>
                      <Link href={`/inventario?equipo=${e.equipoId}`} className={`slot slot-${tono}`} style={{ "--i": i } as CSSProperties}
                        aria-label={`${e.nombre}, ${e.estado}${tono === "danger" ? ", con incidencia" : ""}`}>
                        <i className={`led led-${tono}`} aria-hidden="true" />
                        <span>
                          <b className="slot-name">{e.nombre}</b>
                          <small className="slot-sub">{tono === "danger" ? "Incidencia abierta" : e.contratoId ?? e.tipo}</small>
                        </span>
                        <EquipoIcono tipo={e.tipo} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      <ul className="rack-legend">
        <li><i className="led led-ok" aria-hidden="true" />Sin problemas</li>
        <li><i className="led led-warn" aria-hidden="true" />En mantenimiento</li>
        <li><i className="led led-danger" aria-hidden="true" />Incidencia abierta</li>
      </ul>
    </div>
  );
}
