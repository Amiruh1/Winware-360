"use client";

import { useEffect, useState } from "react";
import type { TipoEquipo } from "@/lib/tipos";

const L = { stroke: "#1c2b3a", strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Ilustración genérica por tipo de equipo, para cuando todavía no hay foto. */
function Ilustracion({ tipo }: { tipo: TipoEquipo }) {
  switch (tipo) {
    case "Laptop": return (<><rect x="62" y="34" width="116" height="76" rx="6" fill="#dbe6fb" {...L} /><rect x="72" y="44" width="96" height="56" rx="2" fill="#fff" {...L} /><path d="M40 118h160l-10 16H50z" fill="#b9c9f2" {...L} /></>);
    case "Impresora": return (<><rect x="78" y="30" width="84" height="34" rx="3" fill="#fff" {...L} /><rect x="48" y="62" width="144" height="58" rx="8" fill="#dbe6fb" {...L} /><rect x="76" y="100" width="88" height="32" rx="3" fill="#fff" {...L} /><circle cx="174" cy="78" r="4" fill="#2fd58f" /></>);
    case "Monitor": return (<><rect x="38" y="30" width="164" height="86" rx="6" fill="#dbe6fb" {...L} /><rect x="48" y="40" width="144" height="66" rx="2" fill="#fff" {...L} /><path d="M108 116l-6 16h36l-6-16" fill="#b9c9f2" {...L} /><path d="M88 134h64" {...L} /></>);
    case "Servidor": return (<>{[30, 64, 98].map((y) => (<g key={y}><rect x="56" y={y} width="128" height="28" rx="4" fill="#dbe6fb" {...L} /><circle cx="76" cy={y + 14} r="4" fill="#2fd58f" /><path d={`M100 ${y + 14}h64`} {...L} /></g>))}</>);
    default: return (<><rect x="44" y="76" width="152" height="40" rx="6" fill="#dbe6fb" {...L} />{[66, 92, 118, 144, 170].map((x) => <circle key={x} cx={x} cy="96" r="5" fill="#fff" {...L} />)}<path d="M80 76 60 44M160 76l20-32" {...L} /></>);
  }
}

/** Foto del equipo (enlace https). Si no hay o no carga, muestra la ilustración de su tipo. */
export default function EquipoImagen({ tipo, nombre, url, variante = "tarjeta" }: { tipo: TipoEquipo; nombre: string; url?: string | null; variante?: "tarjeta" | "ficha" | "mini" }) {
  const [fallo, setFallo] = useState(false);
  useEffect(() => setFallo(false), [url]);
  const hayFoto = !!url && !fallo;
  return (
    <div className={`equipo-img equipo-img-${variante}`}>
      {hayFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url!} alt={nombre} loading="lazy" referrerPolicy="no-referrer" onError={() => setFallo(true)} />
      ) : (
        <svg viewBox="0 0 240 160" role="img" aria-label={`${tipo} (ilustración)`}><Ilustracion tipo={tipo} /></svg>
      )}
    </div>
  );
}
