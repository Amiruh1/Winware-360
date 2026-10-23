"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export default function Drawer({ titulo, subtitulo, onCerrar, children, ancho = 520 }: {
  titulo: string; subtitulo?: string; onCerrar: () => void; children: ReactNode; ancho?: number;
}) {
  const panel = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const alTeclado = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", alTeclado);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclado);
      document.body.style.overflow = overflow;
      previo?.focus?.();
    };
  }, [onCerrar]);

  return (
    <div className="drawer-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <aside ref={panel} className="drawer" style={{ maxWidth: ancho }} role="dialog" aria-modal="true" aria-label={titulo} tabIndex={-1}>
        <header className="drawer-cab">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <small>{subtitulo}</small>}
          </div>
          <button type="button" className="icono-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="drawer-cuerpo">{children}</div>
      </aside>
    </div>
  );
}
