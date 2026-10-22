import { api } from "./api";

/** Descarga la evidencia de un ticket (base64 desde la API) y la abre en una pestaña nueva. */
export async function abrirEvidencia(ruta: string): Promise<void> {
  const r = await api<{ nombre: string; tipo: string; base64: string }>(ruta);
  const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: r.tipo }));
  const a = document.createElement("a");
  a.href = url; a.target = "_blank"; a.rel = "noopener"; a.title = r.nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
