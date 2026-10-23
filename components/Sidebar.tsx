"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, CreditCard, FileText, LayoutGrid, LifeBuoy, Users, Wallet } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "@/lib/auth";
import { useContadores } from "./Contadores";
import type { Recurso } from "@/lib/tipos";

const items: { href: string; label: string; icon: typeof Boxes; recurso: Recurso }[] = [
  { href: "/", label: "Resumen", icon: LayoutGrid, recurso: "resumen" },
  { href: "/inventario", label: "Inventario", icon: Boxes, recurso: "equipos" },
  { href: "/mesa-de-ayuda", label: "Mesa de ayuda", icon: LifeBuoy, recurso: "tickets" },
  { href: "/contratos", label: "Contratos", icon: FileText, recurso: "contratos" },
  { href: "/finanzas", label: "Finanzas", icon: Wallet, recurso: "finanzas" },  { href: "/usuarios", label: "Usuarios", icon: Users, recurso: "usuarios" },
];

const itemsCliente: { href: string; label: string; icon: typeof Boxes }[] = [
  { href: "/catalogo", label: "Catálogo", icon: LayoutGrid },
  { href: "/mis-equipos", label: "Mis equipos", icon: Boxes },
  { href: "/mis-contratos", label: "Mis contratos", icon: FileText },
  { href: "/mis-pagos", label: "Mis pagos", icon: CreditCard },
  { href: "/soporte", label: "Soporte", icon: LifeBuoy },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { puede, me } = useAuth();
  const esCliente = me?.rol === "Cliente";
  const { resumen } = useContadores();
  const badges: Record<string, number> = resumen ? {
    "/mesa-de-ayuda": resumen.tickets.abiertos + resumen.tickets.enAtencion,
    "/finanzas": resumen.finanzas?.vencidasCantidad ?? 0,
    "/contratos": resumen.contratos?.porVencer.length ?? 0,
  } : {};

  return (
    <aside className="sidebar">
      <Link href={esCliente ? "/catalogo" : "/"} className="brand" aria-label="Winware 360, ir al inicio">
        <Logo />
        <span>Winware 360</span>
      </Link>
      <nav className="nav" aria-label="Principal">
        {(esCliente ? itemsCliente : items.filter((i) => puede(i.recurso, "leer"))).map(({ href, label, icon: Icon }) => {
          const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const n = badges[href] ?? 0;
          return (
            <Link key={href} href={href} className={activo ? "active" : undefined} aria-current={activo ? "page" : undefined}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              {n > 0 && <b className="count" aria-label={`${n} pendientes`}>{n}</b>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
