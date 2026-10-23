import { config } from "./config";
import { guardarSesion, obtenerToken } from "./sesion";

export class ApiError extends Error {
  status: number;
  detalle: string[];
  /** Detalle estructurado que devuelve la API (por ejemplo, el pedido pendiente tras un pago rechazado). */
  datos?: any;
  constructor(status: number, mensaje: string, detalle: string[] = [], datos?: unknown) {
    super(mensaje);
    this.name = "ApiError";
    this.status = status;
    this.detalle = detalle;
    this.datos = datos;
  }
  /** Mensaje listo para mostrar: incluye el detalle de validación si lo hay. */
  get completo(): string {
    return this.detalle.length ? `${this.message}: ${this.detalle.join("; ")}` : this.message;
  }
}

export interface Opciones { metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; cuerpo?: unknown; query?: Record<string, string | undefined> }

function armarUrl(ruta: string, query?: Opciones["query"]): string {
  const q = Object.entries(query ?? {}).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`);
  return config.apiUrl + ruta + (q.length ? "?" + q.join("&") : "");
}

async function enviar(ruta: string, o: Opciones, token: string): Promise<Response> {
  try {
    return await fetch(armarUrl(ruta, o.query), {
      method: o.metodo ?? "GET",
      headers: { Authorization: `Bearer ${token}`, ...(o.cuerpo !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: o.cuerpo !== undefined ? JSON.stringify(o.cuerpo) : undefined,
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. Revisa tu conexión.");
  }
}

export async function api<T = unknown>(ruta: string, o: Opciones = {}): Promise<T> {
  let token = await obtenerToken();
  if (!token) throw new ApiError(401, "Tu sesión expiró. Vuelve a iniciar sesión.");
  let r = await enviar(ruta, o, token);
  if (r.status === 401) {                                  // el token pudo vencer justo ahora: se renueva una vez
    token = await obtenerToken(true);
    if (!token) throw new ApiError(401, "Tu sesión expiró. Vuelve a iniciar sesión.");
    r = await enviar(ruta, o, token);
    if (r.status === 401) { guardarSesion(null); throw new ApiError(401, "Tu sesión expiró. Vuelve a iniciar sesión."); }
  }
  let json: any = null;
  const texto = await r.text();
  if (texto) { try { json = JSON.parse(texto); } catch { /* no era JSON */ } }
  if (!r.ok) {
    const detalle = Array.isArray(json?.detalle) ? json.detalle.map(String) : [];
    throw new ApiError(r.status, json?.error ?? `Error ${r.status}`, detalle, Array.isArray(json?.detalle) ? undefined : json?.detalle);
  }
  return json as T;
}

export const mensajeDe = (e: unknown): string =>
  e instanceof ApiError ? e.completo : e instanceof Error ? e.message : "Ocurrió un error inesperado.";
