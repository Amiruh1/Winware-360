"use client";

import { useId, useState } from "react";
import { Paperclip, X } from "lucide-react";
import type { EvidenciaNueva } from "@/lib/tipos";

const TIPOS = ["image/png", "image/jpeg", "application/pdf"];
const MAX = 2 * 1024 * 1024;

/** Adjuntar evidencia opcional a un ticket (CU-10): PNG, JPG o PDF de hasta 2 MB. El servidor vuelve a validar el contenido. */
export default function CampoEvidencia({ valor, onCambio }: { valor: EvidenciaNueva | null; onCambio: (e: EvidenciaNueva | null) => void }) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  function elegir(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!TIPOS.includes(f.type)) { setError("Solo se permiten imágenes PNG o JPG, o un PDF."); return; }
    if (f.size > MAX) { setError("El archivo pesa más de 2 MB."); return; }
    const lector = new FileReader();
    lector.onload = () => onCambio({ nombre: f.name, tipo: f.type, base64: String(lector.result).split(",")[1] ?? "" });
    lector.onerror = () => setError("No se pudo leer el archivo.");
    lector.readAsDataURL(f);
  }

  return (
    <div className="campo">
      <label htmlFor={id}>Evidencia (opcional)</label>
      {valor ? (
        <div className="evidencia-elegida">
          <Paperclip size={15} aria-hidden="true" /> <span>{valor.nombre}</span>
          <button type="button" className="icono-btn" aria-label="Quitar evidencia" onClick={() => onCambio(null)}><X size={14} aria-hidden="true" /></button>
        </div>
      ) : (
        <input id={id} type="file" accept={TIPOS.join(",")} onChange={(e) => elegir(e.target.files?.[0])} />
      )}
      <small>Foto o PDF del problema, de hasta 2 MB.</small>
      {error && <small className="error" role="alert">{error}</small>}
    </div>
  );
}
