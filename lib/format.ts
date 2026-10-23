const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];

// Formatos manuales (sin Intl) para que el resultado sea idéntico en servidor y navegador.
export function pen(n: number): string {
  return "S/ " + Math.round(n).toLocaleString("en-US");
}
export function compacto(n: number): string {
  return n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n);
}
export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}
/** Fecha y hora de un instante ISO, en hora de Lima (UTC-5). */
export function fechaHora(iso: string): string {
  const t = new Date(new Date(iso).getTime() - 5 * 3600_000).toISOString();
  return `${fechaCorta(t)}, ${t.slice(11, 16)}`;
}
export function mesLargo(clave: string): string {
  const [y, m] = clave.split("-").map(Number);
  return `${MESES_LARGOS[m - 1]} ${y}`;
}
export function mesCorto(clave: string): string {
  return MESES[Number(clave.slice(5, 7)) - 1]!;
}
/** Hoy en Lima (AAAA-MM-DD). */
export function hoyISO(): string {
  return new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
}
export function diasHasta(iso: string): number {
  return Math.round((Date.parse(iso.slice(0, 10) + "T00:00:00Z") - Date.parse(hoyISO() + "T00:00:00Z")) / 86_400_000);
}
export function iniciales(nombre: string): string {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
export function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}
