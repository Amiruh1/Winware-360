import type { ReactNode } from "react";
import { Loader2, LockKeyhole, TriangleAlert } from "lucide-react";

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div className="estado-vacio" role="status" aria-live="polite">
      <Loader2 size={20} className="girar" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div className="estado-vacio estado-error" role="alert">
      <TriangleAlert size={20} aria-hidden="true" />
      <span>{mensaje}</span>
      {onReintentar && <button type="button" className="btn btn-sm btn-secundario" onClick={onReintentar}>Reintentar</button>}
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function SinAcceso() {
  return (
    <div className="estado-vacio" role="alert">
      <LockKeyhole size={22} aria-hidden="true" />
      <strong>No tienes acceso a esta sección</strong>
      <span>Tu rol no incluye este módulo. Si crees que es un error, pídele a un administrador que revise tu rol.</span>
    </div>
  );
}
