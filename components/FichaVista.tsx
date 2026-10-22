import Badge from "./Badge";
import type { FichaEquipo } from "@/lib/tipos";

export const lineas = (t: string): string[] => t.split("\n").map((x) => x.trim()).filter(Boolean);
export const tonoCondicion = (c: string | null) => (c === "Nuevo" || c === "Como nuevo" ? "ok" : "info") as "ok" | "info";

/** Datos del equipo: marca, modelo, condición, garantía y características. */
export default function FichaVista({ e }: { e: FichaEquipo }) {
  return (
    <div>
      <dl className="facts">
        <div><dt>Marca</dt><dd>{e.marca ?? "—"}</dd></div>
        <div><dt>Modelo</dt><dd>{e.modelo ?? "—"}</dd></div>
        <div><dt>Condición</dt><dd>{e.condicion ? <Badge tono={tonoCondicion(e.condicion)}>{e.condicion}</Badge> : "—"}</dd></div>
        <div><dt>Garantía</dt><dd>{e.garantiaMeses} meses desde el inicio del contrato</dd></div>
      </dl>
      {e.descripcion && <p style={{ marginTop: 14 }}>{e.descripcion}</p>}
      {lineas(e.caracteristicas).length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>Características</h3>
          <ul className="caract">{lineas(e.caracteristicas).map((l) => <li key={l}>{l}</li>)}</ul>
        </>
      )}
    </div>
  );
}
