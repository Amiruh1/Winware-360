import { Laptop, Monitor, Network, Printer, Server } from "lucide-react";
import type { TipoEquipo } from "@/lib/tipos";

const iconos = { Laptop, Impresora: Printer, Servidor: Server, Red: Network, Monitor };

export default function EquipoIcono({ tipo, size = 16 }: { tipo: TipoEquipo; size?: number }) {
  const Icono = iconos[tipo] ?? Laptop;
  return <Icono size={size} aria-hidden="true" />;
}
