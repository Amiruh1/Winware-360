import type { Tono } from "@/components/Badge";
import { diasHasta } from "./format";
import type { Alerta, Contrato, EstadoEquipo, Factura, Prioridad, EstadoTicket } from "./tipos";

export const tonoEquipo = (e: EstadoEquipo): Tono => (e === "Disponible" ? "ok" : e === "Alquilado" ? "info" : "warn");
export const tonoPrioridad = (p: Prioridad): Tono => (p === "Alta" ? "danger" : p === "Media" ? "warn" : "neutral");
export const tonoTicket = (e: EstadoTicket): Tono => (e === "Abierto" ? "warn" : e === "En atención" ? "info" : "ok");
export const tonoFactura = (e: NonNullable<Factura["estadoCalculado"]>): Tono => (e === "Vencida" ? "danger" : e === "Pagada" ? "ok" : "warn");
export const tonoContrato = (e: Contrato["estado"]): Tono => (e === "Vigente" ? "ok" : e === "Renovado" ? "info" : e === "Pendiente de pago" ? "warn" : "neutral");
export const tonoAlerta = (s: Alerta["severidad"]): "danger" | "warn" | "info" => (s === "Alta" ? "danger" : s === "Media" ? "warn" : "info");

/** Etiqueta de vencimiento de garantía: null si falta mucho. */
export function garantia(iso: string): { texto: string; tono: Tono } | null {
  const d = diasHasta(iso);
  if (d < 0) return { texto: "Garantía vencida", tono: "danger" };
  if (d <= 30) return { texto: `Garantía vence en ${d} días`, tono: "warn" };
  return null;
}
