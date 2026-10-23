import { Sparkles } from "lucide-react";
import type { OrigenIA } from "@/lib/tipos";

/** Indica de dónde salió una respuesta (IA o reglas) y recuerda que una persona la revisa (Ley N.° 31814). */
export default function NotaIA({ r, revisar = true }: { r: OrigenIA; revisar?: boolean }) {
  return (
    <small className="nota-ia">
      <Sparkles size={12} aria-hidden="true" />
      {r.metodo === "bedrock" ? "Generado por IA" : "Generado con reglas automáticas"}
      {revisar ? ". Revísalo antes de usarlo." : "."}
      {r.aviso ? ` ${r.aviso}` : ""}
    </small>
  );
}
